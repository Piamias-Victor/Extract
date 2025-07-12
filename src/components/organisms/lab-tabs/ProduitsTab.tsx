// src/components/organisms/lab-tabs/ProduitsTab.tsx
'use client'

import { useState, useMemo, useEffect } from 'react'
import { Package, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { useDetailProduits } from '@/hooks/kpis/useDetailProduits'
import { useCaTtc } from '@/hooks/kpis/useCaTtc'
import { useMargeTtc } from '@/hooks/kpis/useMargeTtc'
import { Chart } from '@/components/molecules/Chart'
import { Card, CardContent, CardHeader } from '@/components/atoms/Card'
import { Text } from '@/components/atoms/Text'
import { Icon } from '@/components/atoms/Icon'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { cn } from '@/lib/utils'

interface ProduitsTabProps {
  labId: number
  labName: string
}

type SortField = 'nom' | 'ean13' | 'prix_achat_ht' | 'prix_vente_ttc' | 'marge_pct' | 'stock_total' | 'ca_12_mois'
type SortDirection = 'asc' | 'desc'

export function ProduitsTab({ labId, labName }: ProduitsTabProps): React.ReactElement {
  const { result, loading, searchProduits } = useDetailProduits()
  const { result: caResult, loading: caLoading, calculateCaTtc } = useCaTtc()
  const { result: margeResult, loading: margeLoading, calculateMargeTtc } = useMargeTtc()
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [sortField, setSortField] = useState<SortField>('nom')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  // Charger les produits du laboratoire spécifique au montage
  useEffect(() => {
    searchProduits({
      fournisseur_id: labId
    })
  }, [labId])

  // Charger les données CA et Marge pour les 12 derniers mois
  useEffect(() => {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setFullYear(endDate.getFullYear() - 1)

    const dateDebut = startDate.toISOString().split('T')[0]
    const dateFin = endDate.toISOString().split('T')[0]

    calculateCaTtc({
      date_debut: dateDebut,
      date_fin: dateFin,
      fournisseur_id: labId
    })

    calculateMargeTtc({
      date_debut: dateDebut,
      date_fin: dateFin,
      fournisseur_id: labId
    })
  }, [labId])

  // Préparer les données pour le graphique CA + Marge
  // Remplacer juste la partie chartData dans votre code existant :

// Préparer les données pour le graphique CA + Marge
const chartData = useMemo(() => {
  if (!caResult?.ca_par_mois || !margeResult?.marge_par_mois) return []

  const monthNames = [
    'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun',
    'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'
  ]

  // Créer un objet pour merger les données par mois
  const dataByMonth: {[key: string]: {ca: number, marge: number}} = {}

  // Ajouter les données CA
  caResult.ca_par_mois.forEach(item => {
    const monthNumber = parseInt(item.mois.split('-')[1])
    const monthIndex = monthNumber - 1
    const monthName = monthNames[monthIndex]
    
    if (!dataByMonth[monthName]) {
      dataByMonth[monthName] = { ca: 0, marge: 0 }
    }
    dataByMonth[monthName].ca += item.ca
  })

  // Ajouter les données Marge
  margeResult.marge_par_mois.forEach(item => {
    const monthNumber = parseInt(item.mois.split('-')[1])
    const monthIndex = monthNumber - 1
    const monthName = monthNames[monthIndex]
    
    if (!dataByMonth[monthName]) {
      dataByMonth[monthName] = { ca: 0, marge: 0 }
    }
    dataByMonth[monthName].marge += item.marge
  })

  // Convertir en format pour le graphique - GARDEZ value pour le CA
  return monthNames.map(month => ({
    name: month,
    value: dataByMonth[month]?.ca || 0,  // CA reste dans value
    marge: dataByMonth[month]?.marge || 0 // Marge en champ séparé
  })).filter(item => item.value > 0 || item.marge > 0)
}, [caResult?.ca_par_mois, margeResult?.marge_par_mois])

  // Fonction pour normaliser le texte (supprimer accents et casse)
  const normalizeText = (text: string): string => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
  }

  // Fonction de calcul de marge
  const calculateMarge = (prixAchat: number, prixVente: number): number => {
    if (!prixAchat || !prixVente || prixVente === 0) return 0
    
    // Convertir prix vente TTC en HT (approximation avec TVA 20%)
    const prixVenteHT = prixVente / 1.2
    const marge = ((prixVenteHT - prixAchat) / prixVenteHT) * 100
    
    return Math.max(0, marge) // Ne pas avoir de marge négative
  }

  // Enrichir les produits avec la marge calculée
  const enrichedProducts = useMemo(() => {
    if (!result?.produits) return []
    
    return result.produits.map(product => ({
      ...product,
      marge_pct: calculateMarge(product.prix_achat_ht, product.prix_vente_ttc)
    }))
  }, [result?.produits])

  // Fonction de recherche avancée
  const filterProducts = (products: any[], query: string) => {
    if (!query) return products

    const searchTerm = normalizeText(query.trim())
    
    // Recherche par fin de code EAN13 si commence par *
    if (searchTerm.startsWith('*')) {
      const endPattern = searchTerm.slice(1)
      return products.filter(product => 
        product.ean13.toLowerCase().endsWith(endPattern)
      )
    }
    
    // Recherche normale par nom ou code EAN13 (insensible casse/accents)
    return products.filter(product => {
      const normalizedNom = normalizeText(product.nom)
      const normalizedEan = product.ean13.toLowerCase()
      
      return normalizedNom.includes(searchTerm) || normalizedEan.includes(searchTerm)
    })
  }

  // Fonction de tri
  const sortProducts = (products: any[], field: SortField, direction: SortDirection) => {
    return [...products].sort((a, b) => {
      let aValue = a[field]
      let bValue = b[field]

      // Conversion pour les nombres
      if (typeof aValue === 'string' && !isNaN(Number(aValue))) {
        aValue = Number(aValue)
        bValue = Number(bValue)
      }

      // Tri alphabétique pour les textes
      if (field === 'nom') {
        aValue = normalizeText(aValue || '')
        bValue = normalizeText(bValue || '')
      }

      if (direction === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })
  }

  // Données filtrées et triées
  const processedProducts = useMemo(() => {
    const filtered = filterProducts(enrichedProducts, searchQuery)
    return sortProducts(filtered, sortField, sortDirection)
  }, [enrichedProducts, searchQuery, sortField, sortDirection])

  // Gestion du tri
  const handleSort = (field: SortField) => {
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

  // Formatage des valeurs
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(value || 0)
  }

  const formatPercentage = (value: number) => {
    return `${(value || 0).toFixed(1)}%`
  }

  const getMargeColor = (marge: number) => {
    if (marge >= 25) return 'text-green-600'
    if (marge >= 15) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="space-y-6">
      {/* Header avec statistiques */}
      <Card variant="elevated" className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Icon icon={Package} variant="default" size="md" />
          <Text variant="h3" weight="semibold">
            Produits - {labName}
          </Text>
        </div>
        
        {result && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <Text variant="h4" weight="bold">{processedProducts.length}</Text>
              <Text variant="caption" color="muted">Produits affichés</Text>
            </div>
            <div className="text-center">
              <Text variant="h4" weight="bold">{enrichedProducts.length}</Text>
              <Text variant="caption" color="muted">Produits total</Text>
            </div>
            <div className="text-center">
              <Text variant="h4" weight="bold">
                {formatCurrency(processedProducts.reduce((sum, p) => sum + (p.ca_12_mois || 0), 0))}
              </Text>
              <Text variant="caption" color="muted">CA filtré</Text>
            </div>
            <div className="text-center">
              <Text variant="h4" weight="bold">
                {formatPercentage(processedProducts.length > 0 
                  ? processedProducts.reduce((sum, p) => sum + (p.marge_pct || 0), 0) / processedProducts.length 
                  : 0
                )}
              </Text>
              <Text variant="caption" color="muted">Marge moyenne</Text>
            </div>
          </div>
        )}
      </Card>

      {/* Graphique CA et Marge du laboratoire */}
      {chartData.length > 0 && (
        <Chart
          title={`Évolution CA - ${labName}`}
          subtitle="Chiffre d'affaires du laboratoire par mois"
          data={chartData}
          height={320}
          color="#374151"
          loading={caLoading || margeLoading}
        />
      )}

      {/* Barre de recherche */}
      <Card variant="default" className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Icon icon={Search} variant="muted" size="sm" className="absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par nom ou EAN13... (utilisez *1234 pour rechercher par fin de code)"
              className="w-full pl-10 pr-4 py-2 bg-transparent border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          {searchQuery && (
            <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')}>
              Effacer
            </Button>
          )}
        </div>
        
        {searchQuery.startsWith('*') && (
          <div className="mt-2 p-2 bg-blue-50 rounded text-sm text-blue-700">
            🔍 Recherche par fin de code EAN13 : "{searchQuery.slice(1)}"
          </div>
        )}

        {/* Info recherche */}
        <div className="mt-2 text-xs text-gray-500">
          💡 Recherche insensible à la casse et aux accents (ex: "avene" trouvera "AVÈNE")
        </div>
      </Card>

      {/* Tableau des produits */}
      <Card variant="elevated">
        <CardHeader>
          <Text variant="h4" weight="semibold">
            📋 Liste des produits ({processedProducts.length})
          </Text>
        </CardHeader>
        
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <Text variant="body" color="muted">Chargement des produits...</Text>
            </div>
          ) : processedProducts.length === 0 ? (
            <div className="p-8 text-center">
              <Text variant="body" color="muted">
                {searchQuery ? 'Aucun produit trouvé pour cette recherche' : 'Aucun produit disponible'}
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
                        Nom du produit
                        {getSortIcon('nom')}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <button
                        onClick={() => handleSort('ean13')}
                        className="flex items-center gap-2 font-semibold text-sm text-gray-700 hover:text-gray-900"
                      >
                        EAN13
                        {getSortIcon('ean13')}
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
                        onClick={() => handleSort('marge_pct')}
                        className="flex items-center gap-2 font-semibold text-sm text-gray-700 hover:text-gray-900 ml-auto"
                      >
                        Marge %
                        {getSortIcon('marge_pct')}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleSort('stock_total')}
                        className="flex items-center gap-2 font-semibold text-sm text-gray-700 hover:text-gray-900 ml-auto"
                      >
                        Stock
                        {getSortIcon('stock_total')}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleSort('ca_12_mois')}
                        className="flex items-center gap-2 font-semibold text-sm text-gray-700 hover:text-gray-900 ml-auto"
                      >
                        CA 12M
                        {getSortIcon('ca_12_mois')}
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {processedProducts.map((product, index) => (
                    <tr 
                      key={product.ean13}
                      className="hover:bg-gray-50 transition-colors duration-150"
                    >
                      <td className="px-4 py-3">
                        <Text variant="body" weight="medium" className="max-w-xs truncate" title={product.nom}>
                          {product.nom}
                        </Text>
                      </td>
                      <td className="px-4 py-3">
                        <Text variant="body" className="font-mono text-sm">
                          {product.ean13}
                        </Text>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Text variant="body">
                          {formatCurrency(product.prix_achat_ht)}
                        </Text>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Text variant="body">
                          {formatCurrency(product.prix_vente_ttc)}
                        </Text>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Text 
                          variant="body" 
                          weight="semibold"
                          className={getMargeColor(product.marge_pct)}
                        >
                          {formatPercentage(product.marge_pct)}
                        </Text>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Text variant="body">
                            {product.stock_total || 0}
                          </Text>
                          {(product.stock_total || 0) <= 5 && (
                            <Badge variant="warning" size="sm">Faible</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Text variant="body" weight="medium">
                          {formatCurrency(product.ca_12_mois)}
                        </Text>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Résumé de recherche */}
      {searchQuery && (
        <Card variant="default" className="p-4">
          <Text variant="caption" color="muted">
            Résultats de recherche pour "{searchQuery}" : {processedProducts.length} produit(s) trouvé(s)
          </Text>
        </Card>
      )}
    </div>
  )
}