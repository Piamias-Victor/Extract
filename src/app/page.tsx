'use client'

import { useState } from 'react'
import type { KpiOption } from '@/types/kpi'
import { FournisseursSearch } from '@/components/kpi/FournisseursSearch'
import { CaTtcSearch } from '@/components/kpi/CaTtcSearch'
import { MargeTtcSearch } from '@/components/kpi/MargeTtcSearch'
import { DetailProduitsSearch } from '@/components/kpi/DetailProduitsSearch'
import { EvolutionsSearch } from '@/components/kpi/EvolutionsSearch'
import { AnalyseMargeSearch } from '@/components/kpi/AnalyseMargeSearch'
import { AnalyseStockSearch } from '@/components/kpi/AnalyseStockSearch'
import { AnalyseParetoSearch } from '@/components/kpi/AnalyseParetoSearch'
import { AnalyseAbcXyzSearch } from '@/components/kpi/AnalyseAbcXyzSearch'
import { AnalyseSaisonnaliteSearch } from '@/components/kpi/AnalyseSaisonnaliteSearch'

export default function HomePage(): React.ReactElement {
  const [selectedKpi, setSelectedKpi] = useState<string>('')

  // Liste des KPIs disponibles
  const availableKpis: KpiOption[] = [
    {
      id: 'fournisseurs',
      label: 'Recherche Fournisseurs',
      description: 'Rechercher et lister tous les fournisseurs avec recherche en temps réel',
      endpoint: '/api/kpis/fournisseurs'
    },
    {
      id: 'ca-ttc',
      label: 'CA TTC Global',
      description: 'Calculer le chiffre d\'affaires TTC avec filtres par pharmacie, fournisseur, famille ou EAN13',
      endpoint: '/api/kpis/ca-ttc'
    },
    {
      id: 'marge-ttc',
      label: 'Marge TTC Global',
      description: 'Calculer la marge TTC et le taux de marge avec les mêmes filtres que le CA',
      endpoint: '/api/kpis/marge-ttc'
    },
    {
      id: 'detail-produits',
      label: 'Détail Produits',
      description: 'Analyse détaillée par produit : prix, stocks, marges, ventes 12 mois avec historique mensuel',
      endpoint: '/api/kpis/detail-produits'
    },
    {
      id: 'evolutions',
      label: 'Évolutions Comparatives',
      description: 'Comparaison entre deux périodes : évolutions du CA, marge, taux de marge et quantités',
      endpoint: '/api/kpis/evolutions'
    },
    {
      id: 'analyse-marge',
      label: 'Analyse Marge par Seuil',
      description: 'Identifier les produits au-dessus ou en-dessous d\'un seuil de marge avec analyse détaillée',
      endpoint: '/api/kpis/analyse-marge'
    },
    {
      id: 'analyse-stock',
      label: 'Analyse Stock par Seuil',
      description: 'Identifier les produits en rupture/sous-stock ou en sur-stock selon un seuil en mois',
      endpoint: '/api/kpis/analyse-stock'
    },
    {
      id: 'analyse-pareto',
      label: 'Analyse Pareto',
      description: 'Analyse Pareto avec seuil personnalisé : X% du CA représenté par combien de références',
      endpoint: '/api/kpis/analyse-pareto'
    },
    {
      id: 'analyse-abc-xyz',
      label: 'Classification ABC/XYZ',
      description: 'Classification intelligente : valeur financière (ABC) + régularité ventes (XYZ) pour optimiser la gestion',
      endpoint: '/api/kpis/analyse-abc-xyz'
    },
    {
      id: 'analyse-saisonnalite',
      label: 'Saisonnalité et Prédictions',
      description: 'Analyse des cycles saisonniers + prédictions des ventes futures pour optimiser les commandes',
      endpoint: '/api/kpis/analyse-saisonnalite'
    }
  ]

  const renderKpiComponent = (): React.ReactElement | null => {
    switch (selectedKpi) {
      case 'fournisseurs':
        return <FournisseursSearch />
      case 'ca-ttc':
        return <CaTtcSearch />
      case 'marge-ttc':
        return <MargeTtcSearch />
      case 'detail-produits':
        return <DetailProduitsSearch />
      case 'evolutions':
        return <EvolutionsSearch />
      case 'analyse-marge':
        return <AnalyseMargeSearch />
      case 'analyse-stock':
        return <AnalyseStockSearch />
      case 'analyse-pareto':
        return <AnalyseParetoSearch />
      case 'analyse-abc-xyz':
        return <AnalyseAbcXyzSearch />
      case 'analyse-saisonnalite':
        return <AnalyseSaisonnaliteSearch />
      default:
        return null
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          PharmaLab - Extracteur de Données
        </h1>

        {/* Sélecteur KPI */}
        <div className="mb-6">
          <label htmlFor="kpi-select" className="block text-sm font-medium text-gray-700 mb-2">
            Type d'extraction :
          </label>
          <select
            id="kpi-select"
            value={selectedKpi}
            onChange={(e) => setSelectedKpi(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Sélectionner un KPI...</option>
            {availableKpis.map((kpi) => (
              <option key={kpi.id} value={kpi.id}>
                {kpi.label}
              </option>
            ))}
          </select>
          {selectedKpi && availableKpis.find(opt => opt.id === selectedKpi) && (
            <p className="text-sm text-gray-600 mt-2">
              {availableKpis.find(opt => opt.id === selectedKpi)?.description}
            </p>
          )}
        </div>

        {/* Rendu du composant KPI sélectionné */}
        {renderKpiComponent()}
      </div>
    </div>
  )
}