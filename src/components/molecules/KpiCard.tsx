import { HTMLAttributes } from 'react'
import { LucideIcon } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/atoms/Card'
import { Text } from '@/components/atoms/Text'
import { Badge } from '@/components/atoms/Badge'
import { Icon } from '@/components/atoms/Icon'
import { cn } from '@/lib/utils'

interface KpiCardProps extends HTMLAttributes<HTMLDivElement> {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: {
    value: number
    label?: string
    type: 'positive' | 'negative' | 'neutral'
  }
  subtitle?: string
  loading?: boolean
  variant?: 'default' | 'elevated'
}

export function KpiCard({ 
  className,
  title,
  value,
  icon,
  trend,
  subtitle,
  loading = false,
  variant = 'elevated',
  ...props 
}: KpiCardProps): React.ReactElement {
  const formatValue = (val: string | number): string => {
    if (typeof val === 'number') {
      return val.toLocaleString('fr-FR')
    }
    return val
  }

  const getTrendVariant = (type: 'positive' | 'negative' | 'neutral') => {
    switch (type) {
      case 'positive': return 'success'
      case 'negative': return 'error'
      case 'neutral': return 'info'
      default: return 'default'
    }
  }

  const getTrendIcon = (type: 'positive' | 'negative' | 'neutral') => {
    switch (type) {
      case 'positive': return 'success'
      case 'negative': return 'error'
      case 'neutral': return 'default'
      default: return 'default'
    }
  }

  if (loading) {
    return (
      <Card variant={variant} className={cn("animate-pulse", className)} {...props}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="h-3 bg-gray-300 rounded w-20"></div>
          <div className="h-4 w-4 bg-gray-300 rounded"></div>
        </CardHeader>
        <CardContent>
          <div className="h-8 bg-gray-300 rounded w-24 mb-2"></div>
          <div className="h-4 bg-gray-300 rounded w-32"></div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card 
      variant={variant} 
      className={cn("transition-all duration-300 hover:scale-105", className)} 
      {...props}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Text variant="overline" color="secondary" weight="medium">
          {title}
        </Text>
        <Icon icon={icon} variant={getTrendIcon(trend?.type || 'neutral')} size="sm" />
      </CardHeader>
      
      <CardContent>
        <Text variant="h2" weight="bold" className="mb-1">
          {formatValue(value)}
        </Text>
        
        {trend && (
          <div className="flex items-center gap-2">
            <Badge variant={getTrendVariant(trend.type)} size="sm">
              {trend.value > 0 ? '+' : ''}{trend.value}%
            </Badge>
            {trend.label && (
              <Text variant="caption" color="muted">
                {trend.label}
              </Text>
            )}
          </div>
        )}
        
        {subtitle && !trend && (
          <Text variant="caption" color="muted">
            {subtitle}
          </Text>
        )}
      </CardContent>
    </Card>
  )
}