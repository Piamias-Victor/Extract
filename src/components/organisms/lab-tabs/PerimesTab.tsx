// src/components/organisms/lab-tabs/PerimesTab.tsx
import { AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/atoms/Card'
import { Text } from '@/components/atoms/Text'
import { Icon } from '@/components/atoms/Icon'

interface PerimesTabProps {
  labId: number
  labName: string
}

export function PerimesTab({ labId, labName }: PerimesTabProps): React.ReactElement {
  return (
    <Card variant="elevated" className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <Icon icon={AlertTriangle} variant="warning" size="md" />
        <Text variant="h3" weight="semibold">
          Périmés - {labName}
        </Text>
      </div>
      
      <CardContent>
        <Text variant="body" color="secondary">
          Gestion des produits périmés pour le laboratoire {labName} (ID: {labId}).
          Fonctionnalités à venir : liste périmés, valorisation, photos, workflow retours, compensation.
        </Text>
      </CardContent>
    </Card>
  )
}