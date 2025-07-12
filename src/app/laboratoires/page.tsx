// src/app/laboratoires/page.tsx
'use client'

import { useState } from 'react'
import { useFournisseurs } from '@/hooks/kpis/useFournisseurs'
import { Sidebar } from '@/components/molecules/Sidebar'
import { SearchBar } from '@/components/molecules/SearchBar'
import { Navigation } from '@/components/molecules/Navigation'
import { LabCard } from '@/components/molecules/LabCard'
import { Card } from '@/components/atoms/Card'
import { Text } from '@/components/atoms/Text'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { 
  Home, 
  Users, 
  Package, 
  BarChart3, 
  FileText, 
  Settings,
  AlertTriangle,
  Building2,
  ArrowLeft,
  Archive,
  TrendingUp,
  DollarSign
} from 'lucide-react'

// Import des tabs
import { ProduitsTab } from '@/components/organisms/lab-tabs/ProduitsTab'
import { StockTab } from '@/components/organisms/lab-tabs/StockTab'
import { MargeTab } from '@/components/organisms/lab-tabs/MargeTab'
import { AnalyseTab } from '@/components/organisms/lab-tabs/AnalyseTab'
import { PerimesTab } from '@/components/organisms/lab-tabs/PerimesTab'
import { CompensationTab } from '@/components/organisms/lab-tabs/CompensationTab'

interface SelectedLab {
  id: number
  nom_fournisseur: string
  code_fournisseur: string
  nom_pharmacie: string
}

export default function LaboratoiresPage(): React.ReactElement {
  const { fournisseurs, loading } = useFournisseurs()
  const [selectedTab, setSelectedTab] = useState<string>('laboratoires')
  const [selectedLab, setSelectedLab] = useState<SelectedLab | null>(null)
  const [activeLabTab, setActiveLabTab] = useState<string>('produits')

  // Navigation items pour la sidebar
  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, active: selectedTab === 'dashboard' },
    { id: 'laboratoires', label: 'Laboratoires', icon: Users, active: selectedTab === 'laboratoires' },
    { id: 'produits', label: 'Produits', icon: Package, active: selectedTab === 'produits' },
    { id: 'analyses', label: 'Analyses', icon: BarChart3, active: selectedTab === 'analyses' },
    { id: 'rapports', label: 'Rapports', icon: FileText, active: selectedTab === 'rapports' },
    { id: 'alertes', label: 'Alertes', icon: AlertTriangle, active: selectedTab === 'alertes', disabled: true },
    { id: 'settings', label: 'Paramètres', icon: Settings, active: selectedTab === 'settings' }
  ]

  // Tabs pour le laboratoire sélectionné
  const labTabs = [
    { id: 'produits', label: 'Produits', icon: Package, active: activeLabTab === 'produits' },
    { id: 'stock', label: 'Stock', icon: Archive, active: activeLabTab === 'stock' },
    { id: 'marge', label: 'Marge', icon: TrendingUp, active: activeLabTab === 'marge' },
    { id: 'analyse', label: 'Analyse', icon: BarChart3, active: activeLabTab === 'analyse' },
    { id: 'perimes', label: 'Périmés', icon: AlertTriangle, active: activeLabTab === 'perimes' },
    { id: 'compensation', label: 'Compensation', icon: DollarSign, active: activeLabTab === 'compensation' }
  ]

  const handleLabSelect = (lab: SelectedLab | null): void => {
    setSelectedLab(lab)
    if (lab) {
      setActiveLabTab('produits') // Reset to first tab when selecting a lab
    }
  }

  const handleLabCardClick = (lab: any): void => {
    setSelectedLab({
      id: lab.id,
      nom_fournisseur: lab.nom_fournisseur,
      code_fournisseur: lab.code_fournisseur,
      nom_pharmacie: lab.nom_pharmacie
    })
    setActiveLabTab('produits')
  }

  const handleBackToList = (): void => {
    setSelectedLab(null)
    setActiveLabTab('produits')
  }

  const renderActiveTabContent = (): React.ReactElement => {
    if (!selectedLab) return <div />

    switch (activeLabTab) {
      case 'produits':
        return <ProduitsTab labId={selectedLab.id} labName={selectedLab.nom_fournisseur} />
      case 'stock':
        return <StockTab labId={selectedLab.id} labName={selectedLab.nom_fournisseur} />
      case 'marge':
        return <MargeTab labId={selectedLab.id} labName={selectedLab.nom_fournisseur} />
      case 'analyse':
        return <AnalyseTab labId={selectedLab.id} labName={selectedLab.nom_fournisseur} />
      case 'perimes':
        return <PerimesTab labId={selectedLab.id} labName={selectedLab.nom_fournisseur} />
      case 'compensation':
        return <CompensationTab labId={selectedLab.id} labName={selectedLab.nom_fournisseur} />
      default:
        return <ProduitsTab labId={selectedLab.id} labName={selectedLab.nom_fournisseur} />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      
      {/* Sidebar en overlay */}
      <Sidebar 
        items={sidebarItems}
        onItemClick={setSelectedTab}
        defaultCollapsed={true}
      />

      {/* Contenu principal avec marge pour la sidebar */}
      <div className="ml-20 p-8">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            {selectedLab && (
              <Button variant="ghost" size="sm" onClick={handleBackToList}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
            )}
            <Building2 className="w-8 h-8 text-gray-700" />
            <Text variant="h1" weight="bold">
              {selectedLab ? selectedLab.nom_fournisseur : 'Laboratoires'}
            </Text>
            <Badge variant="info" size="sm">
              {selectedLab ? `Code: ${selectedLab.code_fournisseur}` : `${fournisseurs.length} laboratoires`}
            </Badge>
          </div>
          <Text variant="body" color="secondary">
            {selectedLab 
              ? `Gestion du laboratoire ${selectedLab.nom_fournisseur} - ${selectedLab.nom_pharmacie}`
              : 'Recherchez et gérez vos laboratoires pharmaceutiques'
            }
          </Text>
        </div>

        {/* Contenu conditionnel */}
        {selectedLab ? (
          // Vue laboratoire sélectionné avec tabs
          <>
            {/* Navigation tabs */}
            <div className="mb-8">
              <Navigation 
                tabs={labTabs}
                onTabClick={setActiveLabTab}
                variant="tabs"
              />
            </div>

            {/* Contenu de l'onglet actif */}
            <div className="mb-8">
              {renderActiveTabContent()}
            </div>
          </>
        ) : (
          // Vue liste des laboratoires
          <>
            {/* Search Bar */}
            <div className="mb-8">
              <SearchBar
                data={fournisseurs}
                onSelect={handleLabSelect}
                placeholder="Rechercher un laboratoire par nom ou code..."
                loading={loading}
                className="max-w-2xl"
              />
            </div>

            {/* Liste des laboratoires */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <Text variant="h3" weight="semibold">
                  📋 Tous les laboratoires
                </Text>
                <Text variant="caption" color="muted">
                  {loading ? 'Chargement...' : `${fournisseurs.length} laboratoires trouvés`}
                </Text>
              </div>

              {loading ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Card key={i} variant="default" className="animate-pulse p-6">
                      <div className="space-y-3">
                        <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                        <div className="h-3 bg-gray-300 rounded w-2/3"></div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {fournisseurs.map((lab) => (
                    <LabCard
                      key={lab.id}
                      id={lab.id}
                      nom_fournisseur={lab.nom_fournisseur}
                      code_fournisseur={lab.code_fournisseur}
                      nom_pharmacie={lab.nom_pharmacie}
                      email={lab.email}
                      telephone={lab.telephone}
                      statut={lab.statut}
                      onClick={() => handleLabCardClick(lab)}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Footer */}
        <div className="mt-12 text-center">
          <Text variant="caption" color="muted">
            Page Laboratoires EXTRACT - Gestion des fournisseurs pharmaceutiques
          </Text>
        </div>
      </div>
    </div>
  )
}