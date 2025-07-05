import type { QueryConfig, QueryResponse } from './types'

export interface AnalyseParetoParams {
  seuil_pareto: number
  date_debut: string
  date_fin: string
  pharmacie_id?: number | undefined
  fournisseur_id?: number | undefined
  famille_id?: number | undefined
  ean13?: string | undefined
}

export interface ProduitPareto {
  rang: number
  ean13: string
  nom: string
  ca_periode: number
  ca_cumule: number
  pourcentage_ca: number
  pourcentage_cumule: number
  ventes_periode: number
  stock_actuel: number
}

export interface AnalyseParetoResult {
  criteres: {
    seuil_pareto: number
    periode: {
      debut: string
      fin: string
    }
  }
  analyse: {
    ca_total: number
    ca_seuil: number
    nb_produits_total: number
    nb_produits_seuil: number
    pourcentage_refs: number
  }
  produits_pareto: ProduitPareto[]
}

export async function getAnalysePareto(
  config: QueryConfig,
  params: AnalyseParetoParams
): Promise<QueryResponse<AnalyseParetoResult>> {
  const startTime = Date.now()

  const dateDebut = new Date(params.date_debut)
  const dateFin = new Date(params.date_fin)

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
            seuil_pareto: params.seuil_pareto,
            periode: { debut: params.date_debut, fin: params.date_fin }
          },
          analyse: {
            ca_total: 0,
            ca_seuil: 0,
            nb_produits_total: 0,
            nb_produits_seuil: 0,
            pourcentage_refs: 0
          },
          produits_pareto: []
        }],
        metadata: {
          sql: generateSqlString(params),
          executionTime: Date.now() - startTime,
          count: 1
        }
      }
    }

    const produitIds = finalProduitsData.map(p => p.id)

    // Étape 3: Récupérer ventes de la période
    const anneeDebut = dateDebut.getFullYear()
    const anneeFin = dateFin.getFullYear()
    const moisDebut = dateDebut.getMonth() + 1
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

    // Filtrer sur la période
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

    // Étape 5: Récupérer stocks actuels
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

    const stocksParProduit = new Map<number, any>()
    stocksData?.forEach(stock => {
      if (!stocksParProduit.has(stock.produit_id)) {
        stocksParProduit.set(stock.produit_id, stock)
      }
    })

    // Étape 6: Calculer le CA par produit
    const produitsAvecCA: Array<{
      produit: any,
      ca: number,
      ventes: number,
      stock: number
    }> = []

    const maintenant = new Date()

    finalProduitsData.forEach(produit => {
      const prixVente = prixVenteParProduit.get(produit.id)
      const ventes = ventesParProduit.get(produit.id) || 0
      const stock = stocksParProduit.get(produit.id)

      if (!prixVente || ventes === 0) return // Exclure les produits sans prix ou sans ventes

      // Calculer prix de vente effectif (avec promo si active)
      let prixVenteTtc = prixVente.prix_vente_ttc

      if (prixVente.prix_promo_ttc && 
          prixVente.date_debut_promo && 
          prixVente.date_fin_promo) {
        const datePromoDebut = new Date(prixVente.date_debut_promo)
        const datePromoFin = new Date(prixVente.date_fin_promo)
        
        if (maintenant >= datePromoDebut && maintenant <= datePromoFin) {
          prixVenteTtc = prixVente.prix_promo_ttc
        }
      }

      const ca = prixVenteTtc * ventes
      const stockTotal = (stock?.quantite_rayon || 0) + (stock?.quantite_reserve || 0)

      produitsAvecCA.push({
        produit,
        ca,
        ventes,
        stock: stockTotal
      })
    })

    // Étape 7: Trier par CA décroissant
    produitsAvecCA.sort((a, b) => b.ca - a.ca)

    // Étape 8: Calculer les métriques Pareto
    const caTotal = produitsAvecCA.reduce((sum, p) => sum + p.ca, 0)
    const nbProduitsTotal = produitsAvecCA.length
    const caSeuilCible = (caTotal * params.seuil_pareto) / 100

    let caCumule = 0
    let nbProduitsSeuil = 0
    const produitsPareto: ProduitPareto[] = []

    for (let i = 0; i < produitsAvecCA.length; i++) {
      const item = produitsAvecCA[i]
      caCumule += item.ca

      const pourcentageCA = caTotal > 0 ? (item.ca / caTotal) * 100 : 0
      const pourcentageCumule = caTotal > 0 ? (caCumule / caTotal) * 100 : 0

      produitsPareto.push({
        rang: i + 1,
        ean13: item.produit.ean13_principal,
        nom: item.produit.designation,
        ca_periode: Number(item.ca.toFixed(2)),
        ca_cumule: Number(caCumule.toFixed(2)),
        pourcentage_ca: Number(pourcentageCA.toFixed(2)),
        pourcentage_cumule: Number(pourcentageCumule.toFixed(2)),
        ventes_periode: item.ventes,
        stock_actuel: item.stock
      })

      // Déterminer combien de produits pour atteindre le seuil
      if (caCumule <= caSeuilCible) {
        nbProduitsSeuil = i + 1
      }
    }

    const pourcentageRefs = nbProduitsTotal > 0 ? (nbProduitsSeuil / nbProduitsTotal) * 100 : 0

    const result: AnalyseParetoResult = {
      criteres: {
        seuil_pareto: params.seuil_pareto,
        periode: {
          debut: params.date_debut,
          fin: params.date_fin
        }
      },
      analyse: {
        ca_total: Number(caTotal.toFixed(2)),
        ca_seuil: Number(caSeuilCible.toFixed(2)),
        nb_produits_total: nbProduitsTotal,
        nb_produits_seuil: nbProduitsSeuil,
        pourcentage_refs: Number(pourcentageRefs.toFixed(2))
      },
      produits_pareto: produitsPareto
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
function generateSqlString(params: AnalyseParetoParams): string {
  const conditions: string[] = ["p.statut = 'ACTIF'"]
  
  if (params.pharmacie_id) conditions.push(`p.pharmacie_id = ${params.pharmacie_id}`)
  if (params.fournisseur_id) conditions.push(`pa.fournisseur_id = ${params.fournisseur_id}`)
  if (params.famille_id) conditions.push(`p.famille_id = ${params.famille_id}`)
  if (params.ean13) conditions.push(`p.ean13_principal = '${params.ean13}'`)

  const whereClause = conditions.join(' AND ')

  return `
WITH ca_par_produit AS (
  SELECT 
    p.ean13_principal,
    p.designation,
    SUM(
      CASE 
        WHEN pv.prix_promo_ttc IS NOT NULL 
          AND CURRENT_DATE BETWEEN pv.date_debut_promo AND pv.date_fin_promo
        THEN pv.prix_promo_ttc * vm.quantite_vendue
        ELSE pv.prix_vente_ttc * vm.quantite_vendue
      END
    ) as ca_periode,
    SUM(vm.quantite_vendue) as ventes_periode,
    (s.quantite_rayon + s.quantite_reserve) as stock_actuel
  FROM produits p
    LEFT JOIN prix_achats pa ON p.id = pa.produit_id
    LEFT JOIN prix_vente pv ON p.id = pv.produit_id
    LEFT JOIN stocks s ON p.id = s.produit_id
    LEFT JOIN ventes_mensuelles vm ON p.id = vm.produit_id
  WHERE ${whereClause}
    AND vm.annee BETWEEN EXTRACT(YEAR FROM '${params.date_debut}'::date) 
    AND EXTRACT(YEAR FROM '${params.date_fin}'::date)
  GROUP BY p.id, p.ean13_principal, p.designation, s.quantite_rayon, s.quantite_reserve
  HAVING SUM(vm.quantite_vendue) > 0
),
ca_cumule AS (
  SELECT *,
    SUM(ca_periode) OVER (ORDER BY ca_periode DESC ROWS UNBOUNDED PRECEDING) as ca_cumule,
    ROW_NUMBER() OVER (ORDER BY ca_periode DESC) as rang
  FROM ca_par_produit
)
SELECT *,
  ROUND((ca_periode / (SELECT SUM(ca_periode) FROM ca_par_produit)) * 100, 2) as pourcentage_ca,
  ROUND((ca_cumule / (SELECT SUM(ca_periode) FROM ca_par_produit)) * 100, 2) as pourcentage_cumule
FROM ca_cumule
WHERE pourcentage_cumule <= ${params.seuil_pareto}
ORDER BY rang
  `.trim()
}