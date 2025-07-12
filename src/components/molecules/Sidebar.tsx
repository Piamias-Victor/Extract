// src/components/molecules/Sidebar.tsx
import { useState } from 'react'
import { LucideIcon } from 'lucide-react'
import { Card } from '@/components/atoms/Card'
import { Text } from '@/components/atoms/Text'
import { cn } from '@/lib/utils'

interface NavigationItem {
  id: string
  label: string
  icon: LucideIcon
  active?: boolean
  disabled?: boolean
}

interface SidebarProps {
  items: NavigationItem[]
  onItemClick: (itemId: string) => void
  className?: string
  defaultCollapsed?: boolean
}

export function Sidebar({ 
  items, 
  onItemClick, 
  className,
  defaultCollapsed = true 
}: SidebarProps): React.ReactElement {
  const [isExpanded, setIsExpanded] = useState<boolean>(!defaultCollapsed)

  const handleMouseEnter = (): void => {
    setIsExpanded(true)
  }

  const handleMouseLeave = (): void => {
    setIsExpanded(false)
  }

  return (
    <div className="relative">
      <Card 
        variant="elevated" 
        className={cn(
          "fixed left-4 top-4 bottom-4 z-50 flex flex-col transition-all duration-200 ease-out",
          isExpanded ? "w-64" : "w-16",
          className
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200/60">
          <div className="flex items-center overflow-hidden">
            {isExpanded ? (
              <Text variant="h4" weight="bold" color="accent" className="transition-opacity duration-200">
                EXTRACT
              </Text>
            ) : (
              <Text variant="h4" weight="bold" color="accent" className="text-center w-full">
                E
              </Text>
            )}
          </div>
        </div>

        {/* Navigation items */}
        <div className="flex-1 p-2 space-y-1">
          {items.map((item) => {
            const IconComponent = item.icon
            
            return (
              <button
                key={item.id}
                onClick={() => !item.disabled && onItemClick(item.id)}
                disabled={item.disabled}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150",
                  "hover:bg-gray-100/60 focus:outline-none focus:ring-2 focus:ring-gray-300/50",
                  item.active && "bg-gray-900 text-white hover:bg-gray-800",
                  item.disabled && "opacity-50 cursor-not-allowed",
                  !item.active && "text-gray-700"
                )}
              >
                <IconComponent 
                  className={cn(
                    "w-5 h-5 flex-shrink-0 transition-colors duration-150",
                    item.active ? "text-white" : "text-gray-700"
                  )}
                />
                
                <div className={cn(
                  "transition-all duration-200 ease-out overflow-hidden",
                  isExpanded ? "opacity-100 max-w-none" : "opacity-0 max-w-0"
                )}>
                  <Text 
                    variant="body" 
                    weight="medium"
                    className={cn(
                      "whitespace-nowrap transition-colors duration-150",
                      item.active ? "text-white" : "text-gray-700"
                    )}
                  >
                    {item.label}
                  </Text>
                </div>
              </button>
            )
          })}
        </div>

        {/* Footer collapsé */}
        <div className={cn(
          "p-2 border-t border-gray-200/60 transition-all duration-200",
          !isExpanded ? "opacity-100" : "opacity-0"
        )}>
          <div className="w-8 h-8 bg-gray-300 rounded-full mx-auto"></div>
        </div>
      </Card>
    </div>
  )
}