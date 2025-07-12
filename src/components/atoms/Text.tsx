import { HTMLAttributes, ElementType, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface TextProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'caption' | 'overline'
  weight?: 'light' | 'normal' | 'medium' | 'semibold' | 'bold'
  color?: 'primary' | 'secondary' | 'muted' | 'accent'
}

const Text = forwardRef<HTMLElement, TextProps>(
  ({ 
    as, 
    className, 
    variant = 'body', 
    weight = 'normal', 
    color = 'primary',
    children, 
    ...props 
  }, ref) => {
    const Component = as || getDefaultComponent(variant)
    
    const baseStyles = "transition-colors duration-300"
    
    const variants = {
      h1: "text-3xl leading-tight tracking-tight",
      h2: "text-2xl leading-tight tracking-tight", 
      h3: "text-xl leading-snug",
      h4: "text-lg leading-snug",
      body: "text-sm leading-relaxed",
      caption: "text-xs leading-normal",
      overline: "text-xs uppercase tracking-wider leading-normal"
    }
    
    const weights = {
      light: "font-light",
      normal: "font-normal", 
      medium: "font-medium",
      semibold: "font-semibold",
      bold: "font-bold"
    }
    
    const colors = {
      primary: "text-gray-900",
      secondary: "text-gray-600", 
      muted: "text-gray-500",
      accent: "text-gray-800"
    }

    return (
      <Component
        ref={ref}
        className={cn(baseStyles, variants[variant], weights[weight], colors[color], className)}
        {...props}
      >
        {children}
      </Component>
    )
  }
)

function getDefaultComponent(variant: TextProps['variant']): ElementType {
  switch (variant) {
    case 'h1': return 'h1'
    case 'h2': return 'h2' 
    case 'h3': return 'h3'
    case 'h4': return 'h4'
    case 'overline': return 'span'
    default: return 'p'
  }
}

Text.displayName = 'Text'

export { Text }