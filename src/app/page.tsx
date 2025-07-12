// src/app/test-molecules/page.tsx
'use client'

import { useState } from 'react'
import { 
  BarChart3,
  TrendingUp, 
  TrendingDown, 
  Package, 
  DollarSign,
  Home,
  Users,
  Settings,
  FileText,
  AlertTriangle,
  Activity,
  PieChart
} from 'lucide-react'
import { KpiCard } from '@/components/molecules/KpiCard'
import { Sidebar } from '@/components/molecules/Sidebar'
import { Chart } from '@/components/molecules/Chart'
import { Navigation } from '@/components/molecules/Navigation'
import { Card, CardHeader, CardContent } from '@/components/atoms/Card'
import { Text } from '@/components/atoms/Text'
import { Button } from '@/components/atoms/Button'

export default function TestMoleculesPage(): React.ReactElement {
  const [selectedTab, setSelectedTab] = useState<string>('dashboard')
  const [selectedPill, setSelectedPill] = useState<string>('marge')
  const [loading, setLoading] = useState<boolean>(false)

  // Mock data pour les KPIs
  const kpiData = [
    {
      title: "CA 12 MOIS",
      value: "847293",
      icon: DollarSign,
      trend: { value: 12.3, type: 'positive' as const, label: "vs année précédente" }
    },
    {
      title: "MARGE 12 MOIS", 
      value: "23.7%",
      icon: TrendingUp,
      trend: { value: -1.2, type: 'negative' as const, label: "vs année précédente" }
    },
    {
      title: "STOCK TOTAL",
      value: "2.4 mois",
      icon: Package,
      trend: { value: 0, type: 'neutral' as const, label: "Rotation normale" }
    },
    {
      title: "ÉVOLUTION CA",
      value: "-5.2%",
      icon: TrendingDown,
      trend: { value: -5.2, type: 'negative' as const, label: "Mois dernier" }
    }
  ]

  // Mock data pour le graphique
  const chartData = [
    { name: 'Jan', value: 65000 },
    { name: 'Fév', value: 78000 },
    { name: 'Mar', value: 82000 },
    { name: 'Avr', value: 71000 },
    { name: 'Mai', value: 88000 },
    { name: 'Jun', value: 94000 },
    { name: 'Jul', value: 87000 },
    { name: 'Aoû', value: 92000 },
    { name: 'Sep', value: 84000 },
    { name: 'Oct', value: 89000 },
    { name: 'Nov', value: 76000 },
    { name: 'Déc', value: 98000 }
  ]

  // Navigation items pour la sidebar
  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, active: selectedTab === 'dashboard' },
    { id: 'kpis', label: 'KPIs', icon: BarChart3, active: selectedTab === 'kpis' },
    { id: 'laboratoires', label: 'Laboratoires', icon: Users, active: selectedTab === 'laboratoires' },
    { id: 'produits', label: 'Produits', icon: Package, active: selectedTab === 'produits' },
    { id: 'analyses', label: 'Analyses', icon: PieChart, active: selectedTab === 'analyses' },
    { id: 'rapports', label: 'Rapports', icon: FileText, active: selectedTab === 'rapports' },
    { id: 'alertes', label: 'Alertes', icon: AlertTriangle, active: selectedTab === 'alertes', disabled: true },
    { id: 'settings', label: 'Paramètres', icon: Settings, active: selectedTab === 'settings' }
  ]

  // Tabs pour la navigation
  const navigationTabs = [
    { id: 'dashboard', label: 'Vue d\'ensemble', icon: Home, active: selectedTab === 'dashboard' },
    { id: 'kpis', label: 'KPIs', icon: Activity, active: selectedTab === 'kpis', count: 8 },
    { id: 'analyses', label: 'Analyses', icon: BarChart3, active: selectedTab === 'analyses', count: 3 }
  ]

  // Pills pour les sous-sections
  const analysisPills = [
    { id: 'marge', label: 'Analyse Marge', active: selectedPill === 'marge', count: 247 },
    { id: 'stock', label: 'Analyse Stock', active: selectedPill === 'stock', count: 12 },
    { id: 'pareto', label: 'Pareto', active: selectedPill === 'pareto' },
    { id: 'abc-xyz', label: 'ABC/XYZ', active: selectedPill === 'abc-xyz' },
    { id: 'saisonnalite', label: 'Saisonnalité', active: selectedPill === 'saisonnalite', disabled: true }
  ]

  const handleLoadingTest = (): void => {
    setLoading(true)
    setTimeout(() => setLoading(false), 3000)
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
          <Text variant="h1" weight="bold" className="mb-2">
            🧩 Test des Molecules Glassmorphism
          </Text>
          <Text variant="body" color="secondary">
            Validation des composants moyens du design system EXTRACT
          </Text>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8">
          <Text variant="h3" weight="semibold" className="mb-4">
            📑 Navigation - Variant Tabs
          </Text>
          <Navigation 
            tabs={navigationTabs}
            onTabClick={setSelectedTab}
            variant="tabs"
          />
        </div>

        {/* KPI Cards Grid */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <Text variant="h3" weight="semibold">
              📊 KPI Cards - Grid 2x2
            </Text>
            <Button onClick={handleLoadingTest} variant="outline" size="sm">
              🔄 Tester loading (3s)
            </Button>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpiData.map((kpi, index) => (
              <KpiCard
                key={index}
                title={kpi.title}
                value={kpi.value}
                icon={kpi.icon}
                trend={kpi.trend}
                loading={loading}
              />
            ))}
          </div>
        </div>

        {/* Navigation Pills */}
        <div className="mb-8">
          <Text variant="h3" weight="semibold" className="mb-4">
            💊 Navigation - Variant Pills
          </Text>
          <Navigation 
            tabs={analysisPills}
            onTabClick={setSelectedPill}
            variant="pills"
          />
        </div>

        {/* Charts Section */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <Chart
            title="Évolution CA Mensuel"
            subtitle="Chiffre d'affaires sur 12 mois"
            data={chartData}
            height={280}
            color="#374151"
            loading={loading}
          />
          
          <Chart
            title="Marge par Trimestre"
            subtitle="Évolution de la marge brute"
            data={[
              { name: 'Q1 2024', value: 245000 },
              { name: 'Q2 2024', value: 267000 },
              { name: 'Q3 2024', value: 253000 },
              { name: 'Q4 2024', value: 289000 }
            ]}
            height={280}
            color="#059669"
            loading={loading}
          />
        </div>

        {/* Composants individuels */}
        <div className="grid lg:grid-cols-3 gap-6">
          
          {/* KPI Card Seule */}
          <Card variant="elevated" className="p-6">
            <Text variant="h4" weight="semibold" className="mb-4">
              KpiCard Individuelle
            </Text>
            <KpiCard
              title="TEST METRIC"
              value={156789}
              icon={Activity}
              trend={{ value: 8.7, type: 'positive', label: "Cette semaine" }}
              className="mb-4"
            />
            <Text variant="caption" color="muted">
              Composant standalone avec formatage français automatique
            </Text>
          </Card>

          {/* Chart Petite */}
          <Card variant="elevated" className="p-6">
            <Text variant="h4" weight="semibold" className="mb-4">
              Chart Compacte
            </Text>
            <Chart
              title="Ventes Hebdo"
              data={[
                { name: 'Lun', value: 12000 },
                { name: 'Mar', value: 15000 },
                { name: 'Mer', value: 18000 },
                { name: 'Jeu', value: 14000 },
                { name: 'Ven', value: 22000 },
                { name: 'Sam', value: 28000 },
                { name: 'Dim', value: 8000 }
              ]}
              height={200}
              color="#7c3aed"
              loading={loading}
            />
          </Card>

          {/* Navigation Variations */}
          <Card variant="elevated" className="p-6">
            <Text variant="h4" weight="semibold" className="mb-4">
              Navigation Tailles
            </Text>
            
            <div className="space-y-4">
              <div>
                <Text variant="caption" color="muted" className="mb-2 block">
                  Taille Small
                </Text>
                <Navigation 
                  tabs={[
                    { id: 'a', label: 'Small', active: true },
                    { id: 'b', label: 'Test', count: 5 }
                  ]}
                  onTabClick={() => {}}
                  variant="pills"
                  size="sm"
                />
              </div>
              
              <div>
                <Text variant="caption" color="muted" className="mb-2 block">
                  Taille Large
                </Text>
                <Navigation 
                  tabs={[
                    { id: 'a', label: 'Large', active: true },
                    { id: 'b', label: 'Button' }
                  ]}
                  onTabClick={() => {}}
                  variant="pills"
                  size="lg"
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <Text variant="caption" color="muted">
            Molecules EXTRACT - Composants moyens glassmorphism validés ✅
          </Text>
        </div>
      </div>
    </div>
  )
}