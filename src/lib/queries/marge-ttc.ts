import type { QueryConfig, QueryResponse } from './types'

export interface MargeTtcParams {
  date_debut: string
  date_fin: string
  pharmacie_id?: number | undefined
  fournisseur_id?: number | undefined
  famille_id?: number | undefined
  ean13?: string | undefined
}

export interface MargeTtcMensuel {
  mois: string
  annee: number
  marge: number
}

export interface MargeTtcResult {
  marge_ttc_total: number
  ca_ttc_total: number
  taux_marge_moyen: number
  periode: {
    debut: string
    fin: string
  }
  filtres_appliques: {
    pharmacie?: number | undefined
    fournisseur?: number | undefined
    famille?: number | undefined
    ean13?: string | undefined
  }
  nb_produits: number
  nb_ventes: number
  marge_par_mois: MargeTtcMensuel[]
}

export async function getMargeTtc(
  config: QueryConfig,
  params: MargeTtcParams
): Promise<QueryResponse<MargeTtcResult>> {
  const startTime = Date.now()
  
  // Extraction des années et mois de début/fin
  const dateDebut = new Date(params.date_debut)
  const dateFin = new Date(params.date_fin)
  
  const anneeDebut = dateDebut.getFullYear()
  const anneeFin = dateFin.getFullYear()
  const moisDebut = dateDebut.getMonth() + 1
  const moisFin = dateFin.getMonth() + 1

  try {
    // Étape 1: Récupérer les ventes avec produits
    let ventesQuery = config.client
      .from('ventes_mensuelles')
      .select(`
        quantite_vendue,
        annee,
        mois,
        produit_id,
        produits!inner(
          id,
          ean13_principal,
          famille_id,
          pharmacie_id,
          tva
        )
      `)

    // Filtres de période
    if (anneeDebut === anneeFin) {
      // Même année
      ventesQuery = ventesQuery
        .eq('annee', anneeDebut)
        .gte('mois', moisDebut)
        .lte('mois', moisFin)
    } else {
      // Années différentes
      ventesQuery = ventesQuery
        .gte('annee', anneeDebut)
        .lte('annee', anneeFin)
    }

    // Filtres optionnels sur produits
    if (params.pharmacie_id) {
      ventesQuery = ventesQuery.eq('produits.pharmacie_id', params.pharmacie_id)
    }
    
    if (params.famille_id) {
      ventesQuery = ventesQuery.eq('produits.famille_id', params.famille_id)
    }
    
    if (params.ean13) {
      ventesQuery = ventesQuery.eq('produits.ean13_principal', params.ean13)
    }

    const { data: ventesData, error: ventesError } = await ventesQuery

    if (ventesError) {
      throw new Error(ventesError.message)
    }

    let finalVentesData = ventesData || []

    // Étape 2: Si filtre fournisseur, filtrer par prix_achats
    if (params.fournisseur_id && finalVentesData.length > 0) {
      const produitIds = finalVentesData.map((v: any) => v.produit_id)
      
      const { data: prixAchatsData, error: prixError } = await config.client
        .from('prix_achats')
        .select('produit_id')
        .eq('fournisseur_id', params.fournisseur_id)
        .in('produit_id', produitIds)

      if (prixError) {
        throw new Error(prixError.message)
      }

      const produitIdsFournisseur = prixAchatsData?.map(pa => pa.produit_id) || []
      finalVentesData = finalVentesData.filter((v: any) => produitIdsFournisseur.includes(v.produit_id))
    }

    // Étape 3: Récupérer les prix de vente pour les produits restants
    if (finalVentesData.length === 0) {
      // Pas de données, retourner résultat vide
      const result: MargeTtcResult = {
        marge_ttc_total: 0,
        ca_ttc_total: 0,
        taux_marge_moyen: 0,
        periode: { debut: params.date_debut, fin: params.date_fin },
        filtres_appliques: {
          ...(params.pharmacie_id && { pharmacie: params.pharmacie_id }),
          ...(params.fournisseur_id && { fournisseur: params.fournisseur_id }),
          ...(params.famille_id && { famille: params.famille_id }),
          ...(params.ean13 && { ean13: params.ean13 })
        },
        nb_produits: 0,
        nb_ventes: 0,
        marge_par_mois: []
      }

      return {
        data: [result],
        metadata: {
          sql: generateSqlString(params),
          executionTime: Date.now() - startTime,
          count: 1
        }
      }
    }

    const produitIdsUniques = [...new Set(finalVentesData.map((v: any) => v.produit_id))]

    // Récupérer prix de vente
    const { data: prixVenteData, error: prixVenteError } = await config.client
      .from('prix_vente')
      .select(`
        produit_id,
        prix_vente_ttc,
        prix_promo_ttc,
        date_debut_promo,
        date_fin_promo
      `)
      .in('produit_id', produitIdsUniques)

    if (prixVenteError) {
      throw new Error(prixVenteError.message)
    }

    // Récupérer prix d'achat les plus récents
    const { data: prixAchatData, error: prixAchatError } = await config.client
      .from('prix_achats')
      .select(`
        produit_id,
        prix_net_ht,
        date_import
      `)
      .in('produit_id', produitIdsUniques)
      .order('date_import', { ascending: false })

    if (prixAchatError) {
      throw new Error(prixAchatError.message)
    }

    // Étape 4: Créer des maps par produit_id
    const prixVenteParProduit = new Map<number, any>()
    prixVenteData?.forEach(prix => {
      prixVenteParProduit.set(prix.produit_id, prix)
    })

    // Garder seulement le plus récent prix d'achat par produit
    const prixAchatParProduit = new Map<number, any>()
    prixAchatData?.forEach(prix => {
      if (!prixAchatParProduit.has(prix.produit_id)) {
        prixAchatParProduit.set(prix.produit_id, prix)
      }
    })

    // Étape 5: Calculs marge et CA
    let margeTotalTtc = 0
    let caTotalTtc = 0
    const margeMensuelle: { [key: string]: number } = {}
    const produitsUniques = new Set<number>()

    finalVentesData.forEach((vente: any) => {
      const quantite = vente.quantite_vendue || 0
      const produit = vente.produits
      const prixVente = prixVenteParProduit.get(vente.produit_id)
      const prixAchat = prixAchatParProduit.get(vente.produit_id)

      if (!prixVente || !prixAchat) {
        return // Pas de prix trouvé, skip cette vente
      }

      // Calculer prix de vente TTC (avec promo si active)
      let prixVenteTtc = prixVente.prix_vente_ttc
      
      if (prixVente.prix_promo_ttc && 
          prixVente.date_debut_promo && 
          prixVente.date_fin_promo) {
        const datePromoDebut = new Date(prixVente.date_debut_promo)
        const datePromoFin = new Date(prixVente.date_fin_promo)
        const maintenant = new Date()
        
        if (maintenant >= datePromoDebut && maintenant <= datePromoFin) {
          prixVenteTtc = prixVente.prix_promo_ttc
        }
      }

      // Calculer prix d'achat TTC
      const tva = produit.tva || 20 // Défaut 20% si pas de TVA
      const prixAchatTtc = prixAchat.prix_net_ht * (1 + tva / 100)

      // Calculs
      const ca = prixVenteTtc * quantite
      const marge = (prixVenteTtc - prixAchatTtc) * quantite

      caTotalTtc += ca
      margeTotalTtc += marge

      // Grouper par mois
      const cle = `${vente.annee}-${vente.mois.toString().padStart(2, '0')}`
      margeMensuelle[cle] = (margeMensuelle[cle] || 0) + marge

      // Compter produits uniques
      produitsUniques.add(vente.produit_id)
    })

    // Formater marge mensuelle
    const margeParMois: MargeTtcMensuel[] = Object.entries(margeMensuelle)
      .map(([cle, marge]) => {
        const [annee, mois] = cle.split('-')
        return {
          mois: cle,
          annee: parseInt(annee),
          marge: Number(marge.toFixed(2))
        }
      })
      .sort((a, b) => a.mois.localeCompare(b.mois))

    // Calculer taux de marge
    const tauxMargeMoyen = caTotalTtc > 0 ? (margeTotalTtc / caTotalTtc) * 100 : 0

    const result: MargeTtcResult = {
      marge_ttc_total: Number(margeTotalTtc.toFixed(2)),
      ca_ttc_total: Number(caTotalTtc.toFixed(2)),
      taux_marge_moyen: Number(tauxMargeMoyen.toFixed(2)),
      periode: {
        debut: params.date_debut,
        fin: params.date_fin
      },
      filtres_appliques: {
        ...(params.pharmacie_id && { pharmacie: params.pharmacie_id }),
        ...(params.fournisseur_id && { fournisseur: params.fournisseur_id }),
        ...(params.famille_id && { famille: params.famille_id }),
        ...(params.ean13 && { ean13: params.ean13 })
      },
      nb_produits: produitsUniques.size,
      nb_ventes: finalVentesData.length,
      marge_par_mois: margeParMois
    }

    const executionTime = Date.now() - startTime

    return {
      data: [result],
      metadata: {
        sql: generateSqlString(params),
        executionTime,
        count: 1
      }
    }

  } catch (error) {
    const executionTime = Date.now() - startTime
    
    return {
      data: [],
      metadata: {
        sql: generateSqlString(params),
        executionTime,
        count: 0
      },
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}

// Génération du SQL pour affichage (simplifié)
function generateSqlString(params: MargeTtcParams): string {
  const conditions: string[] = []
  
  if (params.pharmacie_id) conditions.push(`p.pharmacie_id = ${params.pharmacie_id}`)
  if (params.fournisseur_id) conditions.push(`pa.fournisseur_id = ${params.fournisseur_id}`)
  if (params.famille_id) conditions.push(`p.famille_id = ${params.famille_id}`)
  if (params.ean13) conditions.push(`p.ean13_principal = '${params.ean13}'`)

  const whereClause = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : ''

  return `
SELECT 
  SUM(
    (CASE 
      WHEN pv.prix_promo_ttc IS NOT NULL 
        AND CURRENT_DATE BETWEEN pv.date_debut_promo AND pv.date_fin_promo
      THEN pv.prix_promo_ttc
      ELSE pv.prix_vente_ttc
    END - pa.prix_net_ht * (1 + p.tva/100)) * vm.quantite_vendue
  ) as marge_ttc_total,
  SUM(
    CASE 
      WHEN pv.prix_promo_ttc IS NOT NULL 
        AND CURRENT_DATE BETWEEN pv.date_debut_promo AND pv.date_fin_promo
      THEN pv.prix_promo_ttc * vm.quantite_vendue
      ELSE pv.prix_vente_ttc * vm.quantite_vendue
    END
  ) as ca_ttc_total,
  COUNT(DISTINCT p.id) as nb_produits,
  COUNT(*) as nb_ventes,
  vm.annee,
  vm.mois
FROM ventes_mensuelles vm
  JOIN produits p ON vm.produit_id = p.id
  JOIN prix_vente pv ON p.id = pv.produit_id
  JOIN prix_achats pa ON p.id = pa.produit_id
WHERE vm.annee BETWEEN EXTRACT(YEAR FROM '${params.date_debut}'::date) 
  AND EXTRACT(YEAR FROM '${params.date_fin}'::date)
  ${whereClause}
GROUP BY vm.annee, vm.mois
ORDER BY vm.annee, vm.mois
  `.trim()
}