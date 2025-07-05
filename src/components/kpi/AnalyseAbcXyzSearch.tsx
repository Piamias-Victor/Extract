'use client'

import { useState } from 'react'
import { useAnalyseAbcXyz } from '@/hooks/kpis/useAnalyseAbcXyz'
import { useFournisseurs } from '@/hooks/kpis/useFournisseurs'
import { JsonDisplay } from '@/components/ui/JsonDisplay'
import { SqlLogger } from '@/components/ui/SqlLogger'
import type { AnalyseAbcXyzParams, ProduitAbcXyz } from '@/lib/queries/analyse-abc-xyz'

export function AnalyseAbcXyzSearch(): React.ReactElement {
  const { result, loading, error, sql, executionTime, analyserAbcXyz } = useAnalyseAbcXyz()
  const { fournisseurs, loading: loadingFournisseurs } = useFournisseurs()

  const [params, setParams] = useState<AnalyseAbcXyzParams>({
    date_debut: (() => {
      const date = new Date()
      date.setMonth(date.getMonth() - 12)
      return date.toISOString().split('T')[0]
    })(),
    date_fin: new Date().toISOString().split('T')[0],
    // Seuils par défaut
    seuil_abc_a: 80,
    seuil_abc_b: 95,
    seuil_xyz_x: 0.5,
    seuil_xyz_y: 1.0
  })

  const [selectedQuadrant, setSelectedQuadrant] = useState<string>('')

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    await analyserAbcXyz(params)
  }

  const handleParamChange = (key: keyof AnalyseAbcXyzParams, value: string | number | undefined): void => {
    setParams(prev => ({
      ...prev,
      [key]: value === '' ? undefined : value
    }))
  }

  const getQuadrantColor = (classification: string): string => {
    const colorMap: { [key: string]: string } = {
      'AX': 'bg-red-100 border-red-300 text-red-800',      // Priorité absolue
      'AY': 'bg-orange-100 border-orange-300 text-orange-800', // Surveillance renforcée
      'AZ': 'bg-yellow-100 border-yellow-300 text-yellow-800', // Vigilance
      'BX': 'bg-blue-100 border-blue-300 text-blue-800',    // Standard optimisé
      'BY': 'bg-gray-100 border-gray-300 text-gray-800',    // Standard
      'BZ': 'bg-purple-100 border-purple-300 text-purple-800', // Réactif
      'CX': 'bg-green-100 border-green-300 text-green-800', // Automatisation
      'CY': 'bg-slate-100 border-slate-300 text-slate-800', // Minimal
      'CZ': 'bg-pink-100 border-pink-300 text-pink-800'     // Déréférencement
    }
    return colorMap[classification] || 'bg-gray-100 border-gray-300 text-gray-800'
  }

  const getQuadrantIcon = (classification: string): string => {
    const iconMap: { [key: string]: string } = {
      'AX': '🔴', 'AY': '🟠', 'AZ': '🟡',
      'BX': '🔵', 'BY': '⚪', 'BZ': '🟣',
      'CX': '🟢', 'CY': '⚫', 'CZ': '🔺'
    }
    return iconMap[classification] || '⚪'
  }

  const renderMatriceResume = () => {
    if (!result) return null

    const quadrants = ['AX', 'AY', 'AZ', 'BX', 'BY', 'BZ', 'CX', 'CY', 'CZ']
    
    return (
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-lg border">
        <h4 className="font-bold text-indigo-900 mb-4 text-center">🎯 Matrice ABC/XYZ - Vue d'ensemble</h4>
        
        {/* Grille 3x3 */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {/* En-têtes */}
          <div></div>
          <div className="text-center font-bold text-green-700">X (Régulier)</div>
          <div className="text-center font-bold text-orange-700">Y (Irrégulier)</div>
          <div className="text-center font-bold text-red-700">Z (Chaotique)</div>
          
          {/* Ligne A */}
          <div className="text-center font-bold text-red-700 self-center">A<br/>(Forte valeur)</div>
          {['AX', 'AY', 'AZ'].map(quad => {
            const count = result.matrice_abc_xyz[quad as keyof typeof result.matrice_abc_xyz].length
            return (
              <button
                key={quad}
                onClick={() => setSelectedQuadrant(selectedQuadrant === quad ? '' : quad)}
                className={`p-3 rounded-lg border-2 hover:scale-105 transition-all ${getQuadrantColor(quad)} ${
                  selectedQuadrant === quad ? 'ring-4 ring-indigo-300' : ''
                }`}
              >
                <div className="text-xl">{getQuadrantIcon(quad)}</div>
                <div className="font-bold text-lg">{count}</div>
                <div className="text-xs">{quad}</div>
              </button>
            )
          })}
          
          {/* Ligne B */}
          <div className="text-center font-bold text-orange-700 self-center">B<br/>(Valeur moyenne)</div>
          {['BX', 'BY', 'BZ'].map(quad => {
            const count = result.matrice_abc_xyz[quad as keyof typeof result.matrice_abc_xyz].length
            return (
              <button
                key={quad}
                onClick={() => setSelectedQuadrant(selectedQuadrant === quad ? '' : quad)}
                className={`p-3 rounded-lg border-2 hover:scale-105 transition-all ${getQuadrantColor(quad)} ${
                  selectedQuadrant === quad ? 'ring-4 ring-indigo-300' : ''
                }`}
              >
                <div className="text-xl">{getQuadrantIcon(quad)}</div>
                <div className="font-bold text-lg">{count}</div>
                <div className="text-xs">{quad}</div>
              </button>
            )
          })}
          
          {/* Ligne C */}
          <div className="text-center font-bold text-green-700 self-center">C<br/>(Faible valeur)</div>
          {['CX', 'CY', 'CZ'].map(quad => {
            const count = result.matrice_abc_xyz[quad as keyof typeof result.matrice_abc_xyz].length
            return (
              <button
                key={quad}
                onClick={() => setSelectedQuadrant(selectedQuadrant === quad ? '' : quad)}
                className={`p-3 rounded-lg border-2 hover:scale-105 transition-all ${getQuadrantColor(quad)} ${
                  selectedQuadrant === quad ? 'ring-4 ring-indigo-300' : ''
                }`}
              >
                <div className="text-xl">{getQuadrantIcon(quad)}</div>
                <div className="font-bold text-lg">{count}</div>
                <div className="text-xs">{quad}</div>
              </button>
            )
          })}
        </div>

        {/* Légende */}
        <div className="text-xs text-gray-600 text-center">
          💡 Cliquez sur une case pour voir les produits de ce quadrant
        </div>
      </div>
    )
  }

  const renderQuadrantDetail = () => {
    if (!result || !selectedQuadrant) return null

    const produits = result.matrice_abc_xyz[selectedQuadrant as keyof typeof result.matrice_abc_xyz]
    if (produits.length === 0) return null

    const premierProduit = produits[0]

    return (
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className={`px-4 py-3 border-b ${getQuadrantColor(selectedQuadrant)}`}>
          <h4 className="font-bold flex items-center gap-2">
            {getQuadrantIcon(selectedQuadrant)} Quadrant {selectedQuadrant} - {produits.length} produit(s)
          </h4>
          <p className="text-sm mt-1">{premierProduit.strategie_recommandee}</p>
        </div>
        
        <div className="overflow-x-auto max-h-96">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">EAN13</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Rang ABC</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">CA Période</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">% CA</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Coeff. Var.</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Stock</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions prioritaires</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {produits.slice(0, 20).map((produit, index) => (
                <tr key={produit.ean13} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-3 py-2 text-sm font-mono text-gray-900">{produit.ean13}</td>
                  <td className="px-3 py-2 text-sm text-gray-900 max-w-xs truncate" title={produit.nom}>
                    {produit.nom}
                  </td>
                  <td className="px-3 py-2 text-sm text-right">
                    <span className={`font-bold ${
                      produit.rang_abc <= 10 ? 'text-red-600' :
                      produit.rang_abc <= 50 ? 'text-orange-600' :
                      'text-gray-600'
                    }`}>
                      #{produit.rang_abc}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-sm text-right text-gray-900 font-medium">
                    {produit.ca_periode.toLocaleString('fr-FR')} €
                  </td>
                  <td className="px-3 py-2 text-sm text-right">
                    <span className={`font-medium ${
                      produit.pourcentage_ca >= 2 ? 'text-red-600' :
                      produit.pourcentage_ca >= 0.5 ? 'text-orange-600' :
                      'text-gray-600'
                    }`}>
                      {produit.pourcentage_ca.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-3 py-2 text-sm text-right">
                    <span className={`font-medium ${
                      produit.coefficient_variation <= 0.5 ? 'text-green-600' :
                      produit.coefficient_variation <= 1.0 ? 'text-orange-600' :
                      'text-red-600'
                    }`}>
                      {produit.coefficient_variation.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-sm text-right text-gray-900">
                    {produit.stock_actuel}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-700">
                    <ul className="text-xs space-y-1">
                      {produit.actions_prioritaires.slice(0, 2).map((action, i) => (
                        <li key={i}>• {action}</li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {produits.length > 20 && (
          <div className="px-4 py-3 bg-gray-50 border-t text-sm text-gray-600">
            Affichage des 20 premiers produits sur {produits.length} dans ce quadrant.
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Formulaire de paramètres */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Paramètres de l'Analyse ABC/XYZ :</h3>
        
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
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Configuration des seuils */}
        <div className="bg-indigo-50 p-4 rounded-md">
          <h4 className="font-medium text-indigo-900 mb-3">Configuration des seuils (optionnel) :</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Seuils ABC */}
            <div>
              <h5 className="text-sm font-medium text-gray-700 mb-2">Seuils ABC (par CA cumulé) :</h5>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-600 w-20">Classe A :</label>
                  <input
                    type="number"
                    value={params.seuil_abc_a || 80}
                    onChange={(e) => handleParamChange('seuil_abc_a', Number(e.target.value))}
                    min="50"
                    max="95"
                    className="w-16 p-1 text-sm border rounded"
                  />
                  <span className="text-sm text-gray-600">% du CA</span>
                </div>
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-600 w-20">Classe B :</label>
                  <input
                    type="number"
                    value={params.seuil_abc_b || 95}
                    onChange={(e) => handleParamChange('seuil_abc_b', Number(e.target.value))}
                    min="85"
                    max="99"
                    className="w-16 p-1 text-sm border rounded"
                  />
                  <span className="text-sm text-gray-600">% du CA</span>
                </div>
              </div>
            </div>

            {/* Seuils XYZ */}
            <div>
              <h5 className="text-sm font-medium text-gray-700 mb-2">Seuils XYZ (coefficient de variation) :</h5>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-600 w-20">Classe X :</label>
                  <input
                    type="number"
                    value={params.seuil_xyz_x || 0.5}
                    onChange={(e) => handleParamChange('seuil_xyz_x', Number(e.target.value))}
                    min="0.1"
                    max="2.0"
                    step="0.1"
                    className="w-16 p-1 text-sm border rounded"
                  />
                  <span className="text-sm text-gray-600">Régulier</span>
                </div>
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-600 w-20">Classe Y :</label>
                  <input
                    type="number"
                    value={params.seuil_xyz_y || 1.0}
                    onChange={(e) => handleParamChange('seuil_xyz_y', Number(e.target.value))}
                    min="0.5"
                    max="3.0"
                    step="0.1"
                    className="w-16 p-1 text-sm border rounded"
                  />
                  <span className="text-sm text-gray-600">Irrégulier</span>
                </div>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            💡 Seuils par défaut : ABC = 80%/95%, XYZ = 0.5/1.0 (valeurs standards de la méthode)
          </p>
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
          {loading ? 'Analyse en cours...' : 'Analyser ABC/XYZ'}
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
          {/* Synthèse globale */}
          <div className="bg-indigo-50 p-4 rounded-md">
            <h4 className="font-medium text-indigo-900 mb-2">Synthèse de l'analyse :</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">CA total analysé:</span>
                <span className="ml-2 text-indigo-700">{result.synthese.ca_total.toLocaleString('fr-FR')} €</span>
              </div>
              <div>
                <span className="font-medium">Produits analysés:</span>
                <span className="ml-2">{result.synthese.nb_produits_total}</span>
              </div>
              <div>
                <span className="font-medium">Répartition ABC:</span>
                <span className="ml-2">A:{result.synthese.repartition_abc.A} | B:{result.synthese.repartition_abc.B} | C:{result.synthese.repartition_abc.C}</span>
              </div>
              <div>
                <span className="font-medium">Répartition XYZ:</span>
                <span className="ml-2">X:{result.synthese.repartition_xyz.X} | Y:{result.synthese.repartition_xyz.Y} | Z:{result.synthese.repartition_xyz.Z}</span>
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-600">
              Période: {result.criteres.periode.debut} au {result.criteres.periode.fin}
            </div>
          </div>

          {/* Recommandations stratégiques */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-md border-l-4 border-green-500">
            <h4 className="font-medium text-green-900 mb-2">📋 Recommandations stratégiques :</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div className="bg-red-100 p-3 rounded">
                <div className="font-bold text-red-800">🔴 Priorité Absolue</div>
                <div className="text-red-700">{result.recommandations_strategiques.priorite_absolue} produits AX</div>
                <div className="text-xs text-red-600">Stock sécurité élevé</div>
              </div>
              <div className="bg-orange-100 p-3 rounded">
                <div className="font-bold text-orange-800">🟠 Surveillance</div>
                <div className="text-orange-700">{result.recommandations_strategiques.surveillance_renforcee} produits AY+AZ</div>
                <div className="text-xs text-orange-600">Suivi renforcé</div>
              </div>
              <div className="bg-green-100 p-3 rounded">
                <div className="font-bold text-green-800">🟢 Automatisation</div>
                <div className="text-green-700">{result.recommandations_strategiques.automatisation_possible} produits BX+CX</div>
                <div className="text-xs text-green-600">Gestion automatique</div>
              </div>
              <div className="bg-pink-100 p-3 rounded">
                <div className="font-bold text-pink-800">🔺 Déréférencement</div>
                <div className="text-pink-700">{result.recommandations_strategiques.candidats_deferencement} produits CZ</div>
                <div className="text-xs text-pink-600">Analyser utilité</div>
              </div>
            </div>
          </div>

          {/* Matrice interactive */}
          {renderMatriceResume()}

          {/* Détail du quadrant sélectionné */}
          {renderQuadrantDetail()}

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