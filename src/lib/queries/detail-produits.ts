import type { QueryConfig, QueryResponse } from './types'

export interface DetailProduitsParams {
  pharmacie_id?: number | undefined
  fournisseur_id?: number | undefined
  famille_id?: number | undefined
  ean13?: string | undefined
  date_debut?: string | undefined
  date_fin?: string | undefined
}

export interface VenteMensuelle {
  mois: string
  quantite: number
}

export interface ProduitDetail {
  ean13: string
  nom: string
  prix_achat_ht: number
  prix_vente_ttc: number
  prix_promo_ttc?: number | undefined
  date_fin_promo?: string | undefined
  stock_rayon: number
  stock_reserve: number
  stock_total: number
  pourcentage_marge: number
  ventes_12_mois: number
  ca_12_mois: number
  ventes_par_mois: VenteMensuelle[]
}

export interface DetailProduitsResult {
  produits: ProduitDetail[]
  total_produits: number
  periode_analyse: {
    debut: string
    fin: string
  }
}

export async function getDetailProduits(
  config: QueryConfig,
  params: DetailProduitsParams
): Promise<QueryResponse<DetailProduitsResult>> {
  const startTime = Date.now()
  
  // Calculer la période des 12 derniers mois ou utiliser les dates fournies
  const maintenant = new Date()
  let dateDebut: Date
  let dateFin: Date
  
  if (params.date_debut && params.date_fin) {
    // Utiliser les dates fournies
    dateDebut = new Date(params.date_debut)
    dateFin = new Date(params.date_fin)
  } else {
    // Par défaut : 12 derniers mois
    const il_y_a_12_mois = new Date()
    il_y_a_12_mois.setMonth(maintenant.getMonth() - 12)
    dateDebut = il_y_a_12_mois
    dateFin = maintenant
  }
  
  const periodeDebut = dateDebut.toISOString().split('T')[0]
  const periodeFin = dateFin.toISOString().split('T')[0]

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
          produits: [],
          total_produits: 0,
          periode_analyse: { debut: periodeDebut, fin: periodeFin }
        }],
        metadata: {
          sql: generateSqlString(params),
          executionTime: Date.now() - startTime,
          count: 1
        }
      }
    }

    const produitIds = finalProduitsData.map(p => p.id)

    // Étape 3: Récupérer les ventes de la période définie
    const anneeDebut = dateDebut.getFullYear()
    const moisDebut = dateDebut.getMonth() + 1
    const anneeFin = dateFin.getFullYear()
    const moisFin = dateFin.getMonth() + 1

    let ventesQuery = config.client
      .from('ventes_mensuelles')
      .select(`
        produit_id,
        quantite_vendue,
        annee,
        mois
      `)
      .in('produit_id', produitIds)

    // Filtrer sur la période définie
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

    // Étape 4: Récupérer prix de vente les plus récents
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

    // Étape 5: Récupérer prix d'achat les plus récents
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

    // Étape 6: Récupérer stocks les plus récents
    const { data: stocksData, error: stocksError } = await config.client
      .from('stocks')
      .select(`
        produit_id,
        quantite_rayon,
        quantite_reserve
      `)
      .in('produit_id', produitIds)
      .order('date_extraction', { ascending: false })

    if (stocksError) {
      throw new Error(stocksError.message)
    }

    // Étape 7: Créer des maps pour performance
    const ventesParProduit = new Map<number, any[]>()
    ventesData?.forEach(vente => {
      if (!ventesParProduit.has(vente.produit_id)) {
        ventesParProduit.set(vente.produit_id, [])
      }
      ventesParProduit.get(vente.produit_id)?.push(vente)
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

    const stocksParProduit = new Map<number, any>()
    stocksData?.forEach(stock => {
      if (!stocksParProduit.has(stock.produit_id)) {
        stocksParProduit.set(stock.produit_id, stock)
      }
    })

    // Étape 8: Construire les détails produits
    const produitsDetails: ProduitDetail[] = []

    finalProduitsData.forEach(produit => {
      const ventes = ventesParProduit.get(produit.id) || []
      const prixVente = prixVenteParProduit.get(produit.id)
      const prixAchat = prixAchatParProduit.get(produit.id)
      const stock = stocksParProduit.get(produit.id)

      // Calculer ventes totales et par mois
      let ventesTotales = 0
      const ventesParMois: VenteMensuelle[] = []
      
      // Créer tous les mois de la période
      const nombreMois = (dateFin.getFullYear() - dateDebut.getFullYear()) * 12 + 
                        (dateFin.getMonth() - dateDebut.getMonth()) + 1
      
      for (let i = 0; i < nombreMois; i++) {
        const date = new Date(dateDebut)
        date.setMonth(date.getMonth() + i)
        const moisKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
        
        const ventesCeMois = ventes.filter(v => 
          `${v.annee}-${v.mois.toString().padStart(2, '0')}` === moisKey
        )
        
        const quantiteMois = ventesCeMois.reduce((sum, v) => sum + (v.quantite_vendue || 0), 0)
        ventesTotales += quantiteMois
        
        ventesParMois.push({ mois: moisKey, quantite: quantiteMois })
      }

      // Vérifier si promotion active
      let prixVenteFinal = prixVente?.prix_vente_ttc || 0
      let promoActive = undefined
      let dateFinPromo = undefined

      if (prixVente?.prix_promo_ttc && 
          prixVente?.date_debut_promo && 
          prixVente?.date_fin_promo) {
        const datePromoDebut = new Date(prixVente.date_debut_promo)
        const datePromoFin = new Date(prixVente.date_fin_promo)
        
        if (maintenant >= datePromoDebut && maintenant <= datePromoFin) {
          promoActive = prixVente.prix_promo_ttc
          dateFinPromo = prixVente.date_fin_promo
          prixVenteFinal = prixVente.prix_promo_ttc
        }
      }

      // Calculer marge
      const prixAchatHt = prixAchat?.prix_net_ht || 0
      const tva = produit.tva || 20
      const prixAchatTtc = prixAchatHt * (1 + tva / 100)
      const pourcentageMarge = prixVenteFinal > 0 ? 
        ((prixVenteFinal - prixAchatTtc) / prixVenteFinal) * 100 : 0

      // CA sur la période
      const caPeriode = ventesTotales * prixVenteFinal

      const produitDetail: ProduitDetail = {
        ean13: produit.ean13_principal,
        nom: produit.designation,
        prix_achat_ht: Number(prixAchatHt.toFixed(3)),
        prix_vente_ttc: Number((prixVente?.prix_vente_ttc || 0).toFixed(2)),
        prix_promo_ttc: promoActive ? Number(promoActive.toFixed(2)) : undefined,
        date_fin_promo: dateFinPromo,
        stock_rayon: stock?.quantite_rayon || 0,
        stock_reserve: stock?.quantite_reserve || 0,
        stock_total: (stock?.quantite_rayon || 0) + (stock?.quantite_reserve || 0),
        pourcentage_marge: Number(pourcentageMarge.toFixed(2)),
        ventes_12_mois: ventesTotales,
        ca_12_mois: Number(caPeriode.toFixed(2)),
        ventes_par_mois: ventesParMois
      }

      produitsDetails.push(produitDetail)
    })

    // Trier par ventes descendantes
    produitsDetails.sort((a, b) => b.ventes_12_mois - a.ventes_12_mois)

    const result: DetailProduitsResult = {
      produits: produitsDetails,
      total_produits: produitsDetails.length,
      periode_analyse: {
        debut: periodeDebut,
        fin: periodeFin
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
function generateSqlString(params: DetailProduitsParams): string {
  const conditions: string[] = ["p.statut = 'ACTIF'"]
  
  if (params.pharmacie_id) conditions.push(`p.pharmacie_id = ${params.pharmacie_id}`)
  if (params.fournisseur_id) conditions.push(`pa.fournisseur_id = ${params.fournisseur_id}`)
  if (params.famille_id) conditions.push(`p.famille_id = ${params.famille_id}`)
  if (params.ean13) conditions.push(`p.ean13_principal = '${params.ean13}'`)

  const whereClause = conditions.join(' AND ')

  return `
SELECT 
  p.ean13_principal,
  p.designation,
  pa.prix_net_ht,
  pv.prix_vente_ttc,
  pv.prix_promo_ttc,
  pv.date_fin_promo,
  s.quantite_rayon,
  s.quantite_reserve,
  SUM(vm.quantite_vendue) as ventes_12_mois,
  ROUND(
    ((pv.prix_vente_ttc - pa.prix_net_ht * (1 + p.tva/100)) / pv.prix_vente_ttc) * 100, 2
  ) as pourcentage_marge
FROM produits p
  LEFT JOIN prix_achats pa ON p.id = pa.produit_id
  LEFT JOIN prix_vente pv ON p.id = pv.produit_id
  LEFT JOIN stocks s ON p.id = s.produit_id
  LEFT JOIN ventes_mensuelles vm ON p.id = vm.produit_id
WHERE ${whereClause}
  AND vm.annee >= EXTRACT(YEAR FROM CURRENT_DATE - INTERVAL '12 months')
GROUP BY p.id, pa.prix_net_ht, pv.prix_vente_ttc, pv.prix_promo_ttc, pv.date_fin_promo, s.quantite_rayon, s.quantite_reserve
ORDER BY ventes_12_mois DESC
  `.trim()
}