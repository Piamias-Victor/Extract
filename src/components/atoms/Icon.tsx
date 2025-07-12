import { HTMLAttributes, forwardRef } from 'react'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface IconProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  icon: LucideIcon
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'default' | 'muted' | 'accent' | 'success' | 'warning' | 'error'
}

const Icon = forwardRef<HTMLDivElement, IconProps>(
  ({ className, icon: IconComponent, size = 'md', variant = 'default', ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center transition-colors duration-300"
    
    const sizes = {
      xs: "w-3 h-3",
      sm: "w-4 h-4", 
      md: "w-5 h-5",
      lg: "w-6 h-6",
      xl: "w-8 h-8"
    }
    
    const variants = {
      default: "text-gray-700",
      muted: "text-gray-500",
      accent: "text-gray-800",
      success: "text-green-600",
      warning: "text-yellow-600", 
      error: "text-red-600"
    }

    return (
      <div
        ref={ref}
        className={cn(baseStyles, className)}
        {...props}
      >
        <IconComponent className={cn(sizes[size], variants[variant])} />
      </div>
    )
  }
)

Icon.displayName = 'Icon'

export { Icon }