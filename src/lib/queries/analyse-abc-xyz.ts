import type { QueryConfig, QueryResponse } from './types'

export interface AnalyseAbcXyzParams {
  date_debut: string
  date_fin: string
  pharmacie_id?: number | undefined
  fournisseur_id?: number | undefined
  famille_id?: number | undefined
  ean13?: string | undefined
  seuil_abc_a?: number | undefined  // Défaut 80%
  seuil_abc_b?: number | undefined  // Défaut 95%
  seuil_xyz_x?: number | undefined  // Défaut 0.5
  seuil_xyz_y?: number | undefined  // Défaut 1.0
}

export interface ProduitAbcXyz {
  ean13: string
  nom: string
  ca_periode: number
  ca_cumule: number
  pourcentage_ca: number
  pourcentage_cumule: number
  rang_abc: number
  classe_abc: "A" | "B" | "C"
  
  ventes_moyennes_mensuelles: number
  ecart_type_ventes: number
  coefficient_variation: number
  classe_xyz: "X" | "Y" | "Z"
  regularite_interpretation: string
  
  classification_finale: string  // "AX", "BY", "CZ", etc.
  strategie_recommandee: string
  actions_prioritaires: string[]
  stock_actuel: number
  ventes_periode: number
}

export interface MatriceAbcXyz {
  AX: ProduitAbcXyz[]
  AY: ProduitAbcXyz[]
  AZ: ProduitAbcXyz[]
  BX: ProduitAbcXyz[]
  BY: ProduitAbcXyz[]
  BZ: ProduitAbcXyz[]
  CX: ProduitAbcXyz[]
  CY: ProduitAbcXyz[]
  CZ: ProduitAbcXyz[]
}

export interface AnalyseAbcXyzResult {
  criteres: {
    periode: { debut: string, fin: string }
    seuils_abc: { A: number, B: number }
    seuils_xyz: { X: number, Y: number }
  }
  synthese: {
    ca_total: number
    nb_produits_total: number
    repartition_abc: { A: number, B: number, C: number }
    repartition_xyz: { X: number, Y: number, Z: number }
  }
  matrice_abc_xyz: MatriceAbcXyz
  recommandations_strategiques: {
    priorite_absolue: number     // Nb produits AX
    surveillance_renforcee: number // Nb produits AY + AZ
    automatisation_possible: number // Nb produits BX + CX
    candidats_deferencement: number // Nb produits CZ
  }
}

export async function getAnalyseAbcXyz(
  config: QueryConfig,
  params: AnalyseAbcXyzParams
): Promise<QueryResponse<AnalyseAbcXyzResult>> {
  const startTime = Date.now()

  // Seuils par défaut
  const seuilAbcA = params.seuil_abc_a || 80
  const seuilAbcB = params.seuil_abc_b || 95
  const seuilXyzX = params.seuil_xyz_x || 0.5
  const seuilXyzY = params.seuil_xyz_y || 1.0

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
            periode: { debut: params.date_debut, fin: params.date_fin },
            seuils_abc: { A: seuilAbcA, B: seuilAbcB },
            seuils_xyz: { X: seuilXyzX, Y: seuilXyzY }
          },
          synthese: {
            ca_total: 0, nb_produits_total: 0,
            repartition_abc: { A: 0, B: 0, C: 0 },
            repartition_xyz: { X: 0, Y: 0, Z: 0 }
          },
          matrice_abc_xyz: {
            AX: [], AY: [], AZ: [], BX: [], BY: [], BZ: [], CX: [], CY: [], CZ: []
          },
          recommandations_strategiques: {
            priorite_absolue: 0, surveillance_renforcee: 0,
            automatisation_possible: 0, candidats_deferencement: 0
          }
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
    const ventesParProduit = new Map<number, number[]>()
    ventesData?.forEach(vente => {
      const quantite = vente.quantite_vendue || 0
      if (!ventesParProduit.has(vente.produit_id)) {
        ventesParProduit.set(vente.produit_id, [])
      }
      ventesParProduit.get(vente.produit_id)!.push(quantite)
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

    // Étape 6: Calculer CA et statistiques par produit
    const produitsAvecStats: Array<{
      produit: any,
      ca: number,
      ventes: number[],
      stock: number
    }> = []

    const maintenant = new Date()

    finalProduitsData.forEach(produit => {
      const prixVente = prixVenteParProduit.get(produit.id)
      const ventes = ventesParProduit.get(produit.id) || []
      const stock = stocksParProduit.get(produit.id)

      if (!prixVente || ventes.length === 0) return

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

      const ventesTotales = ventes.reduce((sum, v) => sum + v, 0)
      const ca = prixVenteTtc * ventesTotales
      const stockTotal = (stock?.quantite_rayon || 0) + (stock?.quantite_reserve || 0)

      produitsAvecStats.push({
        produit,
        ca,
        ventes,
        stock: stockTotal
      })
    })

    // Étape 7: Classification ABC (par CA)
    produitsAvecStats.sort((a, b) => b.ca - a.ca)
    const caTotal = produitsAvecStats.reduce((sum, p) => sum + p.ca, 0)

    let caCumule = 0
    const produitsAvecABC = produitsAvecStats.map((item, index) => {
      caCumule += item.ca
      const pourcentageCumule = caTotal > 0 ? (caCumule / caTotal) * 100 : 0
      
      let classeABC: "A" | "B" | "C"
      if (pourcentageCumule <= seuilAbcA) classeABC = "A"
      else if (pourcentageCumule <= seuilAbcB) classeABC = "B"
      else classeABC = "C"

      return {
        ...item,
        pourcentageCumule,
        classeABC,
        rangABC: index + 1
      }
    })

    // Étape 8: Classification XYZ (par régularité)
    const produitsAvecXYZ = produitsAvecABC.map(item => {
      const ventes = item.ventes
      const moyenne = ventes.reduce((sum, v) => sum + v, 0) / ventes.length
      
      // Calcul écart-type
      const variance = ventes.reduce((sum, v) => sum + Math.pow(v - moyenne, 2), 0) / ventes.length
      const ecartType = Math.sqrt(variance)
      
      // Coefficient de variation
      const coefficientVariation = moyenne > 0 ? ecartType / moyenne : 999
      
      let classeXYZ: "X" | "Y" | "Z"
      let interpretation: string
      
      if (coefficientVariation <= seuilXyzX) {
        classeXYZ = "X"
        interpretation = "Ventes très régulières et prévisibles"
      } else if (coefficientVariation <= seuilXyzY) {
        classeXYZ = "Y" 
        interpretation = "Ventes moyennement prévisibles"
      } else {
        classeXYZ = "Z"
        interpretation = "Ventes imprévisibles ou sporadiques"
      }

      return {
        ...item,
        moyenne,
        ecartType,
        coefficientVariation,
        classeXYZ,
        interpretation
      }
    })

    // Étape 9: Créer la matrice finale et recommandations
    const strategiesRecommandations = {
      AX: {
        strategie: "Stock de sécurité élevé - Priorité absolue",
        actions: ["Stock mini = 2 mois", "Suivi quotidien", "Fournisseur de secours"]
      },
      AY: {
        strategie: "Stock adaptatif avec surveillance renforcée", 
        actions: ["Stock mini = 1.5 mois", "Suivi hebdomadaire", "Anticipation saisonnière"]
      },
      AZ: {
        strategie: "Gestion au plus juste avec vigilance",
        actions: ["Stock mini = 3 semaines", "Commandes fréquentes", "Analyser causes irrégularité"]
      },
      BX: {
        strategie: "Gestion standard optimisée",
        actions: ["Stock mini = 1 mois", "Suivi mensuel", "Automatisation possible"]
      },
      BY: {
        strategie: "Gestion standard",
        actions: ["Stock mini = 3 semaines", "Suivi mensuel"]
      },
      BZ: {
        strategie: "Gestion réactive",
        actions: ["Stock mini = 2 semaines", "Commandes à la demande"]
      },
      CX: {
        strategie: "Automatisation complète recommandée",
        actions: ["Stock mini = 2 semaines", "Commandes automatiques", "Suivi trimestriel"]
      },
      CY: {
        strategie: "Gestion minimale",
        actions: ["Stock mini = 1 semaine", "Suivi semestriel"]
      },
      CZ: {
        strategie: "Candidats au déréférencement",
        actions: ["Analyser utilité réelle", "Arrêt progressif si possible", "Stock minimal"]
      }
    }

    // Créer les produits finaux avec toutes les infos
    const produitsFinals: ProduitAbcXyz[] = produitsAvecXYZ.map(item => {
      const classificationFinale = `${item.classeABC}${item.classeXYZ}`
      const strategie = strategiesRecommandations[classificationFinale as keyof typeof strategiesRecommandations]

      return {
        ean13: item.produit.ean13_principal,
        nom: item.produit.designation,
        ca_periode: Number(item.ca.toFixed(2)),
        ca_cumule: Number((item.pourcentageCumule * caTotal / 100).toFixed(2)),
        pourcentage_ca: Number((item.ca / caTotal * 100).toFixed(2)),
        pourcentage_cumule: Number(item.pourcentageCumule.toFixed(2)),
        rang_abc: item.rangABC,
        classe_abc: item.classeABC,
        ventes_moyennes_mensuelles: Number(item.moyenne.toFixed(1)),
        ecart_type_ventes: Number(item.ecartType.toFixed(1)),
        coefficient_variation: Number(item.coefficientVariation.toFixed(3)),
        classe_xyz: item.classeXYZ,
        regularite_interpretation: item.interpretation,
        classification_finale: classificationFinale,
        strategie_recommandee: strategie.strategie,
        actions_prioritaires: strategie.actions,
        stock_actuel: item.stock,
        ventes_periode: item.ventes.reduce((sum, v) => sum + v, 0)
      }
    })

    // Organiser en matrice
    const matrice: MatriceAbcXyz = {
      AX: [], AY: [], AZ: [], BX: [], BY: [], BZ: [], CX: [], CY: [], CZ: []
    }

    produitsFinals.forEach(produit => {
      const cle = produit.classification_finale as keyof MatriceAbcXyz
      matrice[cle].push(produit)
    })

    // Calculer répartitions et recommandations
    const repartitionABC = {
      A: produitsFinals.filter(p => p.classe_abc === "A").length,
      B: produitsFinals.filter(p => p.classe_abc === "B").length,
      C: produitsFinals.filter(p => p.classe_abc === "C").length
    }

    const repartitionXYZ = {
      X: produitsFinals.filter(p => p.classe_xyz === "X").length,
      Y: produitsFinals.filter(p => p.classe_xyz === "Y").length,
      Z: produitsFinals.filter(p => p.classe_xyz === "Z").length
    }

    const recommandationsStrategiques = {
      priorite_absolue: matrice.AX.length,
      surveillance_renforcee: matrice.AY.length + matrice.AZ.length,
      automatisation_possible: matrice.BX.length + matrice.CX.length,
      candidats_deferencement: matrice.CZ.length
    }

    const result: AnalyseAbcXyzResult = {
      criteres: {
        periode: { debut: params.date_debut, fin: params.date_fin },
        seuils_abc: { A: seuilAbcA, B: seuilAbcB },
        seuils_xyz: { X: seuilXyzX, Y: seuilXyzY }
      },
      synthese: {
        ca_total: Number(caTotal.toFixed(2)),
        nb_produits_total: produitsFinals.length,
        repartition_abc: repartitionABC,
        repartition_xyz: repartitionXYZ
      },
      matrice_abc_xyz: matrice,
      recommandations_strategiques: recommandationsStrategiques
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
function generateSqlString(params: AnalyseAbcXyzParams): string {
  const conditions: string[] = ["p.statut = 'ACTIF'"]
  
  if (params.pharmacie_id) conditions.push(`p.pharmacie_id = ${params.pharmacie_id}`)
  if (params.fournisseur_id) conditions.push(`pa.fournisseur_id = ${params.fournisseur_id}`)
  if (params.famille_id) conditions.push(`p.famille_id = ${params.famille_id}`)
  if (params.ean13) conditions.push(`p.ean13_principal = '${params.ean13}'`)

  const whereClause = conditions.join(' AND ')

  return `
-- CLASSIFICATION ABC/XYZ
WITH ca_produits AS (
  SELECT 
    p.ean13_principal,
    p.designation,
    SUM(pv.prix_vente_ttc * vm.quantite_vendue) as ca_periode,
    SUM(vm.quantite_vendue) as ventes_periode,
    AVG(vm.quantite_vendue) as moyenne_mensuelle,
    STDDEV(vm.quantite_vendue) as ecart_type,
    CASE 
      WHEN AVG(vm.quantite_vendue) > 0 
      THEN STDDEV(vm.quantite_vendue) / AVG(vm.quantite_vendue)
      ELSE 999
    END as coefficient_variation
  FROM produits p
    LEFT JOIN prix_achats pa ON p.id = pa.produit_id
    LEFT JOIN prix_vente pv ON p.id = pv.produit_id
    LEFT JOIN ventes_mensuelles vm ON p.id = vm.produit_id
    LEFT JOIN stocks s ON p.id = s.produit_id
  WHERE ${whereClause}
    AND vm.annee BETWEEN EXTRACT(YEAR FROM '${params.date_debut}'::date) 
    AND EXTRACT(YEAR FROM '${params.date_fin}'::date)
  GROUP BY p.id, p.ean13_principal, p.designation
),
classification AS (
  SELECT *,
    -- Classification ABC par CA cumulé
    CASE 
      WHEN (SUM(ca_periode) OVER (ORDER BY ca_periode DESC ROWS UNBOUNDED PRECEDING) / 
            SUM(ca_periode) OVER ()) <= 0.80 THEN 'A'
      WHEN (SUM(ca_periode) OVER (ORDER BY ca_periode DESC ROWS UNBOUNDED PRECEDING) / 
            SUM(ca_periode) OVER ()) <= 0.95 THEN 'B'
      ELSE 'C'
    END as classe_abc,
    -- Classification XYZ par régularité
    CASE 
      WHEN coefficient_variation <= 0.5 THEN 'X'
      WHEN coefficient_variation <= 1.0 THEN 'Y'
      ELSE 'Z'
    END as classe_xyz
  FROM ca_produits
)
SELECT *,
  CONCAT(classe_abc, classe_xyz) as classification_finale
FROM classification
ORDER BY ca_periode DESC
  `.trim()
}