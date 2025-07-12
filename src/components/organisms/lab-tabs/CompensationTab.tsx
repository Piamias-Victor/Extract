// src/components/organisms/lab-tabs/CompensationTab.tsx
import { DollarSign } from 'lucide-react'
import { Card, CardContent } from '@/components/atoms/Card'
import { Text } from '@/components/atoms/Text'
import { Icon } from '@/components/atoms/Icon'

interface CompensationTabProps {
  labId: number
  labName: string
}

export function CompensationTab({ labId, labName }: CompensationTabProps): React.ReactElement {
  return (
    <Card variant="elevated" className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <Icon icon={DollarSign} variant="default" size="md" />
        <Text variant="h3" weight="semibold">
          Compensation - {labName}
        </Text>
      </div>
      
      <CardContent>
        <Text variant="body" color="secondary">
          Suivi des compensations pour le laboratoire {labName} (ID: {labId}).
          Fonctionnalités à venir : remises, ristournes, objectifs, commissions, facturation.
        </Text>
      </CardContent>
    </Card>
  )
}