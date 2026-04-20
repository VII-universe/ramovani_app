import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center font-sans text-sm uppercase tracking-[0.12em] transition-opacity duration-250 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40',
  {
    variants: {
      variant: {
        primary: 'bg-ink text-canvas hover:opacity-75',
        secondary: 'border border-ink text-ink hover:bg-canvas-subtle',
        ghost: 'text-ink-secondary hover:text-ink hover:bg-canvas-subtle',
        gold: 'bg-gold text-canvas hover:opacity-80',
        destructive: 'bg-error text-canvas hover:opacity-80',
      },
      size: {
        sm: 'h-8 px-4 text-xs',
        md: 'h-11 px-8',
        lg: 'h-14 px-12 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
)
Button.displayName = 'Button'

export { Button, buttonVariants }
