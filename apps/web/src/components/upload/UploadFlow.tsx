'use client'

/**
 * UploadFlow — state-driven orchestrator for Step 1.
 *
 * Phase A  (no file yet):          DropZone
 * Phase B  (file selected):        PerspectiveCrop  ← drag handles → Apply
 * Phase C  (correction applied):   corrected preview + DimensionInput
 *
 * The Vision API path still exists as a fallback inside DimensionInput —
 * if the user somehow arrives at Phase C without a processedArtworkUrl the
 * form falls back to calling POST /analyze.
 */

import { useCallback } from 'react'
import { useStore, selectors } from '@/store'
import { DropZone } from './DropZone'
import { PerspectiveCrop } from './PerspectiveCrop'
import { DimensionInput } from './DimensionInput'

export function UploadFlow() {
  const uploadedFile         = useStore(selectors.uploadedFile)
  const processedArtworkUrl  = useStore(selectors.processedArtworkUrl)
  const processedArtworkSize = useStore(selectors.processedArtworkSize)
  const clearProcessedArtwork = useStore((s) => s.clearProcessedArtwork)
  const clearUploadedFile     = useStore((s) => s.clearUploadedFile)

  const handleRecrop = useCallback(() => clearProcessedArtwork(), [clearProcessedArtwork])
  const handleReupload = useCallback(() => clearUploadedFile(), [clearUploadedFile])

  // ── Phase A: no file ──────────────────────────────────────────────────────
  if (!uploadedFile) {
    return <DropZone />
  }

  // ── Phase B: file selected, awaiting perspective correction ───────────────
  if (!processedArtworkUrl) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="font-sans text-sm font-medium text-ink">
            Position handles on your artwork's corners
          </p>
          <button
            type="button"
            onClick={handleReupload}
            className="font-mono text-2xs uppercase tracking-[0.12em] text-ink-tertiary transition-opacity hover:opacity-60"
          >
            ← Change image
          </button>
        </div>
        <PerspectiveCrop />
      </div>
    )
  }

  // ── Phase C: correction applied, enter physical dimension ─────────────────
  return (
    <div className="space-y-6">
      {/* Corrected image preview */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="font-mono text-2xs uppercase tracking-[0.12em] text-ink-tertiary">
            Corrected artwork
          </p>
          <button
            type="button"
            onClick={handleRecrop}
            className="font-mono text-2xs uppercase tracking-[0.12em] text-ink-tertiary transition-opacity hover:opacity-60"
          >
            ← Re-crop
          </button>
        </div>

        <div className="overflow-hidden rounded-sm bg-canvas-subtle">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={processedArtworkUrl}
            alt="Perspective-corrected artwork"
            className="max-h-72 w-full object-contain"
          />
        </div>

        {processedArtworkSize && (
          <p className="font-mono text-2xs text-ink-placeholder">
            {processedArtworkSize.width} × {processedArtworkSize.height} px
          </p>
        )}
      </div>

      {/* Dimension entry — client-side calculation, no Vision API needed */}
      <div className="border-t border-canvas-muted pt-6">
        <p className="mb-4 font-sans text-sm text-ink-secondary">
          Enter one physical measurement to calibrate the scale.
        </p>
        <DimensionInput />
      </div>
    </div>
  )
}
