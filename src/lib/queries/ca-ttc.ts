import type { QueryConfig, QueryResponse } from './types'

export interface CaTtcParams {
  date_debut: string
  date_fin: string
  pharmacie_id?: number | undefined
  fournisseur_id?: number | undefined
  famille_id?: number | undefined
  ean13?: string | undefined
}

export interface CaTtcMensuel {
  mois: string
  annee: number
  ca: number
}

export interface CaTtcResult {
  ca_ttc_total: number
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
  ca_par_mois: CaTtcMensuel[]
}

export async function getCaTtc(
  config: QueryConfig,
  params: CaTtcParams
): Promise<QueryResponse<CaTtcResult>> {
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
          pharmacie_id
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
      const result: CaTtcResult = {
        ca_ttc_total: 0,
        periode: { debut: params.date_debut, fin: params.date_fin },
        filtres_appliques: {
          ...(params.pharmacie_id && { pharmacie: params.pharmacie_id }),
          ...(params.fournisseur_id && { fournisseur: params.fournisseur_id }),
          ...(params.famille_id && { famille: params.famille_id }),
          ...(params.ean13 && { ean13: params.ean13 })
        },
        nb_produits: 0,
        nb_ventes: 0,
        ca_par_mois: []
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

    // Étape 4: Créer un map des prix par produit_id
    const prixParProduit = new Map<number, any>()
    prixVenteData?.forEach(prix => {
      prixParProduit.set(prix.produit_id, prix)
    })

    // Étape 5: Calculs
    let caTotalTtc = 0
    const caMensuel: { [key: string]: number } = {}
    const produitsUniques = new Set<number>()

    finalVentesData.forEach((vente: any) => {
      const quantite = vente.quantite_vendue || 0
      const prixVente = prixParProduit.get(vente.produit_id)

      if (!prixVente) {
        return // Pas de prix trouvé, skip cette vente
      }

      // Vérifier si promotion active
      let prix = prixVente.prix_vente_ttc
      
      if (prixVente.prix_promo_ttc && 
          prixVente.date_debut_promo && 
          prixVente.date_fin_promo) {
        const datePromoDebut = new Date(prixVente.date_debut_promo)
        const datePromoFin = new Date(prixVente.date_fin_promo)
        const maintenant = new Date()
        
        if (maintenant >= datePromoDebut && maintenant <= datePromoFin) {
          prix = prixVente.prix_promo_ttc
        }
      }

      const ca = prix * quantite
      caTotalTtc += ca

      // Grouper par mois
      const cle = `${vente.annee}-${vente.mois.toString().padStart(2, '0')}`
      caMensuel[cle] = (caMensuel[cle] || 0) + ca

      // Compter produits uniques
      produitsUniques.add(vente.produit_id)
    })

    // Formater CA mensuel
    const caParMois: CaTtcMensuel[] = Object.entries(caMensuel)
      .map(([cle, ca]) => {
        const [annee, mois] = cle.split('-')
        return {
          mois: cle,
          annee: parseInt(annee),
          ca: Number(ca.toFixed(2))
        }
      })
      .sort((a, b) => a.mois.localeCompare(b.mois))

    const result: CaTtcResult = {
      ca_ttc_total: Number(caTotalTtc.toFixed(2)),
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
      ca_par_mois: caParMois
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
function generateSqlString(params: CaTtcParams): string {
  const conditions: string[] = []
  
  if (params.pharmacie_id) conditions.push(`p.pharmacie_id = ${params.pharmacie_id}`)
  if (params.fournisseur_id) conditions.push(`pa.fournisseur_id = ${params.fournisseur_id}`)
  if (params.famille_id) conditions.push(`p.famille_id = ${params.famille_id}`)
  if (params.ean13) conditions.push(`p.ean13_principal = '${params.ean13}'`)

  const whereClause = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : ''

  return `
SELECT 
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
  ${params.fournisseur_id ? 'JOIN prix_achats pa ON p.id = pa.produit_id' : ''}
WHERE vm.annee BETWEEN EXTRACT(YEAR FROM '${params.date_debut}'::date) 
  AND EXTRACT(YEAR FROM '${params.date_fin}'::date)
  ${whereClause}
GROUP BY vm.annee, vm.mois
ORDER BY vm.annee, vm.mois
  `.trim()
}