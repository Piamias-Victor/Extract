'use client'

import { useState } from 'react'
import { useAnalyseSaisonnalite } from '@/hooks/kpis/useAnalyseSaisonnalite'
import { useFournisseurs } from '@/hooks/kpis/useFournisseurs'
import { JsonDisplay } from '@/components/ui/JsonDisplay'
import { SqlLogger } from '@/components/ui/SqlLogger'
import type { AnalyseSaisonnaliteParams, ProduitSaisonnier } from '@/lib/queries/analyse-saisonnalite'

export function AnalyseSaisonnaliteSearch(): React.ReactElement {
  const { result, loading, error, sql, executionTime, analyserSaisonnalite } = useAnalyseSaisonnalite()
  const { fournisseurs, loading: loadingFournisseurs } = useFournisseurs()

  const [params, setParams] = useState<AnalyseSaisonnaliteParams>({
    periode_historique_annees: 3,
    seuil_amplitude_forte: 1.5,
    seuil_amplitude_moyenne: 0.8,
    nb_mois_prevision: 6
  })

  const [selectedProductEan, setSelectedProductEan] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'synthese' | 'tops' | 'produit' | 'previsions'>('synthese')

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    await analyserSaisonnalite(params)
  }

  const handleParamChange = (key: keyof AnalyseSaisonnaliteParams, value: string | number | undefined): void => {
    setParams(prev => ({
      ...prev,
      [key]: value === '' ? undefined : value
    }))
  }

  const getSaisonnaliteColor = (type: string): string => {
    const colorMap: { [key: string]: string } = {
      'FORTE': 'bg-red-100 border-red-300 text-red-800',
      'MOYENNE': 'bg-orange-100 border-orange-300 text-orange-800',
      'FAIBLE': 'bg-yellow-100 border-yellow-300 text-yellow-800',
      'AUCUNE': 'bg-gray-100 border-gray-300 text-gray-800'
    }
    return colorMap[type] || 'bg-gray-100 border-gray-300 text-gray-800'
  }

  const getSaisonnaliteIcon = (type: string): string => {
    const iconMap: { [key: string]: string } = {
      'FORTE': '🔥',
      'MOYENNE': '🌊', 
      'FAIBLE': '📊',
      'AUCUNE': '➖'
    }
    return iconMap[type] || '➖'
  }

  const getConfidenceColor = (confiance: string): string => {
    const colorMap: { [key: string]: string } = {
      'ELEVEE': 'text-green-600',
      'MOYENNE': 'text-orange-600',
      'FAIBLE': 'text-red-600'
    }
    return colorMap[confiance] || 'text-gray-600'
  }

  const formatMoisAnnee = (moisStr: string): string => {
    const [annee, mois] = moisStr.split('-')
    const nomsMois = [
      "Jan", "Fév", "Mar", "Avr", "Mai", "Jun",
      "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"
    ]
    return `${nomsMois[parseInt(mois) - 1]} ${annee}`
  }

  const renderGraphiqueSaisonnier = (produit: ProduitSaisonnier) => {
    const maxCoeff = Math.max(...produit.coefficients_mensuels.map(c => c.coefficient))
    
    return (
      <div className="bg-white p-4 border rounded-lg">
        <h6 className="font-medium text-gray-900 mb-3">📈 Profil saisonnier - {produit.nom}</h6>
        <div className="grid grid-cols-12 gap-1 mb-2">
          {produit.coefficients_mensuels.map(coeff => (
            <div key={coeff.mois} className="text-center">
              <div 
                className={`h-20 flex items-end justify-center border rounded ${
                  coeff.coefficient >= 1.2 ? 'bg-red-200 border-red-300' :
                  coeff.coefficient >= 0.8 ? 'bg-green-200 border-green-300' :
                  'bg-blue-200 border-blue-300'
                }`}
                style={{ 
                  background: `linear-gradient(to top, currentColor ${(coeff.coefficient / maxCoeff) * 100}%, transparent ${(coeff.coefficient / maxCoeff) * 100}%)`,
                  opacity: 0.7
                }}
              >
                <span className="text-xs font-bold text-gray-800">
                  {coeff.coefficient.toFixed(1)}
                </span>
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {coeff.nom_mois.slice(0, 3)}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>🔴 Pic: {produit.pic_saisonnier.nom_mois} ({produit.pic_saisonnier.coefficient})</span>
          <span>🔵 Creux: {produit.creux_saisonnier.nom_mois} ({produit.creux_saisonnier.coefficient})</span>
        </div>
      </div>
    )
  }

  const renderSynthese = () => {
    if (!result) return null

    return (
      <div className="space-y-4">
        {/* Vue d'ensemble */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border">
          <h4 className="font-bold text-blue-900 mb-3">📊 Synthèse Saisonnalité</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(result.synthese.repartition_saisonnalite).map(([type, count]) => (
              <div key={type} className={`p-3 rounded-lg border-2 ${getSaisonnaliteColor(type.toUpperCase())}`}>
                <div className="text-center">
                  <div className="text-xl">{getSaisonnaliteIcon(type.toUpperCase())}</div>
                  <div className="font-bold text-lg">{count}</div>
                  <div className="text-xs capitalize">{type}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-sm text-blue-800">
            📈 {result.synthese.produits_forte_saisonnalite} produits à forte saisonnalité nécessitent une surveillance critique
          </div>
        </div>

        {/* Période et paramètres */}
        <div className="bg-purple-50 p-4 rounded-lg">
          <h5 className="font-medium text-purple-900 mb-2">⚙️ Paramètres d'analyse :</h5>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium">Historique:</span>
              <span className="ml-2">{result.criteres.periode_historique.nb_annees} années</span>
            </div>
            <div>
              <span className="font-medium">Seuil forte:</span>
              <span className="ml-2">{result.criteres.seuils_amplitude.forte}</span>
            </div>
            <div>
              <span className="font-medium">Seuil moyenne:</span>
              <span className="ml-2">{result.criteres.seuils_amplitude.moyenne}</span>
            </div>
            <div>
              <span className="font-medium">Prévisions:</span>
              <span className="ml-2">{result.criteres.nb_mois_prevision} mois</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderTops = () => {
    if (!result) return null

    return (
      <div className="space-y-6">
        {/* Top forte amplitude */}
        {result.top_saisonniers.plus_forte_amplitude.length > 0 && (
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <h5 className="font-bold text-red-900 mb-3">🔥 Top Amplitudes les plus Fortes</h5>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="text-xs text-gray-500">
                    <th className="text-left">Produit</th>
                    <th className="text-right">Amplitude</th>
                    <th className="text-center">Pic</th>
                    <th className="text-center">Creux</th>
                    <th className="text-right">Ventes/an</th>
                  </tr>
                </thead>
                <tbody>
                  {result.top_saisonniers.plus_forte_amplitude.slice(0, 5).map(produit => (
                    <tr key={produit.ean13} className="border-t border-red-100">
                      <td className="text-sm text-gray-900 truncate max-w-xs" title={produit.nom}>
                        {produit.nom}
                      </td>
                      <td className="text-sm text-right font-bold text-red-700">
                        {produit.amplitude_saisonniere}
                      </td>
                      <td className="text-sm text-center">
                        {produit.pic_saisonnier.nom_mois.slice(0, 3)} ({produit.pic_saisonnier.coefficient})
                      </td>
                      <td className="text-sm text-center">
                        {produit.creux_saisonnier.nom_mois.slice(0, 3)} ({produit.creux_saisonnier.coefficient})
                      </td>
                      <td className="text-sm text-right">
                        {produit.ventes_moyennes_annuelles.toFixed(0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pics hiver/été */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Pics hiver */}
          {result.top_saisonniers.pics_hiver.length > 0 && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h5 className="font-bold text-blue-900 mb-3">❄️ Pics Hiver (Nov-Fév)</h5>
              <div className="space-y-2">
                {result.top_saisonniers.pics_hiver.slice(0, 3).map(produit => (
                  <div key={produit.ean13} className="flex justify-between items-center text-sm">
                    <span className="truncate max-w-32" title={produit.nom}>{produit.nom}</span>
                    <span className="font-bold text-blue-700">
                      {produit.pic_saisonnier.nom_mois} ({produit.pic_saisonnier.coefficient})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pics été */}
          {result.top_saisonniers.pics_ete.length > 0 && (
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <h5 className="font-bold text-yellow-900 mb-3">☀️ Pics Été (Jun-Aoû)</h5>
              <div className="space-y-2">
                {result.top_saisonniers.pics_ete.slice(0, 3).map(produit => (
                  <div key={produit.ean13} className="flex justify-between items-center text-sm">
                    <span className="truncate max-w-32" title={produit.nom}>{produit.nom}</span>
                    <span className="font-bold text-yellow-700">
                      {produit.pic_saisonnier.nom_mois} ({produit.pic_saisonnier.coefficient})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Plus impactants CA */}
        {result.top_saisonniers.plus_impactants_ca.length > 0 && (
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h5 className="font-bold text-green-900 mb-3">💰 Plus Impactants sur le CA</h5>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="text-xs text-gray-500">
                    <th className="text-left">Produit</th>
                    <th className="text-center">Type</th>
                    <th className="text-right">Ventes/an</th>
                    <th className="text-center">Pic</th>
                    <th className="text-right">Surveillance</th>
                  </tr>
                </thead>
                <tbody>
                  {result.top_saisonniers.plus_impactants_ca.slice(0, 5).map(produit => (
                    <tr key={produit.ean13} className="border-t border-green-100">
                      <td className="text-sm text-gray-900 truncate max-w-xs" title={produit.nom}>
                        {produit.nom}
                      </td>
                      <td className="text-sm text-center">
                        <span className={`px-2 py-1 rounded text-xs ${getSaisonnaliteColor(produit.type_saisonnalite)}`}>
                          {getSaisonnaliteIcon(produit.type_saisonnalite)} {produit.type_saisonnalite}
                        </span>
                      </td>
                      <td className="text-sm text-right font-medium">
                        {produit.ventes_moyennes_annuelles.toFixed(0)}
                      </td>
                      <td className="text-sm text-center">
                        {produit.pic_saisonnier.nom_mois.slice(0, 3)}
                      </td>
                      <td className="text-sm text-right">
                        <span className={`px-2 py-1 rounded text-xs ${
                          produit.niveau_surveillance === 'CRITIQUE' ? 'bg-red-100 text-red-800' :
                          produit.niveau_surveillance === 'IMPORTANT' ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {produit.niveau_surveillance}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderDetailProduit = () => {
    if (!result || !selectedProductEan) return null

    const produit = result.produits_saisonniers.find(p => p.ean13 === selectedProductEan)
    if (!produit) return null

    return (
      <div className="space-y-4">
        {/* En-tête produit */}
        <div className={`p-4 rounded-lg border ${getSaisonnaliteColor(produit.type_saisonnalite)}`}>
          <h4 className="font-bold text-lg">
            {getSaisonnaliteIcon(produit.type_saisonnalite)} {produit.nom}
          </h4>
          <p className="text-sm">EAN13: {produit.ean13}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
            <div>
              <span className="font-medium">Type:</span>
              <span className="ml-2">{produit.type_saisonnalite}</span>
            </div>
            <div>
              <span className="font-medium">Amplitude:</span>
              <span className="ml-2 font-bold">{produit.amplitude_saisonniere}</span>
            </div>
            <div>
              <span className="font-medium">Ventes/an:</span>
              <span className="ml-2">{produit.ventes_moyennes_annuelles.toFixed(0)}</span>
            </div>
            <div>
              <span className="font-medium">Stock actuel:</span>
              <span className="ml-2">{produit.stock_actuel}</span>
            </div>
          </div>
        </div>

        {/* Graphique saisonnier */}
        {renderGraphiqueSaisonnier(produit)}

        {/* Recommandations */}
        <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
          <h5 className="font-bold text-indigo-900 mb-3">💡 Recommandations de gestion</h5>
          <ul className="space-y-2">
            {produit.recommandations_gestion.map((rec, index) => (
              <li key={index} className="text-sm text-indigo-800 flex items-start">
                <span className="mr-2">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 text-xs text-indigo-600">
            Niveau de surveillance: 
            <span className={`ml-2 px-2 py-1 rounded ${
              produit.niveau_surveillance === 'CRITIQUE' ? 'bg-red-100 text-red-800' :
              produit.niveau_surveillance === 'IMPORTANT' ? 'bg-orange-100 text-orange-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {produit.niveau_surveillance}
            </span>
          </div>
        </div>

        {/* Tendance */}
        {produit.tendance_annuelle !== 0 && (
          <div className={`p-4 rounded-lg border ${
            produit.tendance_annuelle > 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
            <h5 className="font-bold mb-2">
              📈 Tendance: {produit.tendance_annuelle > 0 ? '+' : ''}{produit.tendance_annuelle.toFixed(1)}% par an
            </h5>
            <p className="text-sm">
              {produit.tendance_annuelle > 5 ? '🚀 Croissance forte - Anticiper la hausse de demande' :
               produit.tendance_annuelle > 0 ? '📈 Croissance modérée' :
               produit.tendance_annuelle < -5 ? '📉 Déclin important - Réduire progressivement' :
               '📊 Déclin modéré'}
            </p>
          </div>
        )}
      </div>
    )
  }

  const renderPrevisions = () => {
    if (!result || !selectedProductEan) return null

    const produit = result.produits_saisonniers.find(p => p.ean13 === selectedProductEan)
    if (!produit) return null

    return (
      <div className="space-y-4">
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border">
          <h4 className="font-bold text-purple-900 mb-3">🔮 Prévisions - {produit.nom}</h4>
          
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-purple-200">
                  <th className="text-left text-xs font-medium text-purple-700 py-2">Mois</th>
                  <th className="text-right text-xs font-medium text-purple-700 py-2">Ventes Prévues</th>
                  <th className="text-right text-xs font-medium text-purple-700 py-2">Stock Mini</th>
                  <th className="text-right text-xs font-medium text-purple-700 py-2">Stock Maxi</th>
                  <th className="text-center text-xs font-medium text-purple-700 py-2">Confiance</th>
                </tr>
              </thead>
              <tbody>
                {produit.previsions_prochains_mois.map(prev => (
                  <tr key={prev.mois} className="border-b border-purple-100">
                    <td className="text-sm py-2 font-medium">
                      {formatMoisAnnee(prev.mois)}
                    </td>
                    <td className="text-sm text-right py-2 font-bold text-purple-900">
                      {prev.ventes_prevues}
                    </td>
                    <td className="text-sm text-right py-2 text-gray-700">
                      {prev.stock_recommande_mini}
                    </td>
                    <td className="text-sm text-right py-2 text-gray-700">
                      {prev.stock_recommande_maxi}
                    </td>
                    <td className="text-sm text-center py-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getConfidenceColor(prev.confiance_prevision)}`}>
                        {prev.confiance_prevision}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 text-xs text-purple-600">
            💡 Stock Mini = 15 jours de ventes | Stock Maxi = 45 jours de ventes
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Formulaire de paramètres */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Paramètres de l'Analyse Saisonnalité :</h3>
        
        {/* Configuration principale */}
        <div className="bg-blue-50 p-4 rounded-md">
          <h4 className="font-medium text-blue-900 mb-3">⚙️ Configuration de l'analyse :</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Historique (années)
              </label>
              <input
                type="number"
                value={params.periode_historique_annees || 3}
                onChange={(e) => handleParamChange('periode_historique_annees', Number(e.target.value))}
                min="1"
                max="10"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Recommandé: 3 ans</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Seuil amplitude forte
              </label>
              <input
                type="number"
                value={params.seuil_amplitude_forte || 1.5}
                onChange={(e) => handleParamChange('seuil_amplitude_forte', Number(e.target.value))}
                min="0.5"
                max="5.0"
                step="0.1"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Écart pic/creux</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Seuil amplitude moyenne
              </label>
              <input
                type="number"
                value={params.seuil_amplitude_moyenne || 0.8}
                onChange={(e) => handleParamChange('seuil_amplitude_moyenne', Number(e.target.value))}
                min="0.2"
                max="3.0"
                step="0.1"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prévisions (mois)
              </label>
              <input
                type="number"
                value={params.nb_mois_prevision || 6}
                onChange={(e) => handleParamChange('nb_mois_prevision', Number(e.target.value))}
                min="1"
                max="24"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Horizon prédiction</p>
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
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
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
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Analyse en cours...' : 'Analyser Saisonnalité'}
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
          {/* Navigation par onglets */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'synthese', label: '📊 Synthèse', description: 'Vue d\'ensemble' },
               { id: 'tops', label: '🏆 Tops', description: 'Classements' },
               { id: 'produit', label: '🔍 Détail Produit', description: 'Analyse individuelle' },
               { id: 'previsions', label: '🔮 Prévisions', description: 'Anticipation' }
             ].map(tab => (
               <button
                 key={tab.id}
                 onClick={() => setActiveTab(tab.id as any)}
                 className={`py-2 px-1 border-b-2 font-medium text-sm ${
                   activeTab === tab.id
                     ? 'border-blue-500 text-blue-600'
                     : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                 }`}
               >
                 {tab.label}
               </button>
             ))}
           </nav>
         </div>

         {/* Contenu des onglets */}
         <div className="mt-6">
           {activeTab === 'synthese' && renderSynthese()}
           {activeTab === 'tops' && renderTops()}
           {activeTab === 'produit' && (
             <div className="space-y-4">
               {/* Sélecteur de produit */}
               <div className="bg-gray-50 p-4 rounded-lg">
                 <label className="block text-sm font-medium text-gray-700 mb-2">
                   Sélectionner un produit pour analyse détaillée :
                 </label>
                 <select
                   value={selectedProductEan}
                   onChange={(e) => setSelectedProductEan(e.target.value)}
                   className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                 >
                   <option value="">Choisir un produit...</option>
                   {result.produits_saisonniers
                     .filter(p => p.type_saisonnalite !== 'AUCUNE')
                     .sort((a, b) => b.amplitude_saisonniere - a.amplitude_saisonniere)
                     .map(produit => (
                       <option key={produit.ean13} value={produit.ean13}>
                         {getSaisonnaliteIcon(produit.type_saisonnalite)} {produit.nom} 
                         (Amplitude: {produit.amplitude_saisonniere})
                       </option>
                     ))}
                 </select>
               </div>
               {renderDetailProduit()}
             </div>
           )}
           {activeTab === 'previsions' && (
             <div className="space-y-4">
               {!selectedProductEan ? (
                 <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                   <p className="text-purple-800">
                     💡 Sélectionnez d'abord un produit dans l'onglet "Détail Produit" pour voir ses prévisions.
                   </p>
                 </div>
               ) : (
                 renderPrevisions()
               )}
             </div>
           )}
         </div>

         {/* Liste complète des produits saisonniers */}
         {result.produits_saisonniers.filter(p => p.type_saisonnalite !== 'AUCUNE').length > 0 && (
           <div className="bg-white border rounded-lg overflow-hidden">
             <div className="px-4 py-3 bg-gray-50 border-b">
               <h4 className="font-medium text-gray-900">
                 🌊 Tous les produits saisonniers ({result.produits_saisonniers.filter(p => p.type_saisonnalite !== 'AUCUNE').length})
               </h4>
             </div>
             
             <div className="overflow-x-auto max-h-96">
               <table className="min-w-full divide-y divide-gray-200">
                 <thead className="bg-gray-50">
                   <tr>
                     <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">EAN13</th>
                     <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
                     <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Type</th>
                     <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amplitude</th>
                     <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Pic</th>
                     <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Creux</th>
                     <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Ventes/an</th>
                     <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Surveillance</th>
                     <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Action</th>
                   </tr>
                 </thead>
                 <tbody className="bg-white divide-y divide-gray-200">
                   {result.produits_saisonniers
                     .filter(p => p.type_saisonnalite !== 'AUCUNE')
                     .sort((a, b) => b.amplitude_saisonniere - a.amplitude_saisonniere)
                     .slice(0, 50)
                     .map((produit, index) => (
                       <tr key={produit.ean13} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                         <td className="px-3 py-2 text-sm font-mono text-gray-900">{produit.ean13}</td>
                         <td className="px-3 py-2 text-sm text-gray-900 max-w-xs truncate" title={produit.nom}>
                           {produit.nom}
                         </td>
                         <td className="px-3 py-2 text-center">
                           <span className={`px-2 py-1 rounded text-xs ${getSaisonnaliteColor(produit.type_saisonnalite)}`}>
                             {getSaisonnaliteIcon(produit.type_saisonnalite)} {produit.type_saisonnalite}
                           </span>
                         </td>
                         <td className="px-3 py-2 text-sm text-right font-bold">
                           {produit.amplitude_saisonniere}
                         </td>
                         <td className="px-3 py-2 text-sm text-center">
                           {produit.pic_saisonnier.nom_mois.slice(0, 3)} 
                           <div className="text-xs text-gray-500">({produit.pic_saisonnier.coefficient})</div>
                         </td>
                         <td className="px-3 py-2 text-sm text-center">
                           {produit.creux_saisonnier.nom_mois.slice(0, 3)}
                           <div className="text-xs text-gray-500">({produit.creux_saisonnier.coefficient})</div>
                         </td>
                         <td className="px-3 py-2 text-sm text-right">
                           {produit.ventes_moyennes_annuelles.toFixed(0)}
                         </td>
                         <td className="px-3 py-2 text-center">
                           <span className={`px-2 py-1 rounded text-xs ${
                             produit.niveau_surveillance === 'CRITIQUE' ? 'bg-red-100 text-red-800' :
                             produit.niveau_surveillance === 'IMPORTANT' ? 'bg-orange-100 text-orange-800' :
                             'bg-gray-100 text-gray-800'
                           }`}>
                             {produit.niveau_surveillance}
                           </span>
                         </td>
                         <td className="px-3 py-2 text-center">
                           <button
                             onClick={() => {
                               setSelectedProductEan(produit.ean13)
                               setActiveTab('produit')
                             }}
                             className="text-blue-600 hover:text-blue-800 text-xs"
                           >
                             Détail
                           </button>
                         </td>
                       </tr>
                     ))}
                 </tbody>
               </table>
             </div>
             
             {result.produits_saisonniers.filter(p => p.type_saisonnalite !== 'AUCUNE').length > 50 && (
               <div className="px-4 py-3 bg-gray-50 border-t text-sm text-gray-600">
                 Affichage des 50 premiers produits saisonniers sur {result.produits_saisonniers.filter(p => p.type_saisonnalite !== 'AUCUNE').length} trouvés.
               </div>
             )}
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