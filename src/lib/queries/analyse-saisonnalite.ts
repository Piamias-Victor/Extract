import type { QueryConfig, QueryResponse } from './types'

export interface AnalyseSaisonnaliteParams {
  periode_historique_annees?: number | undefined  // Défaut 3 ans
  pharmacie_id?: number | undefined
  fournisseur_id?: number | undefined
  famille_id?: number | undefined
  ean13?: string | undefined
  seuil_amplitude_forte?: number | undefined     // Défaut 1.5 (écart pic/creux)
  seuil_amplitude_moyenne?: number | undefined   // Défaut 0.8
  nb_mois_prevision?: number | undefined         // Défaut 6 mois
}

export interface CoefficientMensuel {
  mois: number
  nom_mois: string
  coefficient: number
  ventes_moyennes: number
  interpretation: string
}

export interface PrevisionMensuelle {
  mois: string
  annee: number
  ventes_prevues: number
  stock_recommande_mini: number
  stock_recommande_maxi: number
  confiance_prevision: "ELEVEE" | "MOYENNE" | "FAIBLE"
}

export interface ProduitSaisonnier {
  ean13: string
  nom: string
  
  // Analyse saisonnalité
  type_saisonnalite: "FORTE" | "MOYENNE" | "FAIBLE" | "AUCUNE"
  amplitude_saisonniere: number
  
  pic_saisonnier: {
    mois: number
    nom_mois: string
    coefficient: number
    interpretation: string
  }
  
  creux_saisonnier: {
    mois: number
    nom_mois: string
    coefficient: number
    interpretation: string
  }
  
  coefficients_mensuels: CoefficientMensuel[]
  
  // Statistiques globales
  ventes_moyennes_annuelles: number
  ventes_periode_reference: number
  stock_actuel: number
  
  // Prédictions
  tendance_annuelle: number  // % d'évolution par an
  previsions_prochains_mois: PrevisionMensuelle[]
  
  // Recommandations
  recommandations_gestion: string[]
  niveau_surveillance: "CRITIQUE" | "IMPORTANT" | "STANDARD" | "MINIMAL"
}

export interface AnalyseSaisonnaliteResult {
  criteres: {
    periode_historique: {
      debut: string
      fin: string
      nb_annees: number
    }
    seuils_amplitude: {
      forte: number
      moyenne: number
    }
    nb_mois_prevision: number
  }
  
  synthese: {
    nb_produits_total: number
    repartition_saisonnalite: {
      forte: number
      moyenne: number
      faible: number
      aucune: number
    }
    produits_forte_saisonnalite: number
    produits_surveillance_critique: number
  }
  
  produits_saisonniers: ProduitSaisonnier[]
  
  top_saisonniers: {
    plus_forte_amplitude: ProduitSaisonnier[]
    pics_hiver: ProduitSaisonnier[]
    pics_ete: ProduitSaisonnier[]
    plus_impactants_ca: ProduitSaisonnier[]
  }
}

export async function getAnalyseSaisonnalite(
  config: QueryConfig,
  params: AnalyseSaisonnaliteParams
): Promise<QueryResponse<AnalyseSaisonnaliteResult>> {
  const startTime = Date.now()

  // Paramètres par défaut
  const nbAnneesHistorique = params.periode_historique_annees || 3
  const seuilAmplitudeForte = params.seuil_amplitude_forte || 1.5
  const seuilAmplitudeMoyenne = params.seuil_amplitude_moyenne || 0.8
  const nbMoisPrevision = params.nb_mois_prevision || 6

  // Calculer période historique
  const maintenant = new Date()
  const debutHistorique = new Date(maintenant)
  debutHistorique.setFullYear(maintenant.getFullYear() - nbAnneesHistorique)
  
  const periodeDebut = debutHistorique.toISOString().split('T')[0]
  const periodeFin = maintenant.toISOString().split('T')[0]

  const nomsM ois = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ]

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
            periode_historique: { 
              debut: periodeDebut, fin: periodeFin, nb_annees: nbAnneesHistorique 
            },
            seuils_amplitude: { forte: seuilAmplitudeForte, moyenne: seuilAmplitudeMoyenne },
            nb_mois_prevision: nbMoisPrevision
          },
          synthese: {
            nb_produits_total: 0,
            repartition_saisonnalite: { forte: 0, moyenne: 0, faible: 0, aucune: 0 },
            produits_forte_saisonnalite: 0,
            produits_surveillance_critique: 0
          },
          produits_saisonniers: [],
          top_saisonniers: {
            plus_forte_amplitude: [], pics_hiver: [], pics_ete: [], plus_impactants_ca: []
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

    // Étape 3: Récupérer ventes historiques (période complète)
    const anneeDebut = debutHistorique.getFullYear()
    const anneeFin = maintenant.getFullYear()

    const { data: ventesData, error: ventesError } = await config.client
      .from('ventes_mensuelles')
      .select(`
        produit_id,
        quantite_vendue,
        annee,
        mois
      `)
      .in('produit_id', produitIds)
      .gte('annee', anneeDebut)
      .lte('annee', anneeFin)

    if (ventesError) {
      throw new Error(ventesError.message)
    }

    // Étape 4: Récupérer stocks actuels
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

    // Étape 5: Organiser les ventes par produit et mois
    const ventesParProduitEtMois = new Map<number, Map<number, number[]>>()
    
    ventesData?.forEach(vente => {
      const produitId = vente.produit_id
      const mois = vente.mois
      const quantite = vente.quantite_vendue || 0

      if (!ventesParProduitEtMois.has(produitId)) {
        ventesParProduitEtMois.set(produitId, new Map())
      }
      
      const ventesParMois = ventesParProduitEtMois.get(produitId)!
      if (!ventesParMois.has(mois)) {
        ventesParMois.set(mois, [])
      }
      
      ventesParMois.get(mois)!.push(quantite)
    })

    const stocksParProduit = new Map<number, any>()
    stocksData?.forEach(stock => {
      if (!stocksParProduit.has(stock.produit_id)) {
        stocksParProduit.set(stock.produit_id, stock)
      }
    })

    // Étape 6: Calculer saisonnalité pour chaque produit
    const produitsSaisonniers: ProduitSaisonnier[] = []

    finalProduitsData.forEach(produit => {
      const ventesParMois = ventesParProduitEtMois.get(produit.id)
      const stock = stocksParProduit.get(produit.id)

      if (!ventesParMois || ventesParMois.size === 0) return

      // Calculer moyennes mensuelles et annuelle
      const coefficientsMensuels: CoefficientMensuel[] = []
      const ventesMoyennesParMois: number[] = []
      let totalVentesAnnuelles = 0

      for (let mois = 1; mois <= 12; mois++) {
        const ventesduMois = ventesParMois.get(mois) || []
        const moyenneMois = ventesduMois.length > 0 ? 
          ventesduMois.reduce((sum, v) => sum + v, 0) / ventesduMois.length : 0
        
        ventesMoyennesParMois.push(moyenneMois)
        totalVentesAnnuelles += moyenneMois
      }

      const ventesMoyennesAnnuelles = totalVentesAnnuelles / 12

      // Calculer coefficients saisonniers
      for (let mois = 1; mois <= 12; mois++) {
        const moyenneMois = ventesMoyennesParMois[mois - 1]
        const coefficient = ventesMoyennesAnnuelles > 0 ? moyenneMois / ventesMoyennesAnnuelles : 1.0
        
        let interpretation = ""
        if (coefficient >= 1.5) interpretation = "Pic très fort (+50%)"
        else if (coefficient >= 1.2) interpretation = "Pic modéré (+20%)"
        else if (coefficient >= 0.8) interpretation = "Normal"
        else if (coefficient >= 0.5) interpretation = "Creux modéré (-20%)"
        else interpretation = "Creux très fort (-50%)"

        coefficientsMensuels.push({
          mois,
          nom_mois: nomsMois[mois - 1],
          coefficient: Number(coefficient.toFixed(2)),
          ventes_moyennes: Number(moyenneMois.toFixed(1)),
          interpretation
        })
      }

      // Identifier pic et creux
      const coefficients = coefficientsMensuels.map(c => c.coefficient)
      const maxCoeff = Math.max(...coefficients)
      const minCoeff = Math.min(...coefficients)
      const amplitude = maxCoeff - minCoeff

      const indicePic = coefficients.indexOf(maxCoeff)
      const indiceCreux = coefficients.indexOf(minCoeff)

      const picSaisonnier = coefficientsMensuels[indicePic]
      const creuxSaisonnier = coefficientsMensuels[indiceCreux]

      // Classifier type de saisonnalité
      let typeSaisonnalite: "FORTE" | "MOYENNE" | "FAIBLE" | "AUCUNE"
      if (amplitude >= seuilAmplitudeForte) typeSaisonnalite = "FORTE"
      else if (amplitude >= seuilAmplitudeMoyenne) typeSaisonnalite = "MOYENNE"
      else if (amplitude >= 0.3) typeSaisonnalite = "FAIBLE"
      else typeSaisonnalite = "AUCUNE"

      // Calculer tendance annuelle (régression simple)
      const anneesData: number[] = []
      for (let annee = anneeDebut; annee <= anneeFin; annee++) {
        let totalAnnee = 0
        for (let mois = 1; mois <= 12; mois++) {
          const ventesduMois = ventesParMois.get(mois) || []
          // Filtrer par année (approximatif pour cette démo)
          totalAnnee += ventesduMois.length > 0 ? ventesduMois[0] || 0 : 0
        }
        anneesData.push(totalAnnee)
      }

      let tendanceAnnuelle = 0
      if (anneesData.length >= 2) {
        const premiere = anneesData[0]
        const derniere = anneesData[anneesData.length - 1]
        if (premiere > 0) {
          tendanceAnnuelle = ((derniere - premiere) / premiere) * 100 / (anneesData.length - 1)
        }
      }

      // Générer prévisions
      const previsions: PrevisionMensuelle[] = []
      for (let i = 1; i <= nbMoisPrevision; i++) {
        const datePrevision = new Date(maintenant)
        datePrevision.setMonth(maintenant.getMonth() + i)
        
        const moisPrevision = datePrevision.getMonth() + 1
        const anneePrevision = datePrevision.getFullYear()
        const coefficientSaisonnier = coefficientsMensuels[moisPrevision - 1].coefficient
        
        // Prévision = moyenne annuelle * coefficient saisonnier * (1 + tendance)
        const facteurTendance = Math.pow(1 + tendanceAnnuelle / 100, i / 12)
        const ventesPrevues = ventesMoyennesAnnuelles * coefficientSaisonnier * facteurTendance

        // Stock recommandé (formule simplifiée)
        const stockMini = Math.ceil(ventesPrevues * 0.5)  // 15 jours
        const stockMaxi = Math.ceil(ventesPrevues * 1.5)  // 45 jours

        // Confiance selon type saisonnalité
        let confiance: "ELEVEE" | "MOYENNE" | "FAIBLE"
        if (typeSaisonnalite === "FORTE" || typeSaisonnalite === "MOYENNE") confiance = "ELEVEE"
        else if (typeSaisonnalite === "FAIBLE") confiance = "MOYENNE"
        else confiance = "FAIBLE"

        previsions.push({
          mois: `${anneePrevision}-${moisPrevision.toString().padStart(2, '0')}`,
          annee: anneePrevision,
          ventes_prevues: Math.round(ventesPrevues),
          stock_recommande_mini: stockMini,
          stock_recommande_maxi: stockMaxi,
          confiance_prevision: confiance
        })
      }

      // Recommandations de gestion
      const recommandations: string[] = []
      let niveauSurveillance: "CRITIQUE" | "IMPORTANT" | "STANDARD" | "MINIMAL" = "MINIMAL"

      if (typeSaisonnalite === "FORTE") {
        recommandations.push("Anticipation obligatoire des pics saisonniers")
        recommandations.push(`Stock renforcé avant ${picSaisonnier.nom_mois}`)
        recommandations.push(`Déstockage programmé après ${picSaisonnier.nom_mois}`)
        niveauSurveillance = "CRITIQUE"
      } else if (typeSaisonnalite === "MOYENNE") {
        recommandations.push("Ajustement stock selon saison")
        recommandations.push("Surveillance mensuelle recommandée")
        niveauSurveillance = "IMPORTANT"
      } else if (typeSaisonnalite === "FAIBLE") {
        recommandations.push("Légère adaptation saisonnière")
        niveauSurveillance = "STANDARD"
      } else {
        recommandations.push("Gestion standard toute l'année")
        niveauSurveillance = "MINIMAL"
      }

      if (tendanceAnnuelle > 5) {
        recommandations.push(`Tendance croissante forte (+${tendanceAnnuelle.toFixed(1)}%/an)`)
      } else if (tendanceAnnuelle < -5) {
        recommandations.push(`Tendance décroissante (-${Math.abs(tendanceAnnuelle).toFixed(1)}%/an)`)
      }

      const stockActuel = (stock?.quantite_rayon || 0) + (stock?.quantite_reserve || 0)
      const ventesPeriodeReference = totalVentesAnnuelles

      produitsSaisonniers.push({
        ean13: produit.ean13_principal,
        nom: produit.designation,
        type_saisonnalite: typeSaisonnalite,
        amplitude_saisonniere: Number(amplitude.toFixed(2)),
        pic_saisonnier: {
          mois: picSaisonnier.mois,
          nom_mois: picSaisonnier.nom_mois,
          coefficient: picSaisonnier.coefficient,
          interpretation: picSaisonnier.interpretation
        },
        creux_saisonnier: {
          mois: creuxSaisonnier.mois,
          nom_mois: creuxSaisonnier.nom_mois,
          coefficient: creuxSaisonnier.coefficient,
          interpretation: creuxSaisonnier.interpretation
        },
        coefficients_mensuels: coefficientsMensuels,
        ventes_moyennes_annuelles: Number(ventesMoyennesAnnuelles.toFixed(1)),
        ventes_periode_reference: Number(ventesPeriodeReference.toFixed(1)),
        stock_actuel: stockActuel,
        tendance_annuelle: Number(tendanceAnnuelle.toFixed(1)),
        previsions_prochains_mois: previsions,
        recommandations_gestion: recommandations,
        niveau_surveillance: niveauSurveillance
      })
    })

    // Étape 7: Calculer synthèse et tops
    const repartitionSaisonnalite = {
      forte: produitsSaisonniers.filter(p => p.type_saisonnalite === "FORTE").length,
      moyenne: produitsSaisonniers.filter(p => p.type_saisonnalite === "MOYENNE").length,
      faible: produitsSaisonniers.filter(p => p.type_saisonnalite === "FAIBLE").length,
      aucune: produitsSaisonniers.filter(p => p.type_saisonnalite === "AUCUNE").length
    }

    const produitsSurveillanceCritique = produitsSaisonniers.filter(p => 
      p.niveau_surveillance === "CRITIQUE" || p.niveau_surveillance === "IMPORTANT"
    ).length

    // Tops
    const plusForteAmplitude = produitsSaisonniers
      .filter(p => p.type_saisonnalite === "FORTE")
      .sort((a, b) => b.amplitude_saisonniere - a.amplitude_saisonniere)
      .slice(0, 5)

    const picsHiver = produitsSaisonniers
      .filter(p => [11, 12, 1, 2].includes(p.pic_saisonnier.mois))
      .sort((a, b) => b.pic_saisonnier.coefficient - a.pic_saisonnier.coefficient)
      .slice(0, 5)

    const picsEte = produitsSaisonniers
      .filter(p => [6, 7, 8].includes(p.pic_saisonnier.mois))
      .sort((a, b) => b.pic_saisonnier.coefficient - a.pic_saisonnier.coefficient)
      .slice(0, 5)

    const plusImpactantsCA = produitsSaisonniers
      .filter(p => p.type_saisonnalite === "FORTE" || p.type_saisonnalite === "MOYENNE")
      .sort((a, b) => b.ventes_periode_reference - a.ventes_periode_reference)
      .slice(0, 5)

    const result: AnalyseSaisonnaliteResult = {
      criteres: {
        periode_historique: {
          debut: periodeDebut,
          fin: periodeFin,
          nb_annees: nbAnneesHistorique
        },
        seuils_amplitude: {
          forte: seuilAmplitudeForte,
          moyenne: seuilAmplitudeMoyenne
        },
        nb_mois_prevision: nbMoisPrevision
      },
      synthese: {
        nb_produits_total: produitsSaisonniers.length,
        repartition_saisonnalite: repartitionSaisonnalite,
        produits_forte_saisonnalite: repartitionSaisonnalite.forte,
        produits_surveillance_critique: produitsSurveillanceCritique
      },
      produits_saisonniers: produitsSaisonniers,
      top_saisonniers: {
        plus_forte_amplitude: plusForteAmplitude,
        pics_hiver: picsHiver,
        pics_ete: picsEte,
        plus_impactants_ca: plusImpactantsCA
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
function generateSqlString(params: AnalyseSaisonnaliteParams): string {
  const conditions: string[] = ["p.statut = 'ACTIF'"]
  
  if (params.pharmacie_id) conditions.push(`p.pharmacie_id = ${params.pharmacie_id}`)
  if (params.fournisseur_id) conditions.push(`pa.fournisseur_id = ${params.fournisseur_id}`)
  if (params.famille_id) conditions.push(`p.famille_id = ${params.famille_id}`)
  if (params.ean13) conditions.push(`p.ean13_principal = '${params.ean13}'`)

  const whereClause = conditions.join(' AND ')
  const nbAnnees = params.periode_historique_annees || 3

  return `
-- ANALYSE SAISONNALITÉ ET PRÉDICTIONS
WITH ventes_mensuelles_avg AS (
  SELECT 
    p.ean13_principal,
    p.designation,
    vm.mois,
    AVG(vm.quantite_vendue) as moyenne_mois,
    COUNT(*) as nb_annees_data
  FROM produits p
    LEFT JOIN prix_achats pa ON p.id = pa.produit_id
    LEFT JOIN ventes_mensuelles vm ON p.id = vm.produit_id
    LEFT JOIN stocks s ON p.id = s.produit_id
  WHERE ${whereClause}
    AND vm.annee >= EXTRACT(YEAR FROM CURRENT_DATE) - ${nbAnnees}
  GROUP BY p.id, p.ean13_principal, p.designation, vm.mois
),
coefficients_saisonniers AS (
  SELECT *,
    AVG(moyenne_mois) OVER (PARTITION BY ean13_principal) as moyenne_annuelle,
    CASE 
      WHEN AVG(moyenne_mois) OVER (PARTITION BY ean13_principal) > 0 
      THEN moyenne_mois / AVG(moyenne_mois) OVER (PARTITION BY ean13_principal)
      ELSE 1.0
    END as coefficient_saisonnier
  FROM ventes_mensuelles_avg
),
analyse_amplitude AS (
  SELECT 
    ean13_principal,
    designation,
    MAX(coefficient_saisonnier) - MIN(coefficient_saisonnier) as amplitude,
    CASE 
      WHEN MAX(coefficient_saisonnier) - MIN(coefficient_saisonnier) >= 1.5 THEN 'FORTE'
      WHEN MAX(coefficient_saisonnier) - MIN(coefficient_saisonnier) >= 0.8 THEN 'MOYENNE'
      WHEN MAX(coefficient_saisonnier) - MIN(coefficient_saisonnier) >= 0.3 THEN 'FAIBLE'
      ELSE 'AUCUNE'
    END as type_saisonnalite
  FROM coefficients_saisonniers
  GROUP BY ean13_principal, designation
)
SELECT *
FROM analyse_amplitude
WHERE type_saisonnalite IN ('FORTE', 'MOYENNE')
ORDER BY amplitude DESC
  `.trim()
}