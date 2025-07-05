'use client'

import { useState } from 'react'
import { useMargeTtc } from '@/hooks/kpis/useMargeTtc'
import { useFournisseurs } from '@/hooks/kpis/useFournisseurs'
import { JsonDisplay } from '@/components/ui/JsonDisplay'
import { SqlLogger } from '@/components/ui/SqlLogger'
import type { MargeTtcParams } from '@/lib/queries/marge-ttc'

export function MargeTtcSearch(): React.ReactElement {
  const { result, loading, error, sql, executionTime, calculateMargeTtc } = useMargeTtc()
  const { fournisseurs, loading: loadingFournisseurs } = useFournisseurs()

  const [params, setParams] = useState<MargeTtcParams>({
    date_debut: new Date().getFullYear() + '-01-01',
    date_fin: new Date().getFullYear() + '-12-31'
  })

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    await calculateMargeTtc(params)
  }

  const handleParamChange = (key: keyof MargeTtcParams, value: string | number | undefined): void => {
    setParams(prev => ({
      ...prev,
      [key]: value === '' ? undefined : value
    }))
  }

  return (
    <div className="space-y-6">
      {/* Formulaire de paramètres */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Paramètres de la Marge TTC :</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Période obligatoire */}
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
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Filtres optionnels */}
          <div>
            <label htmlFor="pharmacie-id" className="block text-sm font-medium text-gray-700 mb-1">
              ID Pharmacie (optionnel)
            </label>
            <input
              type="number"
              id="pharmacie-id"
              value={params.pharmacie_id || ''}
              onChange={(e) => handleParamChange('pharmacie_id', e.target.value ? Number(e.target.value) : undefined)}
              placeholder="Ex: 1"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="fournisseur-select" className="block text-sm font-medium text-gray-700 mb-1">
              Fournisseur (optionnel)
            </label>
            <select
              id="fournisseur-select"
              value={params.fournisseur_id || ''}
              onChange={(e) => handleParamChange('fournisseur_id', e.target.value ? Number(e.target.value) : undefined)}
              disabled={loadingFournisseurs}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            >
              <option value="">Tous les fournisseurs</option>
              {fournisseurs.map((fournisseur) => (
                <option key={fournisseur.id} value={fournisseur.id}>
                  {fournisseur.nom_fournisseur} ({fournisseur.code_fournisseur})
                </option>
              ))}
            </select>
            {loadingFournisseurs && (
              <p className="text-sm text-gray-500 mt-1">Chargement des fournisseurs...</p>
            )}
          </div>

          <div>
            <label htmlFor="famille-id" className="block text-sm font-medium text-gray-700 mb-1">
              ID Famille (optionnel)
            </label>
            <input
              type="number"
              id="famille-id"
              value={params.famille_id || ''}
              onChange={(e) => handleParamChange('famille_id', e.target.value ? Number(e.target.value) : undefined)}
              placeholder="Ex: 15"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="ean13" className="block text-sm font-medium text-gray-700 mb-1">
              EAN13 (optionnel)
            </label>
            <input
              type="text"
              id="ean13"
              value={params.ean13 || ''}
              onChange={(e) => handleParamChange('ean13', e.target.value)}
              placeholder="Ex: 3401597803451"
              maxLength={13}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Calcul en cours...' : 'Calculer Marge TTC'}
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
          {/* Résumé des indicateurs */}
          <div className="bg-green-50 p-4 rounded-md">
            <h4 className="font-medium text-green-900 mb-2">Indicateurs de marge :</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium">Marge TTC totale:</span>
                <span className="ml-2 text-green-700">{result.marge_ttc_total.toLocaleString('fr-FR')} €</span>
              </div>
              <div>
                <span className="font-medium">CA TTC total:</span>
                <span className="ml-2">{result.ca_ttc_total.toLocaleString('fr-FR')} €</span>
              </div>
              <div>
                <span className="font-medium">Taux de marge moyen:</span>
                <span className="ml-2 text-green-700 font-semibold">{result.taux_marge_moyen}%</span>
              </div>
            </div>
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