'use client'

import { useState, useEffect, useMemo } from 'react'
import { Archive, Package, AlertTriangle, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { useAnalyseStock } from '@/hooks/kpis/useAnalyseStock'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { Card, CardContent, CardHeader } from '@/components/atoms/Card'
import { Text } from '@/components/atoms/Text'
import { Icon } from '@/components/atoms/Icon'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { cn } from '@/lib/utils'

interface StockTabProps {
  labId: number
  labName: string
}

type SortField = 'nom' | 'stock_rayon' | 'stock_reserve' | 'stock_total' | 'ventes_mensuelles_moyennes' | 'mois_stock_calcule'
type SortDirection = 'asc' | 'desc'

export function StockTab({ labId, labName }: StockTabProps): React.ReactElement {
  const { result, loading, analyserStock } = useAnalyseStock()
  const [seuilVisuel, setSeuilVisuel] = useState<number>(3) // Seuil pour l'affichage/couleurs
  const [sortField, setSortField] = useState<SortField>('mois_stock_calcule')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  // Analyser au montage - utiliser seuil très faible pour récupérer tous les produits
  useEffect(() => {
    analyserStock({
      seuil_mois_stock: 0.1, // Seuil très bas pour récupérer tous les produits
      mode: 'dessous',
      fournisseur_id: labId
    })
  }, [labId])

  // Fonction pour actualiser les données
  const handleActualiser = (): void => {
    analyserStock({
      seuil_mois_stock: 0.1, // Seuil très bas pour récupérer tous les produits
      mode: 'dessous',
      fournisseur_id: labId
    })
  }

  // Données pour le donut chart basées sur le seuil visuel
  const donutData = useMemo(() => {
    if (!result?.produits_trouves) return []

    const categories = {
      rupture: 0,
      sousStock: 0,
      normal: 0,
      surStock: 0
    }

    result.produits_trouves.forEach(produit => {
      if (produit.mois_stock_calcule === "Rupture") {
        categories.rupture++
      } else if (produit.mois_stock_calcule === "Stock infini") {
        categories.surStock++
      } else if (typeof produit.mois_stock_calcule === 'number') {
        if (produit.mois_stock_calcule <= 1) {
          categories.rupture++
        } else if (produit.mois_stock_calcule <= seuilVisuel) {
          categories.sousStock++
        } else if (produit.mois_stock_calcule <= 6) {
          categories.normal++
        } else {
          categories.surStock++
        }
      }
    })

    return [
      { name: 'Rupture/Critique', value: categories.rupture, color: '#dc2626' },
      { name: 'Sous-stock', value: categories.sousStock, color: '#ea580c' },
      { name: 'Normal', value: categories.normal, color: '#16a34a' },
      { name: 'Sur-stock', value: categories.surStock, color: '#2563eb' }
    ].filter(item => item.value > 0)
  }, [result?.produits_trouves, seuilVisuel])

  // Tri des produits
  const sortedProducts = useMemo(() => {
    if (!result?.produits_trouves) return []

    return [...result.produits_trouves].sort((a, b) => {
      let aValue = a[sortField]
      let bValue = b[sortField]

      // Gestion des valeurs spéciales pour mois_stock_calcule
      if (sortField === 'mois_stock_calcule') {
        if (aValue === "Rupture") aValue = -1
        if (bValue === "Rupture") bValue = -1
        if (aValue === "Stock infini") aValue = 999
        if (bValue === "Stock infini") bValue = 999
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }

      const numA = Number(aValue) || 0
      const numB = Number(bValue) || 0

      return sortDirection === 'asc' ? numA - numB : numB - numA
    })
  }, [result?.produits_trouves, sortField, sortDirection])

  // Gestion du tri
  const handleSort = (field: SortField): void => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Icône de tri
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4 opacity-50" />
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-4 h-4 text-blue-600" />
      : <ArrowDown className="w-4 h-4 text-blue-600" />
  }

  // Couleur selon le niveau de stock (utilise le seuil visuel)
  const getStockColor = (moisStock: number | "Stock infini" | "Rupture"): string => {
    if (moisStock === "Rupture") return "text-red-700"
    if (moisStock === "Stock infini") return "text-purple-600"
    if (typeof moisStock === 'number') {
      if (moisStock <= 1) return "text-red-600"
      if (moisStock <= seuilVisuel) return "text-orange-500"
      if (moisStock <= 6) return "text-green-600"
      return "text-blue-600"
    }
    return "text-gray-600"
  }

  // Badge selon le niveau de stock (utilise le seuil visuel)
  const getStockBadge = (moisStock: number | "Stock infini" | "Rupture") => {
    if (moisStock === "Rupture") {
      return <Badge variant="error" size="sm">Rupture</Badge>
    }
    if (moisStock === "Stock infini") {
      return <Badge variant="info" size="sm">Infini</Badge>
    }
    if (typeof moisStock === 'number') {
      if (moisStock <= 1) {
        return <Badge variant="error" size="sm">Critique</Badge>
      }
      if (moisStock <= seuilVisuel) {
        return <Badge variant="warning" size="sm">Bas</Badge>
      }
      if (moisStock <= 6) {
        return <Badge variant="success" size="sm">Normal</Badge>
      }
      return <Badge variant="info" size="sm">Élevé</Badge>
    }
    return null
  }

  // Formatage des valeurs
  const formatMoisStock = (moisStock: number | "Stock infini" | "Rupture"): string => {
    if (typeof moisStock === 'number') {
      return `${moisStock.toFixed(1)} mois`
    }
    return moisStock
  }

  // Calculer les KPIs basés sur le seuil visuel
  const kpisVisuels = useMemo(() => {
    if (!result?.produits_trouves) return {
      rupture: 0,
      sousStock: 0,
      surStock: 0,
      stockMoyen: 0
    }

    let rupture = 0
    let sousStock = 0
    let surStock = 0
    const stocksNumeriques: number[] = []

    result.produits_trouves.forEach(produit => {
      if (produit.mois_stock_calcule === "Rupture") {
        rupture++
      } else if (produit.mois_stock_calcule === "Stock infini") {
        surStock++
      } else if (typeof produit.mois_stock_calcule === 'number') {
        stocksNumeriques.push(produit.mois_stock_calcule)
        
        if (produit.mois_stock_calcule <= 1) {
          rupture++
        } else if (produit.mois_stock_calcule <= seuilVisuel) {
          sousStock++
        } else if (produit.mois_stock_calcule > 6) {
          surStock++
        }
      }
    })

    const stockMoyen = stocksNumeriques.length > 0 
      ? stocksNumeriques.reduce((sum, stock) => sum + stock, 0) / stocksNumeriques.length
      : 0

    return { rupture, sousStock, surStock, stockMoyen }
  }, [result?.produits_trouves, seuilVisuel])

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card variant="elevated" className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Icon icon={Archive} variant="default" size="md" />
          <Text variant="h3" weight="semibold">
            Analyse Stock - {labName}
          </Text>
        </div>
      </Card>

      {/* Section paramètres */}
      <Card variant="default" className="p-6">
        <Text variant="h4" weight="semibold" className="mb-4">
          🎛 Paramètres d'affichage
        </Text>
        
        <div className="">
          {/* Seuil visuel */}
          <div>
            <Text variant="body" weight="medium" className="mb-2">
              Seuil visuel (mois de stock)
            </Text>
            <div className="space-y-2">
              <input
                type="range"
                min={1}
                max={12}
                value={seuilVisuel}
                onChange={(e) => setSeuilVisuel(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>1 mois</span>
                <span className="font-semibold text-blue-600">{seuilVisuel} mois</span>
                <span>12 mois</span>
              </div>
            </div>
            <Text variant="caption" color="muted" className="mt-1">
              Définit les couleurs : ≤1 = critique, ≤{seuilVisuel} = bas, ≤6 = normal, 6 = élevé
            </Text>
          </div>
        </div>
      </Card>

      {/* KPIs visuels */}
      {result && (
        <div className="grid md:grid-cols-4 gap-6">
          <Card variant="elevated" className="p-4 text-center">
            <Icon icon={Package} variant="default" size="lg" className="mx-auto mb-2" />
            <Text variant="h3" weight="bold">
              {kpisVisuels.stockMoyen.toFixed(1)} mois
            </Text>
            <Text variant="caption" color="muted">Stock moyen</Text>
          </Card>

          <Card variant="elevated" className="p-4 text-center">
            <Icon icon={AlertTriangle} variant="error" size="lg" className="mx-auto mb-2" />
            <Text variant="h3" weight="bold" className="text-red-600">
              {kpisVisuels.rupture}
            </Text>
            <Text variant="caption" color="muted">Rupture/Critique</Text>
          </Card>

          <Card variant="elevated" className="p-4 text-center">
            <Icon icon={Package} variant="warning" size="lg" className="mx-auto mb-2" />
            <Text variant="h3" weight="bold" className="text-orange-500">
              {kpisVisuels.sousStock}
            </Text>
            <Text variant="caption" color="muted">Sous-stock</Text>
          </Card>

          <Card variant="elevated" className="p-4 text-center">
            <Icon icon={Package} variant="default" size="lg" className="mx-auto mb-2" />
            <Text variant="h3" weight="bold" className="text-blue-600">
              {kpisVisuels.surStock}
            </Text>
            <Text variant="caption" color="muted">Sur-stock</Text>
          </Card>
        </div>
      )}

      {/* Tableau interactif */}
      {result && (
        <Card variant="elevated">
          <CardHeader>
            <Text variant="h4" weight="semibold">
              📋 Tous les produits ({result.total_produits})
            </Text>
            <Text variant="caption" color="secondary">
              Seuil visuel: {seuilVisuel} mois (pour les couleurs et badges)
            </Text>
          </CardHeader>
          
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <Text variant="body" color="muted">Analyse en cours...</Text>
              </div>
            ) : sortedProducts.length === 0 ? (
              <div className="p-8 text-center">
                <Text variant="body" color="muted">
                  Aucun produit trouvé
                </Text>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <button
                          onClick={() => handleSort('nom')}
                          className="flex items-center gap-2 font-semibold text-sm text-gray-700 hover:text-gray-900"
                        >
                          Produit
                          {getSortIcon('nom')}
                        </button>
                      </th>
                      <th className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleSort('stock_rayon')}
                          className="flex items-center gap-2 font-semibold text-sm text-gray-700 hover:text-gray-900 ml-auto"
                        >
                          Stock Rayon
                          {getSortIcon('stock_rayon')}
                        </button>
                      </th>
                      <th className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleSort('stock_reserve')}
                          className="flex items-center gap-2 font-semibold text-sm text-gray-700 hover:text-gray-900 ml-auto"
                        >
                          Stock Réserve
                          {getSortIcon('stock_reserve')}
                        </button>
                      </th>
                      <th className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleSort('ventes_mensuelles_moyennes')}
                          className="flex items-center gap-2 font-semibold text-sm text-gray-700 hover:text-gray-900 ml-auto"
                        >
                          Ventes/Mois
                          {getSortIcon('ventes_mensuelles_moyennes')}
                        </button>
                      </th>
                      <th className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleSort('mois_stock_calcule')}
                          className="flex items-center gap-2 font-semibold text-sm text-gray-700 hover:text-gray-900 ml-auto"
                        >
                          Mois de Stock
                          {getSortIcon('mois_stock_calcule')}
                        </button>
                      </th>
                      <th className="px-4 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {sortedProducts.map((produit, index) => (
                      <tr 
                        key={produit.ean13}
                        className="hover:bg-gray-50 transition-colors duration-150"
                      >
                        <td className="px-4 py-3">
                          <Text variant="body" weight="medium" className="max-w-xs truncate" title={produit.nom}>
                            {produit.nom}
                          </Text>
                          <Text variant="caption" color="muted" className="font-mono">
                            {produit.ean13}
                          </Text>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Text variant="body">
                            {produit.stock_rayon}
                          </Text>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Text variant="body">
                            {produit.stock_reserve}
                          </Text>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Text variant="body">
                            {produit.ventes_mensuelles_moyennes.toFixed(1)}
                          </Text>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Text 
                            variant="body" 
                            weight="semibold"
                            className={getStockColor(produit.mois_stock_calcule)}
                          >
                            {formatMoisStock(produit.mois_stock_calcule)}
                          </Text>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {getStockBadge(produit.mois_stock_calcule)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Alertes produits critiques */}
      {result && kpisVisuels.rupture > 0 && (
        <Card variant="bordered" className="border-red-200 bg-red-50/50 p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <Text variant="body" weight="semibold" className="text-red-800">
              ⚠️ Attention : {kpisVisuels.rupture} produit(s) en rupture ou niveau critique !
            </Text>
          </div>
        </Card>
      )}
    </div>
  )
}