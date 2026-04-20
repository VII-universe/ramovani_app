'use client'

import type { FrameProfile } from '@ramovani/shared-types'
import { useStore, selectors } from '@/store'
import { formatPrice, formatMm, cn } from '@/lib/utils'
import { CATALOG_API_BASE } from '@/lib/api'
import { Badge } from '@/components/ui/badge'

interface FrameCardProps {
  frame: FrameProfile
}

export function FrameCard({ frame }: FrameCardProps) {
  const selectedFrame = useStore(selectors.selectedFrame)
  const selectFrame = useStore((s) => s.selectFrame)
  const markQuoteStale = useStore((s) => s.markQuoteStale)

  const isSelected = selectedFrame?.id === frame.id

  const handleSelect = () => {
    selectFrame(frame)
    markQuoteStale()
  }

  return (
    <button
      type="button"
      onClick={handleSelect}
      className={cn(
        'group relative flex flex-col text-left transition-all duration-250',
        'border bg-canvas hover:shadow-elevated',
        isSelected ? 'border-ink shadow-card' : 'border-canvas-muted',
      )}
    >
      {/* Thumbnail */}
      <div className="aspect-square w-full overflow-hidden bg-canvas-subtle">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${CATALOG_API_BASE}${frame.thumbnailUrl}`}
          alt={frame.name}
          className="h-full w-full object-cover transition-transform duration-450 group-hover:scale-[1.02]"
        />
      </div>

      {/* Info */}
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="font-sans text-sm font-medium text-ink">{frame.name}</p>
          {isSelected && (
            <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-ink" />
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline">{frame.material}</Badge>
          <Badge variant="outline">{frame.finish}</Badge>
        </div>

        <div className="flex items-center justify-between">
          <span className="font-mono text-xs text-ink-tertiary">
            {formatMm(frame.profileWidthMm)} wide
          </span>
          <span className="font-mono text-sm text-ink">
            {formatPrice(frame.pricePerMeter, frame.currency)}/m
          </span>
        </div>
      </div>
    </button>
  )
}
