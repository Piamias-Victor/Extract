import { LucideIcon } from 'lucide-react'
import { Card } from '@/components/atoms/Card'
import { Text } from '@/components/atoms/Text'
import { Badge } from '@/components/atoms/Badge'
import { Icon } from '@/components/atoms/Icon'
import { cn } from '@/lib/utils'

interface NavigationTab {
  id: string
  label: string
  icon?: LucideIcon
  count?: number
  active?: boolean
  disabled?: boolean
}

interface NavigationProps {
  tabs: NavigationTab[]
  onTabClick: (tabId: string) => void
  className?: string
  variant?: 'tabs' | 'pills'
  size?: 'sm' | 'md' | 'lg'
}

export function Navigation({ 
  tabs, 
  onTabClick, 
  className,
  variant = 'tabs',
  size = 'md'
}: NavigationProps): React.ReactElement {
  
  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm", 
    lg: "px-6 py-3 text-base"
  }

  if (variant === 'pills') {
    return (
      <Card variant="default" className={cn("p-2", className)}>
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && onTabClick(tab.id)}
              disabled={tab.disabled}
              className={cn(
                "flex items-center gap-2 rounded-lg transition-all duration-200",
                "hover:bg-gray-100/60 focus:outline-none focus:ring-2 focus:ring-gray-300/50",
                sizeClasses[size],
                tab.active && "bg-gray-900 text-white hover:bg-gray-800",
                tab.disabled && "opacity-50 cursor-not-allowed",
                !tab.active && "text-gray-700"
              )}
            >
              {tab.icon && (
                <Icon 
                  icon={tab.icon} 
                  size="sm" 
                  className={tab.active ? "text-white" : "text-gray-600"}
                />
              )}
              
              <Text 
                variant="body" 
                weight="medium"
                className={cn(
                  "transition-colors duration-200",
                  tab.active ? "text-white" : "text-gray-700"
                )}
              >
                {tab.label}
              </Text>
              
              {tab.count !== undefined && (
                <Badge 
                  variant={tab.active ? "info" : "default"} 
                  size="sm"
                  className={tab.active ? "bg-white/20 text-white border-white/30" : ""}
                >
                  {tab.count}
                </Badge>
              )}
            </button>
          ))}
        </div>
      </Card>
    )
  }

  // Variant tabs (default)
  return (
    <Card variant="default" className={cn("overflow-hidden", className)}>
      <div className="flex border-b border-gray-200/60">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && onTabClick(tab.id)}
            disabled={tab.disabled}
            className={cn(
              "flex items-center gap-2 border-b-2 transition-all duration-200",
              "hover:bg-gray-50/60 focus:outline-none",
              sizeClasses[size],
              tab.active 
                ? "border-gray-900 bg-gray-50/40 text-gray-900" 
                : "border-transparent text-gray-600 hover:text-gray-800",
              tab.disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {tab.icon && (
              <Icon 
                icon={tab.icon} 
                size="sm" 
                variant={tab.active ? "accent" : "muted"}
              />
            )}
            
            <Text 
              variant="body" 
              weight={tab.active ? "semibold" : "medium"}
              color={tab.active ? "accent" : "secondary"}
            >
              {tab.label}
            </Text>
            
            {tab.count !== undefined && (
              <Badge variant="default" size="sm">
                {tab.count}
              </Badge>
            )}
          </button>
        ))}
      </div>
    </Card>
  )
}