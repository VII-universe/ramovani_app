'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStore, selectors } from '@/store'
import type { KnownDimensionAxis } from '@ramovani/shared-types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

export function DimensionInput() {
  const router = useRouter()

  const processedArtworkUrl  = useStore(selectors.processedArtworkUrl)
  const processedArtworkSize = useStore(selectors.processedArtworkSize)
  const uploadedFile         = useStore(selectors.uploadedFile)
  const uploadStatus         = useStore(selectors.uploadStatus)
  const uploadError          = useStore(selectors.uploadError)
  const setManualDimensions  = useStore((s) => s.setManualDimensions)
  const analyzeArtwork       = useStore((s) => s.analyzeArtwork)

  const [axis, setAxis] = useState<KnownDimensionAxis>('width')
  const [valueMm, setValueMm] = useState('')

  // Client-side path: perspective correction was applied
  const isManualPath = processedArtworkUrl !== null && processedArtworkSize !== null

  const isLoading  = uploadStatus === 'uploading'
  const canSubmit  = !!valueMm && Number(valueMm) > 0 && !isLoading &&
    (isManualPath || !!uploadedFile)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    if (isManualPath) {
      // Pure client-side: compute mm dimensions from pixel size + known dimension
      setManualDimensions(axis, Number(valueMm))
      router.push('/configure/frame')
    } else {
      // Vision API path (requires Node Alpha running on :8001)
      await analyzeArtwork({
        file: uploadedFile!,
        knownDimensionAxis: axis,
        knownDimensionMm: Number(valueMm),
      })
      router.push('/configure/frame')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Axis selector */}
      <div className="flex flex-col gap-1.5">
        <span className="font-mono text-2xs uppercase tracking-[0.12em] text-ink-tertiary">
          Known dimension
        </span>
        <div className="flex gap-0">
          {(['width', 'height'] as const).map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAxis(a)}
              className={[
                'h-11 flex-1 border font-mono text-xs uppercase tracking-[0.1em] transition-colors duration-200',
                axis === a
                  ? 'border-ink bg-ink text-canvas'
                  : 'border-canvas-muted bg-canvas text-ink-secondary hover:border-ink-placeholder',
              ].join(' ')}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      <Input
        label={`${axis.charAt(0).toUpperCase() + axis.slice(1)} in mm`}
        type="number"
        inputMode="decimal"
        min="10"
        max="3000"
        step="0.1"
        unit="mm"
        value={valueMm}
        onChange={(e) => setValueMm(e.target.value)}
        placeholder="e.g. 297"
      />

      {uploadError && (
        <p className="font-sans text-sm text-error">{uploadError.message}</p>
      )}

      <Button type="submit" disabled={!canSubmit} className="w-full" size="lg">
        {isLoading ? (
          <span className="flex items-center gap-3">
            <Spinner size="sm" />
            Analysing…
          </span>
        ) : isManualPath ? (
          'Continue →'
        ) : (
          'Analyse & continue'
        )}
      </Button>
    </form>
  )
}
