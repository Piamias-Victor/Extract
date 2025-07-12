import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardHeader, CardContent } from '@/components/atoms/Card'
import { Text } from '@/components/atoms/Text'
import { cn } from '@/lib/utils'

interface ChartData {
  name: string
  value: number
  [key: string]: string | number
}

interface ChartProps {
  title: string
  data: ChartData[]
  className?: string
  height?: number
  loading?: boolean
  color?: string
  subtitle?: string
}

export function Chart({ 
  title,
  data,
  className,
  height = 300,
  loading = false,
  color = "#374151",
  subtitle
}: ChartProps): React.ReactElement {
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Card variant="elevated" className="p-3 shadow-lg">
          <Text variant="caption" weight="medium" className="mb-1">
            {label}
          </Text>
          <Text variant="body" weight="semibold" color="accent">
            {payload[0].value.toLocaleString('fr-FR')} €
          </Text>
        </Card>
      )
    }
    return null
  }

  if (loading) {
    return (
      <Card variant="elevated" className={cn("animate-pulse", className)}>
        <CardHeader>
          <div className="h-6 bg-gray-300 rounded w-32"></div>
          {subtitle && <div className="h-4 bg-gray-300 rounded w-48 mt-1"></div>}
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-end gap-2">
                <div className="h-4 bg-gray-300 rounded w-8"></div>
                <div 
                  className="bg-gray-300 rounded w-4" 
                  style={{ height: Math.random() * 100 + 20 }}
                ></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card variant="elevated" className={className}>
      <CardHeader>
        <Text variant="h4" weight="semibold">
          {title}
        </Text>
        {subtitle && (
          <Text variant="caption" color="secondary">
            {subtitle}
          </Text>
        )}
      </CardHeader>
      
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.6} />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickLine={{ stroke: '#d1d5db' }}
            />
            <YAxis 
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickLine={{ stroke: '#d1d5db' }}
              tickFormatter={(value) => `${value.toLocaleString('fr-FR')}€`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
                dataKey="value" 
                fill={color}
                radius={[4, 4, 0, 0]}
                className="hover:opacity-80 transition-opacity duration-200"
                name="CA"
                />
                <Bar 
                dataKey="marge" 
                fill="#059669"
                radius={[4, 4, 0, 0]}
                className="hover:opacity-80 transition-opacity duration-200"
                name="Marge"
                />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}