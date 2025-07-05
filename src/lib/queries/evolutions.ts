import type { QueryConfig, QueryResponse } from './types'

export interface EvolutionsParams {
  date_debut_courante: string
  date_fin_courante: string
  date_debut_comparaison: string
  date_fin_comparaison: string
  pharmacie_id?: number | undefined
  fournisseur_id?: number | undefined
  famille_id?: number | undefined
  ean13?: string | undefined
}

export interface EvolutionIndicateur {
  periode_courante: number
  periode_comparaison: number
  evolution_pct: number | "N/A"
}

export interface EvolutionTauxMarge {
  periode_courante: number
  periode_comparaison: number
  evolution_points: number | "N/A"
}

export interface EvolutionMensuelle {
  mois: string
  ca_evolution_pct: number | "N/A"
  marge_evolution_pct: number | "N/A"
  quantite_evolution_pct: number | "N/A"
}

export interface EvolutionsResult {
  periode_courante: {
    debut: string
    fin: string
  }
  periode_comparaison: {
    debut: string
    fin: string
  }
  evolutions_globales: {
    ca_ttc: EvolutionIndicateur
    marge_ttc: EvolutionIndicateur
    taux_marge: EvolutionTauxMarge
    quantite: EvolutionIndicateur
  }
  evolutions_mensuelles: EvolutionMensuelle[]
}

export async function getEvolutions(
  config: QueryConfig,
  params: EvolutionsParams
): Promise<QueryResponse<EvolutionsResult>> {
  const startTime = Date.now()

  try {
    // Validation des dates
    const dateCouranteDebut = new Date(params.date_debut_courante)
    const dateCouranteFin = new Date(params.date_fin_courante)
    const dateComparaisonDebut = new Date(params.date_debut_comparaison)
    const dateComparaisonFin = new Date(params.date_fin_comparaison)

    // Fonction helper pour calculer les KPIs d'une période
    const calculerKpisPeriode = async (dateDebut: Date, dateFin: Date) => {
      const anneeDebut = dateDebut.getFullYear()
      const anneeFin = dateFin.getFullYear()
      const moisDebut = dateDebut.getMonth() + 1
      const moisFin = dateFin.getMonth() + 1

      // Étape 1: Récupérer les produits avec filtres
      let produitsQuery = config.client
        .from('produits')
        .select('id, tva, pharmacie_id, famille_id, ean13_principal')
        .eq('statut', 'ACTIF')

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
      if (produitsError) throw new Error(produitsError.message)

      let finalProduits = produitsData || []

      // Filtre fournisseur si nécessaire
      if (params.fournisseur_id && finalProduits.length > 0) {
        const produitIds = finalProduits.map(p => p.id)
        const { data: prixAchatsData, error: prixError } = await config.client
          .from('prix_achats')
          .select('produit_id')
          .eq('fournisseur_id', params.fournisseur_id)
          .in('produit_id', produitIds)

        if (prixError) throw new Error(prixError.message)

        const produitIdsFournisseur = prixAchatsData?.map(pa => pa.produit_id) || []
        finalProduits = finalProduits.filter(p => produitIdsFournisseur.includes(p.id))
      }

      if (finalProduits.length === 0) {
        return {
          ca_total: 0,
          marge_total: 0,
          quantite_total: 0,
          ventesParMois: new Map<string, any>()
        }
      }

      const produitIds = finalProduits.map(p => p.id)

      // Étape 2: Récupérer ventes de la période
      let ventesQuery = config.client
        .from('ventes_mensuelles')
        .select('produit_id, quantite_vendue, annee, mois')
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
      if (ventesError) throw new Error(ventesError.message)

      // Étape 3: Récupérer prix de vente
      const { data: prixVenteData, error: prixVenteError } = await config.client
        .from('prix_vente')
        .select('produit_id, prix_vente_ttc, prix_promo_ttc, date_debut_promo, date_fin_promo')
        .in('produit_id', produitIds)
        .order('date_extraction', { ascending: false })

      if (prixVenteError) throw new Error(prixVenteError.message)

      // Étape 4: Récupérer prix d'achat
      const { data: prixAchatData, error: prixAchatError } = await config.client
        .from('prix_achats')
        .select('produit_id, prix_net_ht')
        .in('produit_id', produitIds)
        .order('date_import', { ascending: false })

      if (prixAchatError) throw new Error(prixAchatError.message)

      // Créer des maps pour performance
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

      const produitParId = new Map<number, any>()
      finalProduits.forEach(p => produitParId.set(p.id, p))

      // Calculs
      let caTotal = 0
      let margeTotal = 0
      let quantiteTotal = 0
      const ventesParMois = new Map<string, any>()

      ventesData?.forEach(vente => {
        const produit = produitParId.get(vente.produit_id)
        const prixVente = prixVenteParProduit.get(vente.produit_id)
        const prixAchat = prixAchatParProduit.get(vente.produit_id)

        if (!produit || !prixVente || !prixAchat) return

        const quantite = vente.quantite_vendue || 0
        quantiteTotal += quantite

        // Prix de vente (avec promo si active)
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

        // Prix d'achat TTC
        const tva = produit.tva || 20
        const prixAchatTtc = prixAchat.prix_net_ht * (1 + tva / 100)

        const ca = prixVenteTtc * quantite
        const marge = (prixVenteTtc - prixAchatTtc) * quantite

        caTotal += ca
        margeTotal += marge

        // Grouper par mois
        const moisKey = `${vente.annee}-${vente.mois.toString().padStart(2, '0')}`
        if (!ventesParMois.has(moisKey)) {
          ventesParMois.set(moisKey, { ca: 0, marge: 0, quantite: 0 })
        }
        const moisData = ventesParMois.get(moisKey)
        moisData.ca += ca
        moisData.marge += marge
        moisData.quantite += quantite
      })

      return {
        ca_total: caTotal,
        marge_total: margeTotal,
        quantite_total: quantiteTotal,
        ventesParMois
      }
    }

    // Calculer les KPIs pour les deux périodes
    const [kpisCourante, kpisComparaison] = await Promise.all([
      calculerKpisPeriode(dateCouranteDebut, dateCouranteFin),
      calculerKpisPeriode(dateComparaisonDebut, dateComparaisonFin)
    ])

    // Fonction helper pour calculer l'évolution
    const calculerEvolution = (valCourante: number, valComparaison: number): number | "N/A" => {
      if (valComparaison === 0 && valCourante === 0) return "N/A"
      if (valComparaison === 0) return "N/A"
      if (valCourante === 0) return -100
      return ((valCourante - valComparaison) / valComparaison) * 100
    }

    // Calculer les taux de marge
    const tauxMargeCourante = kpisCourante.ca_total > 0 ? 
      (kpisCourante.marge_total / kpisCourante.ca_total) * 100 : 0
    const tauxMargeComparaison = kpisComparaison.ca_total > 0 ? 
      (kpisComparaison.marge_total / kpisComparaison.ca_total) * 100 : 0

    // Évolutions globales
    const evolutionsGlobales = {
      ca_ttc: {
        periode_courante: Number(kpisCourante.ca_total.toFixed(2)),
        periode_comparaison: Number(kpisComparaison.ca_total.toFixed(2)),
        evolution_pct: calculerEvolution(kpisCourante.ca_total, kpisComparaison.ca_total)
      },
      marge_ttc: {
        periode_courante: Number(kpisCourante.marge_total.toFixed(2)),
        periode_comparaison: Number(kpisComparaison.marge_total.toFixed(2)),
        evolution_pct: calculerEvolution(kpisCourante.marge_total, kpisComparaison.marge_total)
      },
      taux_marge: {
        periode_courante: Number(tauxMargeCourante.toFixed(2)),
        periode_comparaison: Number(tauxMargeComparaison.toFixed(2)),
        evolution_points: tauxMargeCourante === 0 && tauxMargeComparaison === 0 ? 
          "N/A" as const : Number((tauxMargeCourante - tauxMargeComparaison).toFixed(2))
      },
      quantite: {
        periode_courante: kpisCourante.quantite_total,
        periode_comparaison: kpisComparaison.quantite_total,
        evolution_pct: calculerEvolution(kpisCourante.quantite_total, kpisComparaison.quantite_total)
      }
    }

    // Évolutions mensuelles - approche simplifiée
    const evolutionsMensuelles: EvolutionMensuelle[] = []
    
    // Debug : voir ce qu'on a dans les deux maps
    console.log('Période courante - mois disponibles:', Array.from(kpisCourante.ventesParMois.keys()))
    console.log('Période comparaison - mois disponibles:', Array.from(kpisComparaison.ventesParMois.keys()))
    
    // Pour chaque mois de la période courante, chercher le mois correspondant dans la comparaison
    kpisCourante.ventesParMois.forEach((dataCourante, moisKeyCourant) => {
      // Extraire mois et année courante (ex: "2025-01" -> mois=01, année=2025)
      const [anneeCourante, moisStr] = moisKeyCourant.split('-')
      const moisNum = parseInt(moisStr)
      
      // Chercher le même mois dans la période de comparaison (ex: 2024-01 pour 2025-01)
      const anneeComparaison = dateComparaisonDebut.getFullYear()
      const moisKeyComparaison = `${anneeComparaison}-${moisStr}`
      
      const dataComparaison = kpisComparaison.ventesParMois.get(moisKeyComparaison) || { ca: 0, marge: 0, quantite: 0 }
      
      evolutionsMensuelles.push({
        mois: moisKeyCourant,
        ca_evolution_pct: calculerEvolution(dataCourante.ca, dataComparaison.ca),
        marge_evolution_pct: calculerEvolution(dataCourante.marge, dataComparaison.marge),
        quantite_evolution_pct: calculerEvolution(dataCourante.quantite, dataComparaison.quantite)
      })
    })
    
    // Trier par mois
    evolutionsMensuelles.sort((a, b) => a.mois.localeCompare(b.mois))

    const result: EvolutionsResult = {
      periode_courante: {
        debut: params.date_debut_courante,
        fin: params.date_fin_courante
      },
      periode_comparaison: {
        debut: params.date_debut_comparaison,
        fin: params.date_fin_comparaison
      },
      evolutions_globales: evolutionsGlobales,
      evolutions_mensuelles: evolutionsMensuelles
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
function generateSqlString(params: EvolutionsParams): string {
  const conditions: string[] = ["p.statut = 'ACTIF'"]
  
  if (params.pharmacie_id) conditions.push(`p.pharmacie_id = ${params.pharmacie_id}`)
  if (params.fournisseur_id) conditions.push(`pa.fournisseur_id = ${params.fournisseur_id}`)
  if (params.famille_id) conditions.push(`p.famille_id = ${params.famille_id}`)
  if (params.ean13) conditions.push(`p.ean13_principal = '${params.ean13}'`)

  const whereClause = conditions.join(' AND ')

  return `
-- PÉRIODE COURANTE (${params.date_debut_courante} au ${params.date_fin_courante})
SELECT 
  SUM(pv.prix_vente_ttc * vm.quantite_vendue) as ca_courante,
  SUM((pv.prix_vente_ttc - pa.prix_net_ht * (1 + p.tva/100)) * vm.quantite_vendue) as marge_courante,
  SUM(vm.quantite_vendue) as quantite_courante
FROM ventes_mensuelles vm
  JOIN produits p ON vm.produit_id = p.id
  JOIN prix_vente pv ON p.id = pv.produit_id
  JOIN prix_achats pa ON p.id = pa.produit_id
WHERE ${whereClause}
  AND vm.annee BETWEEN EXTRACT(YEAR FROM '${params.date_debut_courante}'::date) 
  AND EXTRACT(YEAR FROM '${params.date_fin_courante}'::date)

UNION ALL

-- PÉRIODE COMPARAISON (${params.date_debut_comparaison} au ${params.date_fin_comparaison})
SELECT 
  SUM(pv.prix_vente_ttc * vm.quantite_vendue) as ca_comparaison,
  SUM((pv.prix_vente_ttc - pa.prix_net_ht * (1 + p.tva/100)) * vm.quantite_vendue) as marge_comparaison,
  SUM(vm.quantite_vendue) as quantite_comparaison
FROM ventes_mensuelles vm
  JOIN produits p ON vm.produit_id = p.id
  JOIN prix_vente pv ON p.id = pv.produit_id
  JOIN prix_achats pa ON p.id = pa.produit_id
WHERE ${whereClause}
  AND vm.annee BETWEEN EXTRACT(YEAR FROM '${params.date_debut_comparaison}'::date) 
  AND EXTRACT(YEAR FROM '${params.date_fin_comparaison}'::date)
  `.trim()
}