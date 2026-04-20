'use client'

import type { PassepartoutProfile } from '@ramovani/shared-types'
import { useStore, selectors } from '@/store'
import { cn } from '@/lib/utils'
import { useCatalog } from '@/hooks/useCatalog'
import { Spinner } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PASSEPARTOUT_OVERLAP_MIN_MM, PASSEPARTOUT_OVERLAP_MAX_MM } from '@/lib/constants'

export function PassepartoutSwatch() {
  const { passepartouts, isLoading } = useCatalog()
  const selected = useStore(selectors.selectedPassepartout)
  const overlap = useStore(selectors.passepartoutOverlapMm)
  const selectPassepartout = useStore((s) => s.selectPassepartout)
  const clearPassepartout = useStore((s) => s.clearPassepartout)
  const setOverlap = useStore((s) => s.setPassepartoutOverlap)
  const markQuoteStale = useStore((s) => s.markQuoteStale)

  const handleSelect = (p: PassepartoutProfile) => {
    selectPassepartout(p)
    markQuoteStale()
  }

  if (isLoading) {
    return <div className="flex justify-center py-16"><Spinner size="lg" /></div>
  }

  return (
    <div className="space-y-8">
      {/* Swatch grid */}
      <div className="flex flex-wrap gap-4">
        {passepartouts.map((p) => (
          <button
            key={p.id}
            type="button"
            title={p.colorName}
            onClick={() => handleSelect(p)}
            className={cn(
              'group relative h-14 w-14 border-2 transition-all duration-200',
              selected?.id === p.id ? 'border-ink scale-110' : 'border-transparent hover:scale-105',
            )}
            style={{ backgroundColor: p.colorHex }}
          >
            <span className="sr-only">{p.colorName}</span>
          </button>
        ))}
      </div>

      {/* Selected info + overlap control */}
      {selected && (
        <div className="space-y-4 border-t border-canvas-muted pt-6 animate-slide-up">
          <div className="flex items-center justify-between">
            <p className="font-sans text-sm text-ink">
              {selected.colorName}
              <span className="ml-2 font-mono text-xs text-ink-tertiary">
                {selected.thicknessMm} mm board
              </span>
            </p>
            <Button variant="ghost" size="sm" onClick={() => { clearPassepartout(); markQuoteStale() }}>
              Remove mat
            </Button>
          </div>

          <Input
            label="Overlap per side"
            type="number"
            inputMode="decimal"
            min={PASSEPARTOUT_OVERLAP_MIN_MM}
            max={PASSEPARTOUT_OVERLAP_MAX_MM}
            step="1"
            unit="mm"
            value={overlap}
            onChange={(e) => { setOverlap(Number(e.target.value)); markQuoteStale() }}
          />
        </div>
      )}
    </div>
  )
}
