'use client'

import { useStore, selectors } from '@/store'
import { formatMm } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

export function VisionResultPreview() {
  const result = useStore(selectors.visionResult)
  if (!result) return null

  const { dimensions, homography, warnings } = result
  const confidence = Math.round(homography.confidence * 100)

  return (
    <div className="border border-canvas-muted bg-canvas-subtle p-6 space-y-4 animate-slide-up">
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-2xs uppercase tracking-[0.15em] text-ink-tertiary">
          Vision result
        </h3>
        <Badge variant={confidence >= 80 ? 'success' : confidence >= 50 ? 'gold' : 'error'}>
          {confidence}% confidence
        </Badge>
      </div>

      {/* Cropped preview */}
      <div className="overflow-hidden bg-canvas">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={result.croppedImageUrl}
          alt="Detected artwork"
          className="max-h-48 w-full object-contain"
        />
      </div>

      {/* Dimension readout */}
      <dl className="grid grid-cols-2 gap-x-8 gap-y-3">
        {(
          [
            ['Width', formatMm(dimensions.widthMm)],
            ['Height', formatMm(dimensions.heightMm)],
            ['Scale', `${dimensions.pixelsPerMm.toFixed(2)} px/mm`],
            ['Processing', `${result.processingTimeMs} ms`],
          ] as const
        ).map(([label, value]) => (
          <div key={label}>
            <dt className="font-mono text-2xs uppercase tracking-[0.1em] text-ink-placeholder">
              {label}
            </dt>
            <dd className="mt-0.5 font-mono text-sm text-ink">{value}</dd>
          </div>
        ))}
      </dl>

      {warnings.length > 0 && (
        <ul className="space-y-1">
          {warnings.map((w) => (
            <li key={w} className="font-sans text-xs text-warning">
              ⚠ {w}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
