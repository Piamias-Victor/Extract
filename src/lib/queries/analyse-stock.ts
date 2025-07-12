import type { QueryConfig, QueryResponse } from './types'

export interface AnalyseStockParams {
  seuil_mois_stock: number
  mode: "dessous" | "dessus"
  pharmacie_id?: number | undefined
  fournisseur_id?: number | undefined
  famille_id?: number | undefined
  ean13?: string | undefined
}

export interface ProduitStock {
  ean13: string
  nom: string
  stock_rayon: number
  stock_reserve: number
  stock_total: number
  ventes_mensuelles_moyennes: number
  mois_stock_calcule: number | "Stock infini" | "Rupture"
  ecart_seuil: number | "N/A"
  ventes_12_mois: number
  derniere_vente?: string | undefined
}

export interface AnalyseStockResult {
  criteres: {
    seuil_mois_stock: number
    mode: "dessous" | "dessus"
    periode_analyse: {
      debut: string
      fin: string
    }
  }
  produits_trouves: ProduitStock[]
  total_produits: number
  resume: {
    stock_moyen: number
    produits_rupture: number
    produits_surstock: number
  }
}

export async function getAnalyseStock(
  config: QueryConfig,
  params: AnalyseStockParams
): Promise<QueryResponse<AnalyseStockResult>> {
  const startTime = Date.now()

  // Période : 12 derniers mois pour calculer les moyennes
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
            seuil_mois_stock: params.seuil_mois_stock,
            mode: params.mode,
            periode_analyse: { debut: periodeDebut, fin: periodeFin }
          },
          produits_trouves: [],
          total_produits: 0,
          resume: { stock_moyen: 0, produits_rupture: 0, produits_surstock: 0 }
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
      .select('produit_id, annee, mois, quantite_vendue')
      .in('produit_id', produitIds)

    if (anneeDebut === anneeFin) {
      ventesQuery = ventesQuery
        .eq('annee', anneeDebut)
        .gte('mois', moisDebut)
        .lte('mois', moisFin)
    } else {
      ventesQuery = ventesQuery.or(
        `and(annee.eq.${anneeDebut},mois.gte.${moisDebut}),and(annee.eq.${anneeFin},mois.lte.${moisFin})`
      )
    }

    const { data: ventesData, error: ventesError } = await ventesQuery

    if (ventesError) {
      throw new Error(ventesError.message)
    }

    // Étape 4: Récupérer les stocks actuels
    const { data: stocksData, error: stocksError } = await config.client
      .from('stocks')
      .select('produit_id, quantite_rayon, quantite_reserve')
      .in('produit_id', produitIds)

    if (stocksError) {
      throw new Error(stocksError.message)
    }

    // Agrégation des ventes par produit
    const ventesParProduit = new Map<number, { total: number, dernierMois: string }>()
    
    ventesData?.forEach(vente => {
      const moisKey = `${vente.annee}-${vente.mois.toString().padStart(2, '0')}`
      const quantite = vente.quantite_vendue || 0
      
      if (!ventesParProduit.has(vente.produit_id)) {
        ventesParProduit.set(vente.produit_id, { total: 0, dernierMois: '' })
      }
      
      const data = ventesParProduit.get(vente.produit_id)!
      data.total += quantite
      
      // Garder le mois le plus récent avec des ventes
      if (quantite > 0 && moisKey > data.dernierMois) {
        data.dernierMois = moisKey
      }
    })

    const stocksParProduit = new Map<number, any>()
    stocksData?.forEach(stock => {
      if (!stocksParProduit.has(stock.produit_id)) {
        stocksParProduit.set(stock.produit_id, stock)
      }
    })

    // Étape 5: Analyser TOUS les produits et calculer les mois de stock
    const tousLesProduitsAvecStock: ProduitStock[] = []
    let produitsRupture = 0
    let produitsSurstock = 0
    const stocksValides: number[] = []

    finalProduitsData.forEach(produit => {
      const stock = stocksParProduit.get(produit.id)
      const ventesInfo = ventesParProduit.get(produit.id)

      // Même sans stock, on inclut le produit
      const stockRayon = stock?.quantite_rayon || 0
      const stockReserve = stock?.quantite_reserve || 0
      const stockTotal = stockRayon + stockReserve
      const ventes12Mois = ventesInfo?.total || 0
      const ventesMoyenneMensuelle = ventes12Mois / 12

      // Calculer mois de stock
      let moisStock: number | "Stock infini" | "Rupture"
      let ecartSeuil: number | "N/A" = "N/A"

      if (stockTotal === 0) {
        moisStock = "Rupture"
        produitsRupture++
      } else if (ventesMoyenneMensuelle === 0) {
        moisStock = "Stock infini"
        produitsSurstock++
      } else {
        moisStock = stockTotal / ventesMoyenneMensuelle
        stocksValides.push(moisStock)
        
        // Calculer écart au seuil
        ecartSeuil = moisStock - params.seuil_mois_stock
        
        if (moisStock > params.seuil_mois_stock * 2) {
          produitsSurstock++
        }
      }

      // IMPORTANT: On ajoute TOUS les produits, pas seulement ceux qui respectent le critère
      tousLesProduitsAvecStock.push({
        ean13: produit.ean13_principal,
        nom: produit.designation,
        stock_rayon: stockRayon,
        stock_reserve: stockReserve,
        stock_total: stockTotal,
        ventes_mensuelles_moyennes: Number(ventesMoyenneMensuelle.toFixed(1)),
        mois_stock_calcule: typeof moisStock === "number" ? Number(moisStock.toFixed(1)) : moisStock,
        ecart_seuil: typeof ecartSeuil === "number" ? Number(ecartSeuil.toFixed(1)) : ecartSeuil,
        ventes_12_mois: ventes12Mois,
        derniere_vente: ventesInfo?.dernierMois
      })
    })

    // Trier par écart au seuil
    tousLesProduitsAvecStock.sort((a, b) => {
      // Gérer les cas spéciaux en premier
      if (a.mois_stock_calcule === "Rupture" && b.mois_stock_calcule !== "Rupture") return -1
      if (b.mois_stock_calcule === "Rupture" && a.mois_stock_calcule !== "Rupture") return 1
      if (a.mois_stock_calcule === "Stock infini" && b.mois_stock_calcule !== "Stock infini") return params.mode === "dessus" ? -1 : 1
      if (b.mois_stock_calcule === "Stock infini" && a.mois_stock_calcule !== "Stock infini") return params.mode === "dessus" ? 1 : -1
      
      // Pour les valeurs numériques
      if (typeof a.ecart_seuil === "number" && typeof b.ecart_seuil === "number") {
        if (params.mode === "dessous") {
          return a.ecart_seuil - b.ecart_seuil // Les plus négatifs en premier
        } else {
          return b.ecart_seuil - a.ecart_seuil // Les plus positifs en premier
        }
      }
      
      return 0
    })

    // Calculer le résumé
    const stockMoyen = stocksValides.length > 0 ? 
      stocksValides.reduce((sum, s) => sum + s, 0) / stocksValides.length : 0

    const result: AnalyseStockResult = {
      criteres: {
        seuil_mois_stock: params.seuil_mois_stock,
        mode: params.mode,
        periode_analyse: {
          debut: periodeDebut,
          fin: periodeFin
        }
      },
      produits_trouves: tousLesProduitsAvecStock, // TOUS les produits maintenant
      total_produits: tousLesProduitsAvecStock.length,
      resume: {
        stock_moyen: Number(stockMoyen.toFixed(1)),
        produits_rupture: produitsRupture,
        produits_surstock: produitsSurstock
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
function generateSqlString(params: AnalyseStockParams): string {
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
  s.quantite_rayon,
  s.quantite_reserve,
  (s.quantite_rayon + s.quantite_reserve) as stock_total,
  AVG(vm.quantite_vendue) as ventes_mensuelles_moyennes,
  CASE 
    WHEN AVG(vm.quantite_vendue) = 0 AND (s.quantite_rayon + s.quantite_reserve) > 0 
    THEN 'Stock infini'
    WHEN (s.quantite_rayon + s.quantite_reserve) = 0 
    THEN 'Rupture'
    ELSE ROUND((s.quantite_rayon + s.quantite_reserve) / AVG(vm.quantite_vendue), 1)
  END as mois_stock
FROM produits p
  LEFT JOIN stocks s ON p.id = s.produit_id
  LEFT JOIN prix_achats pa ON p.id = pa.produit_id
  LEFT JOIN ventes_mensuelles vm ON p.id = vm.produit_id
WHERE ${whereClause}
  AND vm.annee >= EXTRACT(YEAR FROM CURRENT_DATE - INTERVAL '12 months')
GROUP BY p.id, s.quantite_rayon, s.quantite_reserve
HAVING mois_stock ${operateur} ${params.seuil_mois_stock} OR mois_stock IN ('Rupture', 'Stock infini')
ORDER BY 
  CASE 
    WHEN mois_stock = 'Rupture' THEN 0
    WHEN mois_stock = 'Stock infini' THEN 999999
    ELSE mois_stock
  END
  `.trim()
}