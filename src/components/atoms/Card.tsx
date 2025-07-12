import { HTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'bordered' | 'flat'
  blur?: 'sm' | 'md' | 'lg'
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', blur = 'md', children, ...props }, ref) => {
    const baseStyles = "rounded-xl transition-all duration-300 ease-in-out"
    
    const variants = {
      default: "bg-white/70 border border-gray-200/60 shadow-lg shadow-gray-500/10",
      elevated: "bg-white/80 border border-gray-200/70 shadow-xl shadow-gray-500/15 hover:shadow-gray-500/20",
      bordered: "bg-white/60 border-2 border-gray-300/60",
      flat: "bg-gray-50/90 border border-gray-200/80"
    }
    
    const blurs = {
      sm: "backdrop-blur-sm",
      md: "backdrop-blur-md", 
      lg: "backdrop-blur-lg"
    }

    return (
      <div
        ref={ref}
        className={cn(baseStyles, variants[variant], blurs[blur], className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col space-y-1.5 p-6 pb-4", className)}
      {...props}
    />
  )
)
CardHeader.displayName = 'CardHeader'

const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
  )
)
CardContent.displayName = 'CardContent'

export { Card, CardHeader, CardContent }