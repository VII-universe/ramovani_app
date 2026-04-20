import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center font-mono text-2xs uppercase tracking-[0.12em]',
  {
    variants: {
      variant: {
        default: 'bg-canvas-muted text-ink-secondary px-2 py-0.5',
        gold: 'bg-gold-muted text-gold-dark px-2 py-0.5',
        success: 'bg-success/10 text-success px-2 py-0.5',
        error: 'bg-error/10 text-error px-2 py-0.5',
        outline: 'border border-canvas-muted text-ink-tertiary px-2 py-0.5',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
