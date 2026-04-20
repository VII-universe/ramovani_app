import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  unit?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, unit, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="font-mono text-2xs uppercase tracking-[0.12em] text-ink-tertiary"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          <input
            id={inputId}
            ref={ref}
            className={cn(
              'h-11 w-full border border-canvas-muted bg-canvas px-4 font-sans text-sm text-ink placeholder:text-ink-placeholder',
              'focus:border-ink focus:outline-none focus:ring-0',
              'transition-colors duration-200',
              unit && 'pr-16',
              error && 'border-error',
              className,
            )}
            {...props}
          />
          {unit && (
            <span className="pointer-events-none absolute right-4 font-mono text-xs text-ink-tertiary">
              {unit}
            </span>
          )}
        </div>
        {error && (
          <p className="font-sans text-xs text-error">{error}</p>
        )}
      </div>
    )
  },
)
Input.displayName = 'Input'

export { Input }
