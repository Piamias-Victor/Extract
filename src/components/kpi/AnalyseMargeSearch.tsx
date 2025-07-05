'use client'

import { useState } from 'react'
import { useAnalyseMarge } from '@/hooks/kpis/useAnalyseMarge'
import { useFournisseurs } from '@/hooks/kpis/useFournisseurs'
import { JsonDisplay } from '@/components/ui/JsonDisplay'
import { SqlLogger } from '@/components/ui/SqlLogger'
import type { AnalyseMargeParams } from '@/lib/queries/analyse-marge'

export function AnalyseMargeSearch(): React.ReactElement {
  const { result, loading, error, sql, executionTime, analyserMarge } = useAnalyseMarge()
  const { fournisseurs, loading: loadingFournisseurs } = useFournisseurs()

  const [params, setParams] = useState<AnalyseMargeParams>({
    seuil_marge: 20,
    mode: "dessous"
  })

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    await analyserMarge(params)
  }

  const handleParamChange = (key: keyof AnalyseMargeParams, value: string | number | undefined): void => {
    setParams(prev => ({
      ...prev,
      [key]: value === '' ? undefined : value
    }))
  }

  const handleModeChange = (mode: "dessous" | "dessus"): void => {
    setParams(prev => ({ ...prev, mode }))
  }

  const getModeColor = (mode: "dessous" | "dessus"): string => {
    return mode === "dessous" ? "text-red-600" : "text-green-600"
  }

  const getMargeColor = (marge: number): string => {
    if (marge < 15) return "text-red-600"
    if (marge < 25) return "text-yellow-600"
    return "text-green-600"
  }

  return (
    <div className="space-y-6">
      {/* Formulaire de paramètres */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Paramètres de l'Analyse Marge :</h3>
        
        {/* Mode d'analyse */}
        <div className="bg-indigo-50 p-4 rounded-md">
          <h4 className="font-medium text-indigo-900 mb-3">Mode d'analyse :</h4>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="mode"
                value="dessous"
                checked={params.mode === "dessous"}
                onChange={(e) => handleModeChange(e.target.value as "dessous")}
                className="mr-2"
              />
              <span className="text-red-700 font-medium">Produits EN DESSOUS du seuil</span>
              <span className="text-gray-500 ml-2">(marges faibles à surveiller)</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="mode"
                value="dessus"
                checked={params.mode === "dessus"}
                onChange={(e) => handleModeChange(e.target.value as "dessus")}
                className="mr-2"
              />
              <span className="text-green-700 font-medium">Produits AU DESSUS du seuil</span>
              <span className="text-gray-500 ml-2">(marges élevées performantes)</span>
            </label>
          </div>
        </div>

        {/* Seuil de marge */}
        <div>
          <label htmlFor="seuil-marge" className="block text-sm font-medium text-gray-700 mb-1">
            Seuil de marge <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              id="seuil-marge"
              value={params.seuil_marge}
              onChange={(e) => handleParamChange('seuil_marge', Number(e.target.value))}
              min="0"
              max="100"
              step="0.1"
              required
              className="w-32 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <span className="text-gray-700 font-medium">%</span>
            <span className={`text-sm ${getModeColor(params.mode)}`}>
              → Chercher les produits {params.mode === "dessous" ? "< " : "> "}{params.seuil_marge}%
            </span>
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
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
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
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Analyse en cours...' : 'Analyser les Marges'}
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
          {/* Résumé de l'analyse */}
          <div className="bg-indigo-50 p-4 rounded-md">
            <h4 className="font-medium text-indigo-900 mb-2">Résumé de l'analyse :</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">Critère:</span>
                <span className={`ml-2 ${getModeColor(result.criteres.mode)}`}>
                  {result.criteres.mode === "dessous" ? "< " : "> "}{result.criteres.seuil_marge}%
                </span>
              </div>
              <div>
                <span className="font-medium">Produits trouvés:</span>
                <span className="ml-2 text-indigo-700">{result.total_produits}</span>
              </div>
              <div>
                <span className="font-medium">CA total:</span>
                <span className="ml-2">{result.resume.ca_total.toLocaleString('fr-FR')} €</span>
              </div>
              <div>
                <span className="font-medium">Marge moyenne:</span>
                <span className={`ml-2 font-semibold ${getMargeColor(result.resume.marge_moyenne)}`}>
                  {result.resume.marge_moyenne}%
                </span>
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-600">
              Période d'analyse: {result.criteres.periode_analyse.debut} au {result.criteres.periode_analyse.fin}
            </div>
          </div>

          {/* Tableau des produits */}
          {result.produits_trouves.length > 0 && (
            <div className="bg-white border rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b">
                <h4 className="font-medium text-gray-900">
                  Produits {result.criteres.mode === "dessous" ? "sous" : "au-dessus"} du seuil 
                  (triés par écart au seuil)
                </h4>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">EAN13</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Prix Achat HT</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Prix Vente TTC</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Promo</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">% Marge</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Écart Seuil</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Ventes 12M</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">CA 12M</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {result.produits_trouves.slice(0, 100).map((produit, index) => (
                      <tr key={produit.ean13} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-3 py-2 text-sm font-mono text-gray-900">{produit.ean13}</td>
                        <td className="px-3 py-2 text-sm text-gray-900 max-w-xs truncate" title={produit.nom}>
                          {produit.nom}
                        </td>
                        <td className="px-3 py-2 text-sm text-right text-gray-900">
                          {produit.prix_achat_ht.toFixed(3)} €
                        </td>
                        <td className="px-3 py-2 text-sm text-right text-gray-900">
                          {produit.prix_vente_ttc.toFixed(2)} €
                        </td>
                        <td className="px-3 py-2 text-sm text-right">
                          {produit.prix_promo_ttc ? (
                            <span className="text-red-600 font-medium">
                              {produit.prix_promo_ttc.toFixed(2)} €
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-sm text-right">
                          <span className={`font-bold ${getMargeColor(produit.pourcentage_marge_calcule)}`}>
                            {produit.pourcentage_marge_calcule.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-3 py-2 text-sm text-right">
                          <span className={`font-medium ${
                            produit.ecart_seuil < 0 ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {produit.ecart_seuil > 0 ? '+' : ''}{produit.ecart_seuil.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-3 py-2 text-sm text-right text-gray-900">
                          {produit.ventes_periode}
                        </td>
                        <td className="px-3 py-2 text-sm text-right text-gray-900 font-medium">
                          {produit.ca_periode.toLocaleString('fr-FR')} €
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {result.produits_trouves.length > 100 && (
                <div className="px-4 py-3 bg-gray-50 border-t text-sm text-gray-600">
                  Affichage des 100 premiers produits sur {result.total_produits} trouvés. 
                  Voir le JSON complet ci-dessous pour tous les résultats.
                </div>
              )}
            </div>
          )}

          {result.produits_trouves.length === 0 && (
            <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200">
              <p className="text-yellow-800">
                Aucun produit trouvé {result.criteres.mode === "dessous" ? "en dessous" : "au-dessus"} du seuil de {result.criteres.seuil_marge}% 
                avec les filtres appliqués.
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