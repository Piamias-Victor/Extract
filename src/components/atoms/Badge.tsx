import { HTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
  size?: 'sm' | 'md' | 'lg'
}

const Badge = forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', size = 'md', children, ...props }, ref) => {
    const baseStyles = "inline-flex items-center font-medium transition-all duration-300 backdrop-blur-sm"
    
    const variants = {
      default: "bg-gray-100/80 text-gray-700 border border-gray-300/60",
      success: "bg-green-100/80 text-green-700 border border-green-300/60",
      warning: "bg-yellow-100/80 text-yellow-700 border border-yellow-300/60", 
      error: "bg-red-100/80 text-red-700 border border-red-300/60",
      info: "bg-blue-100/80 text-blue-700 border border-blue-300/60"
    }
    
    const sizes = {
      sm: "px-2 py-0.5 text-xs rounded-md",
      md: "px-2.5 py-1 text-sm rounded-lg",
      lg: "px-3 py-1.5 text-base rounded-xl"
    }

    return (
      <div
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Badge.displayName = 'Badge'

export { Badge }