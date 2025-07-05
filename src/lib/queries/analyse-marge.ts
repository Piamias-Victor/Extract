import type { QueryConfig, QueryResponse } from './types'

export interface AnalyseMargeParams {
  seuil_marge: number
  mode: "dessous" | "dessus"
  pharmacie_id?: number | undefined
  fournisseur_id?: number | undefined
  famille_id?: number | undefined
  ean13?: string | undefined
}

export interface ProduitMarge {
  ean13: string
  nom: string
  prix_achat_ht: number
  prix_vente_ttc: number
  prix_promo_ttc?: number | undefined
  pourcentage_marge_calcule: number
  ecart_seuil: number
  ventes_periode: number
  ca_periode: number
}

export interface AnalyseMargeResult {
  criteres: {
    seuil_marge: number
    mode: "dessous" | "dessus"
    periode_analyse: {
      debut: string
      fin: string
    }
  }
  produits_trouves: ProduitMarge[]
  total_produits: number
  resume: {
    marge_moyenne: number
    ca_total: number
    ventes_totales: number
  }
}

export async function getAnalyseMarge(
  config: QueryConfig,
  params: AnalyseMargeParams
): Promise<QueryResponse<AnalyseMargeResult>> {
  const startTime = Date.now()

  // Période actuelle : 12 derniers mois pour avoir des données significatives
  const maintenant = new Date()
  const il_y_a_12_mois = new Date()
  il_y_a_12_mois.setMonth(maintenant.getMonth() - 12)
  
  const periodeDebut = il_y_a_12_mois.toISOString().split('T')[0]
  const periodeFin = maintenant.toISOString().split('T')[0]

  try {
    // Étape 1: Récupérer tous les produits avec filtres
    let produitsQuery = config.client
      .from('produits')
      .select(`
        id,
        ean13_principal,
        designation,
        tva,
        famille_id,
        pharmacie_id
      `)
      .eq('statut', 'ACTIF')

    // Filtres optionnels
    if (params.pharmacie_id) {
      produitsQuery = produitsQuery.eq('pharmacie_id', params.pharmacie_id)
    }
    
    if (params.famille_id) {
      produitsQuery = produitsQuery.eq('famille_id', params.famille_id)
    }
    
    if (params.ean13) {
      produitsQuery = produitsQuery.eq('ean13_principal', params.ean13)
    }

    const { data: produitsData, error: produitsError } = await produitsQuery

    if (produitsError) {
      throw new Error(produitsError.message)
    }

    let finalProduitsData = produitsData || []

    // Étape 2: Si filtre fournisseur, filtrer par prix_achats
    if (params.fournisseur_id && finalProduitsData.length > 0) {
      const produitIds = finalProduitsData.map(p => p.id)
      
      const { data: prixAchatsData, error: prixError } = await config.client
        .from('prix_achats')
        .select('produit_id')
        .eq('fournisseur_id', params.fournisseur_id)
        .in('produit_id', produitIds)

      if (prixError) {
        throw new Error(prixError.message)
      }

      const produitIdsFournisseur = prixAchatsData?.map(pa => pa.produit_id) || []
      finalProduitsData = finalProduitsData.filter(p => produitIdsFournisseur.includes(p.id))
    }

    if (finalProduitsData.length === 0) {
      return {
        data: [{
          criteres: {
            seuil_marge: params.seuil_marge,
            mode: params.mode,
            periode_analyse: { debut: periodeDebut, fin: periodeFin }
          },
          produits_trouves: [],
          total_produits: 0,
          resume: { marge_moyenne: 0, ca_total: 0, ventes_totales: 0 }
        }],
        metadata: {
          sql: generateSqlString(params),
          executionTime: Date.now() - startTime,
          count: 1
        }
      }
    }

    const produitIds = finalProduitsData.map(p => p.id)

    // Étape 3: Récupérer ventes des 12 derniers mois
    const anneeDebut = il_y_a_12_mois.getFullYear()
    const anneeFin = maintenant.getFullYear()
    const moisDebut = il_y_a_12_mois.getMonth() + 1
    const moisFin = maintenant.getMonth() + 1

    let ventesQuery = config.client
      .from('ventes_mensuelles')
      .select(`
        produit_id,
        quantite_vendue,
        annee,
        mois
      `)
      .in('produit_id', produitIds)

    if (anneeDebut === anneeFin) {
      ventesQuery = ventesQuery
        .eq('annee', anneeDebut)
        .gte('mois', moisDebut)
        .lte('mois', moisFin)
    } else {
      ventesQuery = ventesQuery
        .gte('annee', anneeDebut)
        .lte('annee', anneeFin)
    }

    const { data: ventesData, error: ventesError } = await ventesQuery

    if (ventesError) {
      throw new Error(ventesError.message)
    }

    // Étape 4: Récupérer prix de vente actuels
    const { data: prixVenteData, error: prixVenteError } = await config.client
      .from('prix_vente')
      .select(`
        produit_id,
        prix_vente_ttc,
        prix_promo_ttc,
        date_debut_promo,
        date_fin_promo
      `)
      .in('produit_id', produitIds)
      .order('date_extraction', { ascending: false })

    if (prixVenteError) {
      throw new Error(prixVenteError.message)
    }

    // Étape 5: Récupérer prix d'achat actuels
    const { data: prixAchatData, error: prixAchatError } = await config.client
      .from('prix_achats')
      .select(`
        produit_id,
        prix_net_ht
      `)
      .in('produit_id', produitIds)
      .order('date_import', { ascending: false })

    if (prixAchatError) {
      throw new Error(prixAchatError.message)
    }

    // Créer des maps pour performance
    const ventesParProduit = new Map<number, number>()
    ventesData?.forEach(vente => {
      const quantite = vente.quantite_vendue || 0
      ventesParProduit.set(vente.produit_id, (ventesParProduit.get(vente.produit_id) || 0) + quantite)
    })

    const prixVenteParProduit = new Map<number, any>()
    prixVenteData?.forEach(prix => {
      if (!prixVenteParProduit.has(prix.produit_id)) {
        prixVenteParProduit.set(prix.produit_id, prix)
      }
    })

    const prixAchatParProduit = new Map<number, any>()
    prixAchatData?.forEach(prix => {
      if (!prixAchatParProduit.has(prix.produit_id)) {
        prixAchatParProduit.set(prix.produit_id, prix)
      }
    })

    // Étape 6: Analyser chaque produit et calculer les marges
    const produitsAvecMarge: ProduitMarge[] = []

    finalProduitsData.forEach(produit => {
      const prixVente = prixVenteParProduit.get(produit.id)
      const prixAchat = prixAchatParProduit.get(produit.id)
      const ventes = ventesParProduit.get(produit.id) || 0

      if (!prixVente || !prixAchat) return

      // Calculer prix de vente effectif (avec promo si active)
      let prixVenteTtc = prixVente.prix_vente_ttc
      let promoActive = undefined

      if (prixVente.prix_promo_ttc && 
          prixVente.date_debut_promo && 
          prixVente.date_fin_promo) {
        const datePromoDebut = new Date(prixVente.date_debut_promo)
        const datePromoFin = new Date(prixVente.date_fin_promo)
        
        if (maintenant >= datePromoDebut && maintenant <= datePromoFin) {
          prixVenteTtc = prixVente.prix_promo_ttc
          promoActive = prixVente.prix_promo_ttc
        }
      }

      // Calculer prix d'achat TTC
      const tva = produit.tva || 20
      const prixAchatTtc = prixAchat.prix_net_ht * (1 + tva / 100)

      // Calculer % de marge
      const pourcentageMarge = prixVenteTtc > 0 ? 
        ((prixVenteTtc - prixAchatTtc) / prixVenteTtc) * 100 : 0

      // Vérifier si le produit correspond au critère de seuil
      const respecteCritere = params.mode === "dessous" ? 
        pourcentageMarge < params.seuil_marge :
        pourcentageMarge > params.seuil_marge

      if (respecteCritere) {
        const ecartSeuil = pourcentageMarge - params.seuil_marge
        const caPeriode = prixVenteTtc * ventes

        produitsAvecMarge.push({
          ean13: produit.ean13_principal,
          nom: produit.designation,
          prix_achat_ht: Number(prixAchat.prix_net_ht.toFixed(3)),
          prix_vente_ttc: Number(prixVente.prix_vente_ttc.toFixed(2)),
          prix_promo_ttc: promoActive ? Number(promoActive.toFixed(2)) : undefined,
          pourcentage_marge_calcule: Number(pourcentageMarge.toFixed(2)),
          ecart_seuil: Number(ecartSeuil.toFixed(2)),
          ventes_periode: ventes,
          ca_periode: Number(caPeriode.toFixed(2))
        })
      }
    })

    // Trier par écart au seuil (les plus éloignés en premier)
    produitsAvecMarge.sort((a, b) => {
      if (params.mode === "dessous") {
        return a.ecart_seuil - b.ecart_seuil // Les plus négatifs en premier
      } else {
        return b.ecart_seuil - a.ecart_seuil // Les plus positifs en premier
      }
    })

    // Calculer le résumé
    const margeTotal = produitsAvecMarge.reduce((sum, p) => sum + (p.pourcentage_marge_calcule * p.ca_periode / 100), 0)
    const caTotal = produitsAvecMarge.reduce((sum, p) => sum + p.ca_periode, 0)
    const ventesTotal = produitsAvecMarge.reduce((sum, p) => sum + p.ventes_periode, 0)
    const margeMoyenne = caTotal > 0 ? (margeTotal / caTotal) * 100 : 0

    const result: AnalyseMargeResult = {
      criteres: {
        seuil_marge: params.seuil_marge,
        mode: params.mode,
        periode_analyse: {
          debut: periodeDebut,
          fin: periodeFin
        }
      },
      produits_trouves: produitsAvecMarge,
      total_produits: produitsAvecMarge.length,
      resume: {
        marge_moyenne: Number(margeMoyenne.toFixed(2)),
        ca_total: Number(caTotal.toFixed(2)),
        ventes_totales: ventesTotal
      }
    }

    return {
      data: [result],
      metadata: {
        sql: generateSqlString(params),
        executionTime: Date.now() - startTime,
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
function generateSqlString(params: AnalyseMargeParams): string {
  const conditions: string[] = ["p.statut = 'ACTIF'"]
  
  if (params.pharmacie_id) conditions.push(`p.pharmacie_id = ${params.pharmacie_id}`)
  if (params.fournisseur_id) conditions.push(`pa.fournisseur_id = ${params.fournisseur_id}`)
  if (params.famille_id) conditions.push(`p.famille_id = ${params.famille_id}`)
  if (params.ean13) conditions.push(`p.ean13_principal = '${params.ean13}'`)

  const whereClause = conditions.join(' AND ')
  const operateur = params.mode === "dessous" ? "<" : ">"

  return `
SELECT 
  p.ean13_principal,
  p.designation,
  pa.prix_net_ht,
  pv.prix_vente_ttc,
  pv.prix_promo_ttc,
  SUM(vm.quantite_vendue) as ventes_12_mois,
  ROUND(
    ((pv.prix_vente_ttc - pa.prix_net_ht * (1 + p.tva/100)) / pv.prix_vente_ttc) * 100, 2
  ) as pourcentage_marge
FROM produits p
  LEFT JOIN prix_achats pa ON p.id = pa.produit_id
  LEFT JOIN prix_vente pv ON p.id = pv.produit_id
  LEFT JOIN ventes_mensuelles vm ON p.id = vm.produit_id
WHERE ${whereClause}
  AND vm.annee >= EXTRACT(YEAR FROM CURRENT_DATE - INTERVAL '12 months')
  AND ROUND(
    ((pv.prix_vente_ttc - pa.prix_net_ht * (1 + p.tva/100)) / pv.prix_vente_ttc) * 100, 2
  ) ${operateur} ${params.seuil_marge}
GROUP BY p.id, pa.prix_net_ht, pv.prix_vente_ttc, pv.prix_promo_ttc
ORDER BY ABS(pourcentage_marge - ${params.seuil_marge}) DESC
  `.trim()
}