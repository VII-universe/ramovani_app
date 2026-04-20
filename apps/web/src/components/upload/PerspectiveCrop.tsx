'use client'

/**
 * PerspectiveCrop — interactive 4-point perspective correction.
 *
 * Renders the uploaded image with four draggable handle circles.
 * The user drags the handles to the physical corners of the artwork,
 * then clicks "Apply". A client-side homography warp is computed and
 * the result (a JPEG data URL) is stored in Zustand.
 *
 * Corner order: TL → TR → BR → BL  (clockwise from top-left)
 */

import { useRef, useState, useCallback, useEffect } from 'react'
import { useStore, selectors } from '@/store'
import { warpPerspective } from '@/lib/perspectiveWarp'
import { Spinner } from '@/components/ui/spinner'

// ─────────────────────────────────────────────────────────────────────────────
// Types & constants
// ─────────────────────────────────────────────────────────────────────────────

/** Normalized [0,1] point relative to image width × height */
interface Pt { x: number; y: number }
type CornerIdx = 0 | 1 | 2 | 3

const CORNER_LABELS = ['TL', 'TR', 'BR', 'BL'] as const
const HANDLE_SIZE = 28  // display px — large enough for comfortable touch targets

const DEFAULT_CORNERS: [Pt, Pt, Pt, Pt] = [
  { x: 0.05, y: 0.05 },   // TL
  { x: 0.95, y: 0.05 },   // TR
  { x: 0.95, y: 0.95 },   // BR
  { x: 0.05, y: 0.95 },   // BL
]

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function PerspectiveCrop() {
  const previewUrl         = useStore(selectors.previewUrl)
  const setProcessedArtwork = useStore((s) => s.setProcessedArtwork)

  const [corners, setCorners] = useState<[Pt, Pt, Pt, Pt]>([...DEFAULT_CORNERS])
  const [dragging, setDragging] = useState<CornerIdx | null>(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const imgRef = useRef<HTMLImageElement>(null)

  // Reset corners when a new image is loaded
  useEffect(() => {
    setCorners([...DEFAULT_CORNERS])
    setError(null)
  }, [previewUrl])

  // ── Drag handlers ─────────────────────────────────────────────────────────

  const getImgRect = useCallback((): DOMRect | null =>
    imgRef.current?.getBoundingClientRect() ?? null, [])

  const clamp = (v: number) => Math.min(1, Math.max(0, v))

  const onPointerDown = useCallback((e: React.PointerEvent, idx: CornerIdx) => {
    e.preventDefault()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    setDragging(idx)
  }, [])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (dragging === null) return
    const rect = getImgRect()
    if (!rect) return
    setCorners((prev) => {
      const next = [...prev] as [Pt, Pt, Pt, Pt]
      next[dragging] = {
        x: clamp((e.clientX - rect.left) / rect.width),
        y: clamp((e.clientY - rect.top)  / rect.height),
      }
      return next
    })
  }, [dragging, getImgRect])

  const onPointerUp = useCallback(() => setDragging(null), [])

  // ── Apply warp ───────────────────────────────────────────────────────────

  const handleApply = useCallback(async () => {
    const img = imgRef.current
    if (!img) return
    setProcessing(true)
    setError(null)
    try {
      const w = img.naturalWidth, h = img.naturalHeight
      const pixelCorners = corners.map(({ x, y }) => [x * w, y * h] as [number, number])
      const result = await warpPerspective(img, pixelCorners)
      setProcessedArtwork(result.dataUrl, result.widthPx, result.heightPx)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Warp failed — try repositioning the handles.')
    } finally {
      setProcessing(false)
    }
  }, [corners, setProcessedArtwork])

  if (!previewUrl) return null

  // ── Polygon points in SVG viewBox="0 0 1 1" coordinates ─────────────────
  const polygonPts = corners.map(({ x, y }) => `${x},${y}`).join(' ')

  return (
    <div className="space-y-3">
      {/* ── Image + overlay ──────────────────────────────────────────────── */}
      <div
        className="relative select-none overflow-hidden rounded-sm bg-canvas-subtle"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {/* Source image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={previewUrl}
          alt="Artwork — drag handles to corners"
          className="block w-full"
          draggable={false}
        />

        {/* SVG polygon overlay — uses viewBox 0 0 1 1 stretched over the image */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 1 1"
          preserveAspectRatio="none"
          aria-hidden
        >
          {/* Shaded outside area */}
          <mask id="crop-mask">
            <rect width="1" height="1" fill="white" />
            <polygon points={polygonPts} fill="black" />
          </mask>
          <rect width="1" height="1" fill="rgba(0,0,0,0.45)" mask="url(#crop-mask)" />
          {/* Selection border */}
          <polygon
            points={polygonPts}
            fill="none"
            stroke="white"
            strokeWidth="0.004"
            strokeDasharray="0.015 0.008"
          />
        </svg>

        {/* Draggable corner handles — absolutely positioned divs */}
        {corners.map((pt, idx) => (
          <div
            key={idx}
            title={CORNER_LABELS[idx]}
            style={{
              position: 'absolute',
              left: `${pt.x * 100}%`,
              top: `${pt.y * 100}%`,
              width: HANDLE_SIZE,
              height: HANDLE_SIZE,
              transform: 'translate(-50%, -50%)',
              touchAction: 'none',
              cursor: dragging === idx ? 'grabbing' : 'grab',
            }}
            className="flex items-center justify-center rounded-full border-2 border-white bg-blue-500 shadow-lg transition-transform hover:scale-110 active:scale-100"
            onPointerDown={(e) => onPointerDown(e, idx as CornerIdx)}
          >
            <span className="font-mono text-[9px] font-bold text-white leading-none select-none">
              {CORNER_LABELS[idx]}
            </span>
          </div>
        ))}
      </div>

      {/* ── Instructions + Apply button ──────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <p className="font-sans text-xs text-ink-tertiary leading-relaxed">
          Drag the blue handles to each corner of your artwork to remove perspective distortion.
        </p>
        <button
          type="button"
          onClick={handleApply}
          disabled={processing}
          className="shrink-0 bg-ink px-5 py-2.5 font-mono text-xs uppercase tracking-[0.15em] text-canvas transition-opacity hover:opacity-75 disabled:opacity-40"
        >
          {processing
            ? <span className="flex items-center gap-2"><Spinner size="sm" /> Processing…</span>
            : 'Apply Correction →'}
        </button>
      </div>

      {error && (
        <p className="font-sans text-sm text-error">{error}</p>
      )}
    </div>
  )
}
