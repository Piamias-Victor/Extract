// src/components/molecules/LabCard.tsx
import { Building2, Package, TrendingUp, AlertCircle } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/atoms/Card'
import { Text } from '@/components/atoms/Text'
import { Badge } from '@/components/atoms/Badge'
import { Icon } from '@/components/atoms/Icon'
import { cn } from '@/lib/utils'

interface LabCardProps {
  id: number
  nom_fournisseur: string
  code_fournisseur: string
  nom_pharmacie: string
  email?: string | null
  telephone?: string | null
  statut?: string | null
  className?: string
  onClick?: () => void
}

export function LabCard({
  id,
  nom_fournisseur,
  code_fournisseur,
  nom_pharmacie,
  email,
  telephone,
  statut,
  className,
  onClick
}: LabCardProps): React.ReactElement {
  
  const getStatutVariant = (statut: string | null) => {
    switch (statut?.toLowerCase()) {
      case 'actif': return 'success'
      case 'inactif': return 'error'
      case 'suspendu': return 'warning'
      default: return 'default'
    }
  }

  return (
    <Card 
      variant="default" 
      className={cn(
        "transition-all duration-200 hover:scale-102 hover:shadow-lg cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-start justify-between pb-3">
        <div className="flex items-center gap-3">
          <Icon icon={Building2} variant="default" size="md" />
          <div>
            <Text variant="h4" weight="semibold" className="mb-1">
              {nom_fournisseur}
            </Text>
            <Text variant="caption" color="muted">
              Code: {code_fournisseur}
            </Text>
          </div>
        </div>
        
        {statut && (
          <Badge variant={getStatutVariant(statut)} size="sm">
            {statut}
          </Badge>
        )}
      </CardHeader>
      
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Icon icon={Package} variant="muted" size="sm" />
            <Text variant="caption" color="secondary">
              {nom_pharmacie}
            </Text>
          </div>
          
          {email && (
            <div className="flex items-center gap-2">
              <Text variant="caption" color="muted">
                📧 {email}
              </Text>
            </div>
          )}
          
          {telephone && (
            <div className="flex items-center gap-2">
              <Text variant="caption" color="muted">
                📞 {telephone}
              </Text>
            </div>
          )}
        </div>
            
      </CardContent>
    </Card>
  )
}