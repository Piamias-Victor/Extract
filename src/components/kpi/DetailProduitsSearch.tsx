'use client'

import { useState } from 'react'
import { useDetailProduits } from '@/hooks/kpis/useDetailProduits'
import { useFournisseurs } from '@/hooks/kpis/useFournisseurs'
import { JsonDisplay } from '@/components/ui/JsonDisplay'
import { SqlLogger } from '@/components/ui/SqlLogger'
import type { DetailProduitsParams } from '@/lib/queries/detail-produits'

export function DetailProduitsSearch(): React.ReactElement {
  const { result, loading, error, sql, executionTime, searchProduits, loadAllProduits } = useDetailProduits()
  const { fournisseurs, loading: loadingFournisseurs } = useFournisseurs()

  const [params, setParams] = useState<DetailProduitsParams>({
    date_debut: (() => {
      const date = new Date()
      date.setMonth(date.getMonth() - 12)
      return date.toISOString().split('T')[0]
    })(),
    date_fin: new Date().toISOString().split('T')[0]
  })

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    await searchProduits(params)
  }

  const handleLoadAll = async (): Promise<void> => {
    // Reset filtres mais garder les dates par défaut
    const defaultDates = {
      date_debut: (() => {
        const date = new Date()
        date.setMonth(date.getMonth() - 12)
        return date.toISOString().split('T')[0]
      })(),
      date_fin: new Date().toISOString().split('T')[0]
    }
    setParams(defaultDates)
    await searchProduits(defaultDates)
  }

  const handleParamChange = (key: keyof DetailProduitsParams, value: string | number | undefined): void => {
    setParams(prev => ({
      ...prev,
      [key]: value === '' ? undefined : value
    }))
  }

  return (
    <div className="space-y-6">
      {/* Contrôles */}
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={handleLoadAll}
          disabled={loading}
          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Chargement...' : 'Charger tous les produits'}
        </button>
        
        <span className="text-gray-500 self-center">ou</span>
        
        <span className="text-gray-700 self-center">Filtrer par critères :</span>
      </div>

      {/* Formulaire de filtres */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Filtres (tous optionnels) :</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Période */}
          <div className="md:col-span-3">
            <h4 className="text-md font-medium text-gray-800 mb-2">Période d'analyse :</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="date-debut" className="block text-sm font-medium text-gray-700 mb-1">
                  Date début <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="date-debut"
                  value={params.date_debut || ''}
                  onChange={(e) => handleParamChange('date_debut', e.target.value)}
                  required
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              <div>
                <label htmlFor="date-fin" className="block text-sm font-medium text-gray-700 mb-1">
                  Date fin <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="date-fin"
                  value={params.date_fin || ''}
                  onChange={(e) => handleParamChange('date_fin', e.target.value)}
                  required
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Filtres produits */}
          <div className="md:col-span-3">
            <h4 className="text-md font-medium text-gray-800 mb-2">Filtres produits :</h4>
          </div>
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
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:opacity-50"
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
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>

          <div>
            <label htmlFor="ean13" className="block text-sm font-medium text-gray-700 mb-1">
              EAN13 spécifique
            </label>
            <input
              type="text"
              id="ean13"
              value={params.ean13 || ''}
              onChange={(e) => handleParamChange('ean13', e.target.value)}
              placeholder="Ex: 3401597803451"
              maxLength={13}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Recherche...' : 'Rechercher avec filtres'}
        </button>
      </form>

      {/* Gestion des erreurs */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Résumé des résultats */}
      {result && (
        <div className="bg-purple-50 p-4 rounded-md">
          <h4 className="font-medium text-purple-900 mb-2">Résumé de l'analyse :</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium">Produits trouvés:</span>
              <span className="ml-2 text-purple-700">{result.total_produits}</span>
            </div>
            <div>
              <span className="font-medium">Période analysée:</span>
              <span className="ml-2">{result.periode_analyse.debut} au {result.periode_analyse.fin}</span>
            </div>
            <div>
              <span className="font-medium">Ventes totales:</span>
              <span className="ml-2 text-purple-700">
                {result.produits.reduce((sum, p) => sum + p.ventes_12_mois, 0).toLocaleString('fr-FR')} unités
              </span>
            </div>
            <div>
              <span className="font-medium">CA total:</span>
              <span className="ml-2 text-purple-700">
                {result.produits.reduce((sum, p) => sum + p.ca_12_mois, 0).toLocaleString('fr-FR')} €
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Affichage des résultats */}
      {result && (
        <>
          {/* Tableau des produits */}
          <div className="bg-white border rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b">
              <h4 className="font-medium text-gray-900">Détail des produits (triés par ventes décroissantes)</h4>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">EAN13</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Prix Achat HT</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Prix Vente TTC</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Promo TTC</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Stock</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">% Marge</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Ventes 12M</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">CA 12M</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {result.produits.slice(0, 50).map((produit, index) => (
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
                            {produit.date_fin_promo && (
                              <div className="text-xs text-gray-500">
                                Fin: {new Date(produit.date_fin_promo).toLocaleDateString('fr-FR')}
                              </div>
                            )}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm text-right text-gray-900">
                        <div>{produit.stock_total}</div>
                        <div className="text-xs text-gray-500">
                          R:{produit.stock_rayon} / Rés:{produit.stock_reserve}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-sm text-right">
                        <span className={`font-medium ${
                          produit.pourcentage_marge > 30 ? 'text-green-600' :
                          produit.pourcentage_marge > 15 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {produit.pourcentage_marge.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-3 py-2 text-sm text-right text-gray-900 font-medium">
                        {produit.ventes_12_mois}
                      </td>
                      <td className="px-3 py-2 text-sm text-right text-gray-900 font-medium">
                        {produit.ca_12_mois.toLocaleString('fr-FR')} €
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {result.produits.length > 50 && (
              <div className="px-4 py-3 bg-gray-50 border-t text-sm text-gray-600">
                Affichage des 50 premiers produits sur {result.total_produits} trouvés. 
                Voir le JSON complet ci-dessous pour tous les résultats.
              </div>
            )}
          </div>

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