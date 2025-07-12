'use client'

import { useState, useEffect, useMemo } from 'react'
import { TrendingUp, Percent, AlertTriangle, ArrowUpDown, ArrowUp, ArrowDown, DollarSign } from 'lucide-react'
import { useAnalyseMarge } from '@/hooks/kpis/useAnalyseMarge'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { Card, CardContent, CardHeader } from '@/components/atoms/Card'
import { Text } from '@/components/atoms/Text'
import { Icon } from '@/components/atoms/Icon'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { cn } from '@/lib/utils'

interface MargeTabProps {
  labId: number
  labName: string
}

type SortField = 'nom' | 'prix_achat_ht' | 'prix_vente_ttc' | 'pourcentage_marge_calcule' | 'ventes_periode' | 'ca_periode'
type SortDirection = 'asc' | 'desc'

export function MargeTab({ labId, labName }: MargeTabProps): React.ReactElement {
  const { result, loading, analyserMarge } = useAnalyseMarge()
  const [seuilVisuel, setSeuilVisuel] = useState<number>(25) // Seuil pour l'affichage/couleurs (en %)
  const [sortField, setSortField] = useState<SortField>('pourcentage_marge_calcule')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  // Analyser au montage - utiliser seuil très faible pour récupérer tous les produits
  useEffect(() => {
    analyserMarge({
      seuil_marge: 0.1, // Seuil très bas pour récupérer tous les produits
      mode: 'dessous',
      fournisseur_id: labId
    })
  }, [labId])

  // Fonction pour actualiser les données
  const handleActualiser = (): void => {
    analyserMarge({
      seuil_marge: 0.1, // Seuil très bas pour récupérer tous les produits
      mode: 'dessous',
      fournisseur_id: labId
    })
  }

  // Données pour le donut chart basées sur le seuil visuel
  const donutData = useMemo(() => {
    if (!result?.produits_trouves) return []

    const categories = {
      faible: 0,
      moyenne: 0,
      bonne: 0,
      excellente: 0
    }

    result.produits_trouves.forEach(produit => {
      const marge = produit.pourcentage_marge_calcule
      
      if (marge < 10) {
        categories.faible++
      } else if (marge < seuilVisuel) {
        categories.moyenne++
      } else if (marge < 40) {
        categories.bonne++
      } else {
        categories.excellente++
      }
    })

    return [
      { name: 'Faible (< 10%)', value: categories.faible, color: '#dc2626' },
      { name: `Moyenne (< ${seuilVisuel}%)`, value: categories.moyenne, color: '#ea580c' },
      { name: 'Bonne (< 40%)', value: categories.bonne, color: '#16a34a' },
      { name: 'Excellente (≥ 40%)', value: categories.excellente, color: '#2563eb' }
    ].filter(item => item.value > 0)
  }, [result?.produits_trouves, seuilVisuel])

  // Tri des produits
  const sortedProducts = useMemo(() => {
    if (!result?.produits_trouves) return []

    return [...result.produits_trouves].sort((a, b) => {
      let aValue = a[sortField]
      let bValue = b[sortField]

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

  // Couleur selon le niveau de marge (utilise le seuil visuel)
  const getMargeColor = (marge: number): string => {
    if (marge < 10) return "text-red-600"
    if (marge < seuilVisuel) return "text-orange-500"
    if (marge < 40) return "text-green-600"
    return "text-blue-600"
  }

  // Badge selon le niveau de marge (utilise le seuil visuel)
  const getMargeBadge = (marge: number) => {
    if (marge < 10) {
      return <Badge variant="error" size="sm">Faible</Badge>
    }
    if (marge < seuilVisuel) {
      return <Badge variant="warning" size="sm">Moyenne</Badge>
    }
    if (marge < 40) {
      return <Badge variant="success" size="sm">Bonne</Badge>
    }
    return <Badge variant="info" size="sm">Excellente</Badge>
  }

  // Formatage des valeurs
  const formatMarge = (marge: number): string => {
    return `${marge.toFixed(1)}%`
  }

  const formatPrix = (prix: number): string => {
    return `${prix.toFixed(2)}€`
  }

  // Calculer les KPIs basés sur le seuil visuel
  const kpisVisuels = useMemo(() => {
    if (!result?.produits_trouves) return {
      faible: 0,
      moyenne: 0,
      bonne: 0,
      excellente: 0,
      margeMoyenne: 0,
      caTotal: 0
    }

    let faible = 0
    let moyenne = 0
    let bonne = 0
    let excellente = 0
    let totalMarge = 0
    let totalCA = 0

    result.produits_trouves.forEach(produit => {
      const marge = produit.pourcentage_marge_calcule
      const ca = produit.ca_periode
      
      totalMarge += (marge * ca) / 100
      totalCA += ca

      if (marge < 10) {
        faible++
      } else if (marge < seuilVisuel) {
        moyenne++
      } else if (marge < 40) {
        bonne++
      } else {
        excellente++
      }
    })

    const margeMoyenne = totalCA > 0 ? (totalMarge / totalCA) * 100 : 0

    return { faible, moyenne, bonne, excellente, margeMoyenne, caTotal: totalCA }
  }, [result?.produits_trouves, seuilVisuel])

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card variant="elevated" className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Icon icon={TrendingUp} variant="default" size="md" />
          <Text variant="h3" weight="semibold">
            Analyse Marge - {labName}
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
              Seuil visuel (pourcentage de marge)
            </Text>
            <div className="space-y-2">
              <input
                type="range"
                min={10}
                max={50}
                value={seuilVisuel}
                onChange={(e) => setSeuilVisuel(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>10%</span>
                <span className="font-semibold text-blue-600">{seuilVisuel}%</span>
                <span>50%</span>
              </div>
            </div>
            <Text variant="caption" color="muted" className="mt-1">
              Définit les couleurs : &lt;10% = faible, &lt;{seuilVisuel}% = moyenne, &lt;40% = bonne, ≥40% = excellente
            </Text>
          </div>
        </div>
      </Card>

      {/* KPIs visuels */}
      {result && (
        <div className="grid md:grid-cols-4 gap-6">
          <Card variant="elevated" className="p-4 text-center">
            <Icon icon={Percent} variant="default" size="lg" className="mx-auto mb-2" />
            <Text variant="h3" weight="bold">
              {kpisVisuels.margeMoyenne.toFixed(1)}%
            </Text>
            <Text variant="caption" color="muted">Marge moyenne</Text>
          </Card>

          <Card variant="elevated" className="p-4 text-center">
            <Icon icon={AlertTriangle} variant="error" size="lg" className="mx-auto mb-2" />
            <Text variant="h3" weight="bold" className="text-red-600">
              {kpisVisuels.faible}
            </Text>
            <Text variant="caption" color="muted">Marges faibles</Text>
          </Card>

          <Card variant="elevated" className="p-4 text-center">
            <Icon icon={TrendingUp} variant="warning" size="lg" className="mx-auto mb-2" />
            <Text variant="h3" weight="bold" className="text-orange-500">
              {kpisVisuels.moyenne}
            </Text>
            <Text variant="caption" color="muted">Marges moyennes</Text>
          </Card>

          <Card variant="elevated" className="p-4 text-center">
            <Icon icon={DollarSign} variant="default" size="lg" className="mx-auto mb-2" />
            <Text variant="h3" weight="bold" className="text-green-600">
              {formatPrix(kpisVisuels.caTotal)}
            </Text>
            <Text variant="caption" color="muted">CA total</Text>
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
              Seuil visuel: {seuilVisuel}% (pour les couleurs et badges)
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
                          onClick={() => handleSort('prix_achat_ht')}
                          className="flex items-center gap-2 font-semibold text-sm text-gray-700 hover:text-gray-900 ml-auto"
                        >
                          Prix Achat HT
                          {getSortIcon('prix_achat_ht')}
                        </button>
                      </th>
                      <th className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleSort('prix_vente_ttc')}
                          className="flex items-center gap-2 font-semibold text-sm text-gray-700 hover:text-gray-900 ml-auto"
                        >
                          Prix Vente TTC
                          {getSortIcon('prix_vente_ttc')}
                        </button>
                      </th>
                      <th className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleSort('pourcentage_marge_calcule')}
                          className="flex items-center gap-2 font-semibold text-sm text-gray-700 hover:text-gray-900 ml-auto"
                        >
                          Marge %
                          {getSortIcon('pourcentage_marge_calcule')}
                        </button>
                      </th>
                      <th className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleSort('ventes_periode')}
                          className="flex items-center gap-2 font-semibold text-sm text-gray-700 hover:text-gray-900 ml-auto"
                        >
                          Ventes
                          {getSortIcon('ventes_periode')}
                        </button>
                      </th>
                      <th className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleSort('ca_periode')}
                          className="flex items-center gap-2 font-semibold text-sm text-gray-700 hover:text-gray-900 ml-auto"
                        >
                          CA Période
                          {getSortIcon('ca_periode')}
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
                            {formatPrix(produit.prix_achat_ht)}
                          </Text>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Text variant="body">
                            {formatPrix(produit.prix_vente_ttc)}
                          </Text>
                          {produit.prix_promo_ttc && (
                            <Text variant="caption" color="muted">
                              Promo: {formatPrix(produit.prix_promo_ttc)}
                            </Text>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Text 
                            variant="body" 
                            weight="semibold"
                            className={getMargeColor(produit.pourcentage_marge_calcule)}
                          >
                            {formatMarge(produit.pourcentage_marge_calcule)}
                          </Text>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Text variant="body">
                            {produit.ventes_periode}
                          </Text>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Text variant="body">
                            {formatPrix(produit.ca_periode)}
                          </Text>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {getMargeBadge(produit.pourcentage_marge_calcule)}
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

      {/* Alertes produits avec marges faibles */}
      {result && kpisVisuels.faible > 0 && (
        <Card variant="bordered" className="border-red-200 bg-red-50/50 p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <Text variant="body" weight="semibold" className="text-red-800">
              ⚠️ Attention : {kpisVisuels.faible} produit(s) avec des marges faibles (&lt; 10%) !
            </Text>
          </div>
        </Card>
      )}
    </div>
  )
}