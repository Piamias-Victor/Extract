'use client'

import { useState, useEffect, useMemo } from 'react'
import { BarChart3, Grid3x3, TrendingUp, Target, Zap, Users, Archive, AlertTriangle } from 'lucide-react'
import { useAnalysePareto } from '@/hooks/kpis/useAnalysePareto'
import { useAnalyseAbcXyz } from '@/hooks/kpis/useAnalyseAbcXyz'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Card, CardContent, CardHeader } from '@/components/atoms/Card'
import { Text } from '@/components/atoms/Text'
import { Icon } from '@/components/atoms/Icon'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { cn } from '@/lib/utils'

interface AnalyseTabProps {
  labId: number
  labName: string
}

export function AnalyseTab({ labId, labName }: AnalyseTabProps): React.ReactElement {
  const { result: paretoResult, loading: paretoLoading, analyserPareto } = useAnalysePareto()
  const { result: abcXyzResult, loading: abcXyzLoading, analyserAbcXyz } = useAnalyseAbcXyz()
  
  const [activeSection, setActiveSection] = useState<'pareto' | 'abc-xyz'>('pareto')
  const [seuilPareto, setSeuilPareto] = useState<number>(80)
  const [selectedQuadrant, setSelectedQuadrant] = useState<string>('')

  // Dates par défaut (12 derniers mois)
  const defaultDateFin = new Date().toISOString().split('T')[0]
  const defaultDateDebut = (() => {
    const date = new Date()
    date.setMonth(date.getMonth() - 12)
    return date.toISOString().split('T')[0]
  })()

  // Analyser au montage
  useEffect(() => {
    handleAnalyserPareto()
    handleAnalyserAbcXyz()
  }, [labId])

  // Fonctions d'analyse
  const handleAnalyserPareto = (): void => {
    analyserPareto({
      seuil_pareto: seuilPareto,
      date_debut: defaultDateDebut,
      date_fin: defaultDateFin,
      fournisseur_id: labId
    })
  }

  const handleAnalyserAbcXyz = (): void => {
    analyserAbcXyz({
      date_debut: defaultDateDebut,
      date_fin: defaultDateFin,
      fournisseur_id: labId,
      seuil_abc_a: 80,
      seuil_abc_b: 95,
      seuil_xyz_x: 0.5,
      seuil_xyz_y: 1.0
    })
  }

  // Données pour graphique Pareto
  const paretoChartData = useMemo(() => {
    if (!paretoResult?.produits_pareto) return []
    
    return paretoResult.produits_pareto.slice(0, 20).map(produit => ({
      nom: produit.nom.substring(0, 20) + '...',
      ca: produit.ca_periode,
      pourcentage: produit.pourcentage_ca,
      cumulé: produit.pourcentage_cumule
    }))
  }, [paretoResult])

  // Données pour graphique ABC/XYZ matrice
  const abcXyzMatrixData = useMemo(() => {
    if (!abcXyzResult?.matrice_abc_xyz) return []

    const matrice = abcXyzResult.matrice_abc_xyz
    return [
      { quadrant: 'AX', count: matrice.AX?.length || 0, color: '#dc2626', priority: 'Critique' },
      { quadrant: 'AY', count: matrice.AY?.length || 0, color: '#ea580c', priority: 'Élevée' },
      { quadrant: 'AZ', count: matrice.AZ?.length || 0, color: '#f59e0b', priority: 'Moyenne' },
      { quadrant: 'BX', count: matrice.BX?.length || 0, color: '#10b981', priority: 'Normale' },
      { quadrant: 'BY', count: matrice.BY?.length || 0, color: '#06b6d4', priority: 'Normale' },
      { quadrant: 'BZ', count: matrice.BZ?.length || 0, color: '#8b5cf6', priority: 'Faible' },
      { quadrant: 'CX', count: matrice.CX?.length || 0, color: '#6b7280', priority: 'Faible' },
      { quadrant: 'CY', count: matrice.CY?.length || 0, color: '#9ca3af', priority: 'Très faible' },
      { quadrant: 'CZ', count: matrice.CZ?.length || 0, color: '#d1d5db', priority: 'Très faible' }
    ].filter(item => item.count > 0)
  }, [abcXyzResult])

  // Récupérer les produits du quadrant sélectionné
  const getProduitsQuadrant = (quadrant: string) => {
    if (!abcXyzResult?.matrice_abc_xyz) return []
    return abcXyzResult.matrice_abc_xyz[quadrant as keyof typeof abcXyzResult.matrice_abc_xyz] || []
  }

  const formatPrix = (prix: number): string => {
    return `${prix.toFixed(2)}€`
  }

  const formatPourcentage = (pct: number): string => {
    return `${pct.toFixed(1)}%`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card variant="elevated" className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Icon icon={BarChart3} variant="default" size="md" />
          <Text variant="h3" weight="semibold">
            Analyses Stratégiques - {labName}
          </Text>
        </div>
        
        {/* Navigation entre sections */}
        <div className="flex gap-2">
          <Button
            variant={activeSection === 'pareto' ? 'primary' : 'secondary'}
            onClick={() => setActiveSection('pareto')}
            className="flex items-center gap-2"
          >
            <TrendingUp className="w-4 h-4" />
            Analyse Pareto
          </Button>
          <Button
            variant={activeSection === 'abc-xyz' ? 'primary' : 'secondary'}
            onClick={() => setActiveSection('abc-xyz')}
            className="flex items-center gap-2"
          >
            <Grid3x3 className="w-4 h-4" />
            Classification ABC/XYZ
          </Button>
        </div>
      </Card>

      {/* Section Analyse Pareto */}
      {activeSection === 'pareto' && (
        <>
          {/* Paramètres Pareto */}
          <Card variant="default" className="p-6">
            <Text variant="h4" weight="semibold" className="mb-4">
              🎯 Paramètres Analyse Pareto
            </Text>
            
            <div>
              <Text variant="body" weight="medium" className="mb-2">
                Seuil Pareto (% du CA)
              </Text>
              <div className="space-y-2">
                <input
                  type="range"
                  min={60}
                  max={95}
                  value={seuilPareto}
                  onChange={(e) => {
                    setSeuilPareto(Number(e.target.value))
                    // Relancer l'analyse automatiquement
                    setTimeout(() => handleAnalyserPareto(), 100)
                  }}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>60%</span>
                  <span className="font-semibold text-blue-600">{seuilPareto}%</span>
                  <span>95%</span>
                </div>
              </div>
              <Text variant="caption" color="muted" className="mt-1">
                {seuilPareto}% du CA généré par combien de références ?
              </Text>
            </div>
          </Card>

          {/* KPIs Pareto */}
          {paretoResult && (
            <div className="grid md:grid-cols-4 gap-6">
              <Card variant="elevated" className="p-4 text-center">
                <Icon icon={Target} variant="default" size="lg" className="mx-auto mb-2" />
                <Text variant="h3" weight="bold">
                  {formatPourcentage(paretoResult.analyse.pourcentage_refs)}
                </Text>
                <Text variant="caption" color="muted">% des références</Text>
              </Card>

              <Card variant="elevated" className="p-4 text-center">
                <Icon icon={TrendingUp} variant="success" size="lg" className="mx-auto mb-2" />
                <Text variant="h3" weight="bold" className="text-green-600">
                  {paretoResult.analyse.nb_produits_seuil}
                </Text>
                <Text variant="caption" color="muted">Produits {seuilPareto}%</Text>
              </Card>

              <Card variant="elevated" className="p-4 text-center">
                <Icon icon={Archive} variant="default" size="lg" className="mx-auto mb-2" />
                <Text variant="h3" weight="bold">
                  {paretoResult.analyse.nb_produits_total}
                </Text>
                <Text variant="caption" color="muted">Total produits</Text>
              </Card>

              <Card variant="elevated" className="p-4 text-center">
                <Icon icon={TrendingUp} variant="default" size="lg" className="mx-auto mb-2" />
                <Text variant="h3" weight="bold" className="text-blue-600">
                  {formatPrix(paretoResult.analyse.ca_total)}
                </Text>
                <Text variant="caption" color="muted">CA total</Text>
              </Card>
            </div>
          )}

          {/* Liste complète des produits Pareto */}
          {paretoResult && paretoResult.produits_pareto.length > 0 && (
            <Card variant="elevated">
              <CardHeader>
                <Text variant="h4" weight="semibold">
                  📋 Tous les produits Pareto ({paretoResult.produits_pareto.length})
                </Text>
                <Text variant="caption" color="secondary">
                  Classement par contribution au CA (seuil: {seuilPareto}%)
                </Text>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Rang</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Produit</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">CA Période</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">% CA</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">% Cumulé</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Ventes</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {paretoResult.produits_pareto.map((produit, index) => (
                        <tr 
                          key={produit.ean13}
                          className={cn(
                            "hover:bg-gray-50 transition-colors duration-150",
                            produit.pourcentage_cumule <= seuilPareto ? "bg-blue-50" : ""
                          )}
                        >
                          <td className="px-4 py-3">
                            <Text variant="body" weight="semibold" className="text-blue-600">
                              #{produit.rang}
                            </Text>
                          </td>
                          <td className="px-4 py-3">
                            <Text variant="body" weight="medium" className="max-w-xs truncate" title={produit.nom}>
                              {produit.nom}
                            </Text>
                            <Text variant="caption" color="muted" className="font-mono">
                              {produit.ean13}
                            </Text>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Text variant="body" weight="semibold">
                              {formatPrix(produit.ca_periode)}
                            </Text>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Text variant="body" className="text-green-600">
                              {formatPourcentage(produit.pourcentage_ca)}
                            </Text>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Text 
                              variant="body" 
                              weight="semibold"
                              className={produit.pourcentage_cumule <= seuilPareto ? "text-blue-600" : "text-gray-600"}
                            >
                              {formatPourcentage(produit.pourcentage_cumule)}
                            </Text>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Text variant="body">
                              {produit.ventes_periode}
                            </Text>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Text variant="body">
                              {produit.stock_actuel}
                            </Text>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Section ABC/XYZ */}
      {activeSection === 'abc-xyz' && (
        <>
          {/* Paramètres ABC/XYZ */}
          <Card variant="default" className="p-6">
            <Text variant="h4" weight="semibold" className="mb-4">
              🔬 Classification ABC/XYZ
            </Text>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Text variant="body" weight="medium" className="mb-2">
                  Classification ABC (Valeur financière)
                </Text>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Classe A :</span>
                    <span className="font-semibold text-red-600">80% du CA</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Classe B :</span>
                    <span className="font-semibold text-orange-500">80-95% du CA</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Classe C :</span>
                    <span className="font-semibold text-gray-500">95-100% du CA</span>
                  </div>
                </div>
              </div>

              <div>
                <Text variant="body" weight="medium" className="mb-2">
                  Classification XYZ (Régularité des ventes)
                </Text>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Classe X :</span>
                    <span className="font-semibold text-green-600">CV ≤ 0.5 (régulier)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Classe Y :</span>
                    <span className="font-semibold text-blue-500">0.5 &lt; CV ≤ 1.0 (moyen)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Classe Z :</span>
                    <span className="font-semibold text-purple-500">CV &gt; 1.0 (irrégulier)</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* KPIs ABC/XYZ */}
          {abcXyzResult && (
            <div className="grid md:grid-cols-4 gap-6">
              <Card variant="elevated" className="p-4 text-center">
                <Icon icon={Zap} variant="error" size="lg" className="mx-auto mb-2" />
                <Text variant="h3" weight="bold" className="text-red-600">
                  {abcXyzResult.recommandations_strategiques.priorite_absolue}
                </Text>
                <Text variant="caption" color="muted">Priorité absolue (AX)</Text>
              </Card>

              <Card variant="elevated" className="p-4 text-center">
                <Icon icon={AlertTriangle} variant="warning" size="lg" className="mx-auto mb-2" />
                <Text variant="h3" weight="bold" className="text-orange-500">
                  {abcXyzResult.recommandations_strategiques.surveillance_renforcee}
                </Text>
                <Text variant="caption" color="muted">Surveillance (AY+AZ)</Text>
              </Card>

              <Card variant="elevated" className="p-4 text-center">
                <Icon icon={Users} variant="success" size="lg" className="mx-auto mb-2" />
                <Text variant="h3" weight="bold" className="text-green-600">
                  {abcXyzResult.recommandations_strategiques.automatisation_possible}
                </Text>
                <Text variant="caption" color="muted">Automatisables (BX+CX)</Text>
              </Card>

              <Card variant="elevated" className="p-4 text-center">
                <Icon icon={Archive} variant="default" size="lg" className="mx-auto mb-2" />
                <Text variant="h3" weight="bold" className="text-gray-600">
                  {abcXyzResult.recommandations_strategiques.candidats_deferencement}
                </Text>
                <Text variant="caption" color="muted">Déréférencement (CZ)</Text>
              </Card>
            </div>
          )}

          {/* Matrice ABC/XYZ simplifiée */}
          {abcXyzResult && (
            <Card variant="elevated">
              <CardHeader>
                <Text variant="h4" weight="semibold">
                  🎯 Matrice ABC/XYZ
                </Text>
                <Text variant="caption" color="secondary">
                  Classification croisée : Valeur financière × Régularité des ventes
                </Text>
              </CardHeader>
              <CardContent>
                {/* Grille 3x3 */}
                <div className="grid grid-cols-4 gap-2 mb-6">
                  {/* Header vide */}
                  <div></div>
                  {/* Headers colonnes XYZ */}
                  <div className="text-center font-semibold text-green-600 border-b-2 border-green-600 pb-2">
                    X (Régulier)
                  </div>
                  <div className="text-center font-semibold text-blue-600 border-b-2 border-blue-600 pb-2">
                    Y (Moyen)
                  </div>
                  <div className="text-center font-semibold text-purple-600 border-b-2 border-purple-600 pb-2">
                    Z (Irrégulier)
                  </div>

                  {/* Ligne A */}
                  <div className="font-semibold text-red-600 border-r-2 border-red-600 pr-2 flex items-center">
                    A (80% CA)
                  </div>
                  <div 
                    className="border border-gray-300 p-4 text-center bg-red-50 hover:bg-red-100 cursor-pointer transition-colors"
                    onClick={() => setSelectedQuadrant(selectedQuadrant === 'AX' ? '' : 'AX')}
                  >
                    <div className="font-bold text-lg text-red-600">AX</div>
                    <div className="text-sm text-gray-600">{abcXyzResult.matrice_abc_xyz.AX?.length || 0} produits</div>
                    <div className="text-xs text-red-800 mt-1">Critique</div>
                  </div>
                  <div 
                    className="border border-gray-300 p-4 text-center bg-orange-50 hover:bg-orange-100 cursor-pointer transition-colors"
                    onClick={() => setSelectedQuadrant(selectedQuadrant === 'AY' ? '' : 'AY')}
                  >
                    <div className="font-bold text-lg text-orange-600">AY</div>
                    <div className="text-sm text-gray-600">{abcXyzResult.matrice_abc_xyz.AY?.length || 0} produits</div>
                    <div className="text-xs text-orange-800 mt-1">Important</div>
                  </div>
                  <div 
                    className="border border-gray-300 p-4 text-center bg-yellow-50 hover:bg-yellow-100 cursor-pointer transition-colors"
                    onClick={() => setSelectedQuadrant(selectedQuadrant === 'AZ' ? '' : 'AZ')}
                  >
                    <div className="font-bold text-lg text-yellow-600">AZ</div>
                    <div className="text-sm text-gray-600">{abcXyzResult.matrice_abc_xyz.AZ?.length || 0} produits</div>
                    <div className="text-xs text-yellow-800 mt-1">Surveillance</div>
                  </div>

                  {/* Ligne B */}
                  <div className="font-semibold text-orange-600 border-r-2 border-orange-600 pr-2 flex items-center">
                    B (80-95% CA)
                  </div>
                  <div 
                    className="border border-gray-300 p-4 text-center bg-green-50 hover:bg-green-100 cursor-pointer transition-colors"
                    onClick={() => setSelectedQuadrant(selectedQuadrant === 'BX' ? '' : 'BX')}
                  >
                    <div className="font-bold text-lg text-green-600">BX</div>
                    <div className="text-sm text-gray-600">{abcXyzResult.matrice_abc_xyz.BX?.length || 0} produits</div>
                    <div className="text-xs text-green-800 mt-1">Automatisable</div>
                  </div>
                  <div 
                    className="border border-gray-300 p-4 text-center bg-blue-50 hover:bg-blue-100 cursor-pointer transition-colors"
                    onClick={() => setSelectedQuadrant(selectedQuadrant === 'BY' ? '' : 'BY')}
                  >
                    <div className="font-bold text-lg text-blue-600">BY</div>
                    <div className="text-sm text-gray-600">{abcXyzResult.matrice_abc_xyz.BY?.length || 0} produits</div>
                    <div className="text-xs text-blue-800 mt-1">Standard</div>
                  </div>
                  <div 
                    className="border border-gray-300 p-4 text-center bg-purple-50 hover:bg-purple-100 cursor-pointer transition-colors"
                    onClick={() => setSelectedQuadrant(selectedQuadrant === 'BZ' ? '' : 'BZ')}
                  >
                    <div className="font-bold text-lg text-purple-600">BZ</div>
                    <div className="text-sm text-gray-600">{abcXyzResult.matrice_abc_xyz.BZ?.length || 0} produits</div>
                    <div className="text-xs text-purple-800 mt-1">Attention</div>
                  </div>

                  {/* Ligne C */}
                  <div className="font-semibold text-gray-600 border-r-2 border-gray-600 pr-2 flex items-center">
                    C (95-100% CA)
                  </div>
                  <div 
                    className="border border-gray-300 p-4 text-center bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                    onClick={() => setSelectedQuadrant(selectedQuadrant === 'CX' ? '' : 'CX')}
                  >
                    <div className="font-bold text-lg text-gray-600">CX</div>
                    <div className="text-sm text-gray-600">{abcXyzResult.matrice_abc_xyz.CX?.length || 0} produits</div>
                    <div className="text-xs text-gray-800 mt-1">Routine</div>
                  </div>
                  <div 
                    className="border border-gray-300 p-4 text-center bg-gray-100 hover:bg-gray-200 cursor-pointer transition-colors"
                    onClick={() => setSelectedQuadrant(selectedQuadrant === 'CY' ? '' : 'CY')}
                  >
                    <div className="font-bold text-lg text-gray-700">CY</div>
                    <div className="text-sm text-gray-600">{abcXyzResult.matrice_abc_xyz.CY?.length || 0} produits</div>
                    <div className="text-xs text-gray-800 mt-1">Faible priorité</div>
                  </div>
                  <div 
                    className="border border-gray-300 p-4 text-center bg-gray-200 hover:bg-gray-300 cursor-pointer transition-colors"
                    onClick={() => setSelectedQuadrant(selectedQuadrant === 'CZ' ? '' : 'CZ')}
                  >
                    <div className="font-bold text-lg text-gray-800">CZ</div>
                    <div className="text-sm text-gray-600">{abcXyzResult.matrice_abc_xyz.CZ?.length || 0} produits</div>
                    <div className="text-xs text-gray-800 mt-1">Déréférencement</div>
                  </div>
                </div>

                {/* Note explicative */}
                <div className="text-center text-sm text-gray-600 mb-4">
                  Cliquez sur un carré pour voir les produits de cette classification
                </div>
              </CardContent>
            </Card>
          )}

          {/* Liste des produits du quadrant sélectionné */}
          {selectedQuadrant && abcXyzResult && (
            <Card variant="elevated">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Text variant="h4" weight="semibold">
                    📋 Produits - Classification {selectedQuadrant}
                  </Text>
                  <div className="flex items-center gap-2">
                    <Badge variant="info" size="sm">
                      {getProduitsQuadrant(selectedQuadrant).length} produits
                    </Badge>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setSelectedQuadrant('')}
                    >
                      Fermer
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Produit</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">CA Période</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">% CA</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Ventes</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">CV</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Classification</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {getProduitsQuadrant(selectedQuadrant).map((produit, index) => (
                        <tr key={produit.ean13} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <Text variant="body" weight="medium" className="max-w-xs truncate" title={produit.nom}>
                              {produit.nom}
                            </Text>
                            <Text variant="caption" color="muted" className="font-mono">
                              {produit.ean13}
                            </Text>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Text variant="body" weight="semibold">
                              {formatPrix(produit.ca_periode)}
                            </Text>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Text variant="body" className="text-green-600">
                             {formatPourcentage(produit.pourcentage_ca)}
                           </Text>
                         </td>
                         <td className="px-4 py-3 text-right">
                           <Text variant="body">
                             {produit.ventes_periode}
                           </Text>
                         </td>
                         <td className="px-4 py-3 text-right">
                           <Text variant="body" className={
                             produit.coefficient_variation <= 0.5 ? "text-green-600" :
                             produit.coefficient_variation <= 1.0 ? "text-blue-600" : "text-purple-600"
                           }>
                             {produit.coefficient_variation.toFixed(2)}
                           </Text>
                         </td>
                         <td className="px-4 py-3 text-center">
                           <Badge variant="info" size="sm">
                             {produit.classification_finale}
                           </Badge>
                         </td>
                         <td className="px-4 py-3 text-right">
                           <Text variant="body">
                             {produit.stock_actuel}
                           </Text>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
               {getProduitsQuadrant(selectedQuadrant).length === 0 && (
                 <div className="p-8 text-center">
                   <Text variant="body" color="muted">
                     Aucun produit dans cette classification
                   </Text>
                 </div>
               )}
             </CardContent>
           </Card>
         )}
       </>
     )}
   </div>
 )
}
