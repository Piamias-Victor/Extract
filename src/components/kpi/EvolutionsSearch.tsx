'use client'

import { useState } from 'react'
import { useEvolutions } from '@/hooks/kpis/useEvolutions'
import { useFournisseurs } from '@/hooks/kpis/useFournisseurs'
import { JsonDisplay } from '@/components/ui/JsonDisplay'
import { SqlLogger } from '@/components/ui/SqlLogger'
import type { EvolutionsParams } from '@/lib/queries/evolutions'

export function EvolutionsSearch(): React.ReactElement {
  const { result, loading, error, sql, executionTime, calculateEvolutions } = useEvolutions()
  const { fournisseurs, loading: loadingFournisseurs } = useFournisseurs()

  const [params, setParams] = useState<EvolutionsParams>({
    // Période courante : cette année
    date_debut_courante: new Date().getFullYear() + '-01-01',
    date_fin_courante: new Date().getFullYear() + '-12-31',
    // Période comparaison : année dernière
    date_debut_comparaison: (new Date().getFullYear() - 1) + '-01-01',
    date_fin_comparaison: (new Date().getFullYear() - 1) + '-12-31'
  })

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    await calculateEvolutions(params)
  }

  const handleParamChange = (key: keyof EvolutionsParams, value: string | number | undefined): void => {
    setParams(prev => ({
      ...prev,
      [key]: value === '' ? undefined : value
    }))
  }

  const formatEvolution = (value: number | "N/A"): string => {
    if (value === "N/A") return "N/A"
    const sign = value >= 0 ? "+" : ""
    return `${sign}${value.toFixed(1)}%`
  }

  const formatEvolutionPoints = (value: number | "N/A"): string => {
    if (value === "N/A") return "N/A"
    const sign = value >= 0 ? "+" : ""
    return `${sign}${value.toFixed(1)} pts`
  }

  const getEvolutionColor = (value: number | "N/A"): string => {
    if (value === "N/A") return "text-gray-500"
    return value >= 0 ? "text-green-600" : "text-red-600"
  }

  return (
    <div className="space-y-6">
      {/* Formulaire de paramètres */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Paramètres des Évolutions :</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Période courante */}
          <div className="bg-blue-50 p-4 rounded-md">
            <h4 className="font-medium text-blue-900 mb-3">Période Courante :</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="date-debut-courante" className="block text-sm font-medium text-gray-700 mb-1">
                  Date début <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="date-debut-courante"
                  value={params.date_debut_courante}
                  onChange={(e) => handleParamChange('date_debut_courante', e.target.value)}
                  required
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div>
                <label htmlFor="date-fin-courante" className="block text-sm font-medium text-gray-700 mb-1">
                  Date fin <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="date-fin-courante"
                  value={params.date_fin_courante}
                  onChange={(e) => handleParamChange('date_fin_courante', e.target.value)}
                  required
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>
          </div>

          {/* Période de comparaison */}
          <div className="bg-gray-50 p-4 rounded-md">
            <h4 className="font-medium text-gray-900 mb-3">Période de Comparaison :</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="date-debut-comparaison" className="block text-sm font-medium text-gray-700 mb-1">
                  Date début <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="date-debut-comparaison"
                  value={params.date_debut_comparaison}
                  onChange={(e) => handleParamChange('date_debut_comparaison', e.target.value)}
                  required
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div>
                <label htmlFor="date-fin-comparaison" className="block text-sm font-medium text-gray-700 mb-1">
                  Date fin <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="date-fin-comparaison"
                  value={params.date_fin_comparaison}
                  onChange={(e) => handleParamChange('date_fin_comparaison', e.target.value)}
                  required
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Filtres optionnels */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Filtres (optionnels) :</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="pharmacie-id" className="block text-sm font-medium text-gray-700 mb-1">
                ID Pharmacie
              </label>
              <input
                type="number"
                id="pharmacie-id"
                value={params.pharmacie_id || ''}
                onChange={(e) => handleParamChange('pharmacie_id', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="Ex: 1"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            <div>
              <label htmlFor="fournisseur-select" className="block text-sm font-medium text-gray-700 mb-1">
                Fournisseur
              </label>
              <select
                id="fournisseur-select"
                value={params.fournisseur_id || ''}
                onChange={(e) => handleParamChange('fournisseur_id', e.target.value ? Number(e.target.value) : undefined)}
                disabled={loadingFournisseurs}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:opacity-50"
              >
                <option value="">Tous les fournisseurs</option>
                {fournisseurs.map((fournisseur) => (
                  <option key={fournisseur.id} value={fournisseur.id}>
                    {fournisseur.nom_fournisseur} ({fournisseur.code_fournisseur})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="famille-id" className="block text-sm font-medium text-gray-700 mb-1">
                ID Famille
              </label>
              <input
                type="number"
                id="famille-id"
                value={params.famille_id || ''}
                onChange={(e) => handleParamChange('famille_id', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="Ex: 15"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            <div>
              <label htmlFor="ean13" className="block text-sm font-medium text-gray-700 mb-1">
                EAN13
              </label>
              <input
                type="text"
                id="ean13"
                value={params.ean13 || ''}
                onChange={(e) => handleParamChange('ean13', e.target.value)}
                placeholder="Ex: 3401597803451"
                maxLength={13}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Calcul en cours...' : 'Calculer Évolutions'}
        </button>
      </form>

      {/* Gestion des erreurs */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Affichage des résultats */}
      {result && (
        <>
          {/* Résumé des périodes */}
          <div className="bg-orange-50 p-4 rounded-md">
            <h4 className="font-medium text-orange-900 mb-2">Périodes comparées :</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Période courante:</span>
                <span className="ml-2 text-blue-700">
                  {result.periode_courante.debut} au {result.periode_courante.fin}
                </span>
              </div>
              <div>
                <span className="font-medium">Période de comparaison:</span>
                <span className="ml-2 text-gray-700">
                  {result.periode_comparaison.debut} au {result.periode_comparaison.fin}
                </span>
              </div>
            </div>
          </div>

          {/* Évolutions globales */}
          <div className="bg-white border rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b">
              <h4 className="font-medium text-gray-900">Évolutions Globales</h4>
            </div>
            
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* CA TTC */}
                <div className="bg-blue-50 p-4 rounded-md">
                  <h5 className="font-medium text-blue-900 mb-2">CA TTC</h5>
                  <div className="space-y-1 text-sm">
                    <div>
                      <span className="text-gray-600">Courante:</span>
                      <span className="ml-2 font-medium">{result.evolutions_globales.ca_ttc.periode_courante.toLocaleString('fr-FR')} €</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Comparaison:</span>
                      <span className="ml-2">{result.evolutions_globales.ca_ttc.periode_comparaison.toLocaleString('fr-FR')} €</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Évolution:</span>
                      <span className={`ml-2 font-bold ${getEvolutionColor(result.evolutions_globales.ca_ttc.evolution_pct)}`}>
                        {formatEvolution(result.evolutions_globales.ca_ttc.evolution_pct)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Marge TTC */}
                <div className="bg-green-50 p-4 rounded-md">
                  <h5 className="font-medium text-green-900 mb-2">Marge TTC</h5>
                  <div className="space-y-1 text-sm">
                    <div>
                      <span className="text-gray-600">Courante:</span>
                      <span className="ml-2 font-medium">{result.evolutions_globales.marge_ttc.periode_courante.toLocaleString('fr-FR')} €</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Comparaison:</span>
                      <span className="ml-2">{result.evolutions_globales.marge_ttc.periode_comparaison.toLocaleString('fr-FR')} €</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Évolution:</span>
                      <span className={`ml-2 font-bold ${getEvolutionColor(result.evolutions_globales.marge_ttc.evolution_pct)}`}>
                        {formatEvolution(result.evolutions_globales.marge_ttc.evolution_pct)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Taux de Marge */}
                <div className="bg-yellow-50 p-4 rounded-md">
                  <h5 className="font-medium text-yellow-900 mb-2">Taux de Marge</h5>
                  <div className="space-y-1 text-sm">
                    <div>
                      <span className="text-gray-600">Courante:</span>
                      <span className="ml-2 font-medium">{result.evolutions_globales.taux_marge.periode_courante}%</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Comparaison:</span>
                      <span className="ml-2">{result.evolutions_globales.taux_marge.periode_comparaison}%</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Évolution:</span>
                      <span className={`ml-2 font-bold ${getEvolutionColor(result.evolutions_globales.taux_marge.evolution_points)}`}>
                        {formatEvolutionPoints(result.evolutions_globales.taux_marge.evolution_points)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quantité */}
                <div className="bg-purple-50 p-4 rounded-md">
                  <h5 className="font-medium text-purple-900 mb-2">Quantité</h5>
                  <div className="space-y-1 text-sm">
                    <div>
                      <span className="text-gray-600">Courante:</span>
                      <span className="ml-2 font-medium">{result.evolutions_globales.quantite.periode_courante.toLocaleString('fr-FR')}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Comparaison:</span>
                      <span className="ml-2">{result.evolutions_globales.quantite.periode_comparaison.toLocaleString('fr-FR')}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Évolution:</span>
                      <span className={`ml-2 font-bold ${getEvolutionColor(result.evolutions_globales.quantite.evolution_pct)}`}>
                        {formatEvolution(result.evolutions_globales.quantite.evolution_pct)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Évolutions mensuelles */}
          {result.evolutions_mensuelles.length > 0 && (
            <div className="bg-white border rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b">
                <h4 className="font-medium text-gray-900">Évolutions Mensuelles</h4>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Mois</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">CA Évolution</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Marge Évolution</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Quantité Évolution</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {result.evolutions_mensuelles.map((evolution, index) => (
                      <tr key={evolution.mois} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-3 py-2 text-sm font-medium text-gray-900">{evolution.mois}</td>
                        <td className={`px-3 py-2 text-sm text-right font-medium ${getEvolutionColor(evolution.ca_evolution_pct)}`}>
                          {formatEvolution(evolution.ca_evolution_pct)}
                        </td>
                        <td className={`px-3 py-2 text-sm text-right font-medium ${getEvolutionColor(evolution.marge_evolution_pct)}`}>
                          {formatEvolution(evolution.marge_evolution_pct)}
                        </td>
                        <td className={`px-3 py-2 text-sm text-right font-medium ${getEvolutionColor(evolution.quantite_evolution_pct)}`}>
                          {formatEvolution(evolution.quantite_evolution_pct)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <JsonDisplay
            result={{
              data: result,
              sql: sql || undefined,
              executionTime: executionTime || undefined,
              count: 1
            }}
            loading={loading}
          />
          
          <SqlLogger sql={sql} />
        </>
      )}
    </div>
  )
}