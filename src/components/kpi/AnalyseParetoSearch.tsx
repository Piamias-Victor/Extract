'use client'

import { useState } from 'react'
import { useAnalysePareto } from '@/hooks/kpis/useAnalysePareto'
import { useFournisseurs } from '@/hooks/kpis/useFournisseurs'
import { JsonDisplay } from '@/components/ui/JsonDisplay'
import { SqlLogger } from '@/components/ui/SqlLogger'
import type { AnalyseParetoParams } from '@/lib/queries/analyse-pareto'

export function AnalyseParetoSearch(): React.ReactElement {
  const { result, loading, error, sql, executionTime, analyserPareto } = useAnalysePareto()
  const { fournisseurs, loading: loadingFournisseurs } = useFournisseurs()

  const [params, setParams] = useState<AnalyseParetoParams>({
    seuil_pareto: 80,
    date_debut: (() => {
      const date = new Date()
      date.setMonth(date.getMonth() - 12)
      return date.toISOString().split('T')[0]
    })(),
    date_fin: new Date().toISOString().split('T')[0]
  })

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    await analyserPareto(params)
  }

  const handleParamChange = (key: keyof AnalyseParetoParams, value: string | number | undefined): void => {
    setParams(prev => ({
      ...prev,
      [key]: value === '' ? undefined : value
    }))
  }

  return (
    <div className="space-y-6">
      {/* Formulaire de paramètres */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Paramètres de l'Analyse Pareto :</h3>
        
        {/* Seuil Pareto */}
        <div className="bg-teal-50 p-4 rounded-md">
          <h4 className="font-medium text-teal-900 mb-3">Seuil d'analyse Pareto :</h4>
          <div className="flex items-center space-x-4">
            <label htmlFor="seuil-pareto" className="text-sm font-medium text-gray-700">
              Seuil Pareto <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="seuil-pareto"
              value={params.seuil_pareto}
              onChange={(e) => handleParamChange('seuil_pareto', Number(e.target.value))}
              min="1"
              max="100"
              step="1"
              required
              className="w-20 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
            <span className="text-gray-700 font-medium">% du CA</span>
            <span className="text-sm text-teal-700">
              → Afficher les produits qui représentent {params.seuil_pareto}% du chiffre d'affaires
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Exemple: 80% = loi de Pareto classique (80% du CA fait par X% des références)
          </p>
        </div>

        {/* Période d'analyse */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Période d'analyse :</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="date-debut" className="block text-sm font-medium text-gray-700 mb-1">
                Date début <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="date-debut"
                value={params.date_debut}
                onChange={(e) => handleParamChange('date_debut', e.target.value)}
                required
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>

            <div>
              <label htmlFor="date-fin" className="block text-sm font-medium text-gray-700 mb-1">
                Date fin <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="date-fin"
                value={params.date_fin}
                onChange={(e) => handleParamChange('date_fin', e.target.value)}
                required
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
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
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
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
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:opacity-50"
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
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
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
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Analyse en cours...' : 'Analyser Pareto'}
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
          {/* Résumé de l'analyse Pareto */}
          <div className="bg-teal-50 p-4 rounded-md">
            <h4 className="font-medium text-teal-900 mb-2">Résumé de l'analyse Pareto :</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 text-sm">
              <div>
                <span className="font-medium">Seuil analysé:</span>
                <span className="ml-2 text-teal-700 font-bold">{result.criteres.seuil_pareto}%</span>
              </div>
              <div>
                <span className="font-medium">CA total:</span>
                <span className="ml-2">{result.analyse.ca_total.toLocaleString('fr-FR')} €</span>
              </div>
              <div>
                <span className="font-medium">CA du seuil:</span>
                <span className="ml-2 text-teal-700">{result.analyse.ca_seuil.toLocaleString('fr-FR')} €</span>
              </div>
              <div>
                <span className="font-medium">Références totales:</span>
                <span className="ml-2">{result.analyse.nb_produits_total}</span>
              </div>
              <div>
                <span className="font-medium">Refs pour {result.criteres.seuil_pareto}%:</span>
                <span className="ml-2 text-teal-700 font-bold">
                  {result.analyse.nb_produits_seuil} ({result.analyse.pourcentage_refs.toFixed(1)}%)
                </span>
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-600">
              Période: {result.criteres.periode.debut} au {result.criteres.periode.fin}
            </div>
            <div className="mt-2 p-2 bg-white rounded border-l-4 border-teal-500">
              <p className="text-sm text-teal-800 font-medium">
                📊 Interprétation: {result.analyse.pourcentage_refs.toFixed(1)}% des références ({result.analyse.nb_produits_seuil} produits) 
                génèrent {result.criteres.seuil_pareto}% du chiffre d'affaires ({result.analyse.ca_seuil.toLocaleString('fr-FR')} €)
              </p>
            </div>
          </div>

          {/* Tableau des produits Pareto */}
          {result.produits_pareto.length > 0 && (
            <div className="bg-white border rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b">
                <h4 className="font-medium text-gray-900">
                  Produits contribuant à {result.criteres.seuil_pareto}% du CA (triés par rang de contribution)
                </h4>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Rang</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">EAN13</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">CA Période</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">CA Cumulé</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">% CA</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">% Cumulé</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Ventes</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Stock</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {result.produits_pareto.slice(0, 100).map((produit, index) => (
                      <tr 
                        key={produit.ean13} 
                        className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${
                          produit.pourcentage_cumule >= result.criteres.seuil_pareto ? 'bg-teal-50' : ''
                        }`}
                      >
                        <td className="px-3 py-2 text-sm text-center">
                          <span className={`font-bold ${
                            produit.rang <= 10 ? 'text-red-600' :
                            produit.rang <= 50 ? 'text-orange-600' :
                            'text-gray-600'
                          }`}>
                            {produit.rang}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-sm font-mono text-gray-900">{produit.ean13}</td>
                        <td className="px-3 py-2 text-sm text-gray-900 max-w-xs truncate" title={produit.nom}>
                          {produit.nom}
                        </td>
                        <td className="px-3 py-2 text-sm text-right text-gray-900 font-medium">
                          {produit.ca_periode.toLocaleString('fr-FR')} €
                        </td>
                        <td className="px-3 py-2 text-sm text-right text-gray-900">
                          {produit.ca_cumule.toLocaleString('fr-FR')} €
                        </td>
                        <td className="px-3 py-2 text-sm text-right">
                          <span className={`font-medium ${
                            produit.pourcentage_ca >= 5 ? 'text-red-600' :
                            produit.pourcentage_ca >= 2 ? 'text-orange-600' :
                            'text-gray-600'
                          }`}>
                            {produit.pourcentage_ca.toFixed(2)}%
                          </span>
                        </td>
                        <td className="px-3 py-2 text-sm text-right">
                          <span className={`font-bold ${
                            produit.pourcentage_cumule >= result.criteres.seuil_pareto ? 'text-teal-700' : 'text-gray-700'
                          }`}>
                            {produit.pourcentage_cumule.toFixed(2)}%
                          </span>
                        </td>
                        <td className="px-3 py-2 text-sm text-right text-gray-900">
                          {produit.ventes_periode.toLocaleString('fr-FR')}
                        </td>
                        <td className="px-3 py-2 text-sm text-right text-gray-900">
                          {produit.stock_actuel}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {result.produits_pareto.length > 100 && (
                <div className="px-4 py-3 bg-gray-50 border-t text-sm text-gray-600">
                  Affichage des 100 premiers produits sur {result.analyse.nb_produits_seuil} produits du seuil Pareto. 
                  Voir le JSON complet ci-dessous pour tous les résultats.
                </div>
              )}
            </div>
          )}

          {result.produits_pareto.length === 0 && (
            <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200">
              <p className="text-yellow-800">
                Aucun produit trouvé pour {result.criteres.seuil_pareto}% du CA avec les filtres appliqués. 
                Essayez d'élargir la période ou réduire les filtres.
              </p>
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