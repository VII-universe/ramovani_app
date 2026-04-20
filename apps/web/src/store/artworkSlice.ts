// ─────────────────────────────────────────────────────────────────────────────
// artworkSlice — Node Alpha output + upload state
// Owns: the uploaded file, the vision analysis result, and upload lifecycle.
// Also owns the client-side perspective crop result (processedArtwork*).
// ─────────────────────────────────────────────────────────────────────────────
import type { StateCreator } from 'zustand'
import { castDraft } from 'immer'
import type {
  VisionResult,
  VisionUploadPayload,
  VisionAnalyzeError,
  KnownDimensionAxis,
} from '@ramovani/shared-types'
import type { StoreState } from './index'

export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'

export interface ArtworkSlice {
  // ── State ──────────────────────────────────────────────────────────────────
  /** The original File object selected by the user */
  uploadedFile: File | null
  /** Object URL for local preview before analysis */
  previewUrl: string | null
  uploadStatus: UploadStatus
  uploadProgress: number          // 0–100
  uploadError: VisionAnalyzeError | null
  /** Populated after a successful POST /analyze (Vision API path) */
  visionResult: VisionResult | null

  /**
   * Client-side perspective warp result — set after the user positions the
   * 4 crop handles and clicks "Apply Correction".
   * This is a JPEG data URL produced entirely in the browser (no Vision API).
   */
  processedArtworkUrl: string | null
  processedArtworkSize: { width: number; height: number } | null

  // ── Actions ────────────────────────────────────────────────────────────────
  setUploadedFile: (file: File) => void
  clearUploadedFile: () => void
  setProcessedArtwork: (url: string, width: number, height: number) => void
  clearProcessedArtwork: () => void
  /**
   * Client-side dimension calculation — skips the Vision API entirely.
   * Uses processedArtworkSize + the user-supplied known dimension to compute
   * widthMm / heightMm, then builds a synthetic VisionResult so the rest of
   * the UI (Scene, PriceSummary, etc.) works without changes.
   */
  setManualDimensions: (axis: KnownDimensionAxis, knownMm: number) => void
  /** Called by useVisionUpload hook — triggers the actual API call */
  analyzeArtwork: (payload: VisionUploadPayload) => Promise<void>
  resetArtwork: () => void
}

const initialArtworkState = {
  uploadedFile: null,
  previewUrl: null,
  uploadStatus: 'idle' as UploadStatus,
  uploadProgress: 0,
  uploadError: null,
  visionResult: null,
  processedArtworkUrl: null,
  processedArtworkSize: null,
}

export const createArtworkSlice: StateCreator<
  StoreState,
  [['zustand/immer', never]],
  [],
  ArtworkSlice
> = (set, get) => ({
  ...initialArtworkState,

  setUploadedFile: (file) => {
    set((state) => {
      if (state.previewUrl) URL.revokeObjectURL(state.previewUrl)
      state.uploadedFile = file
      state.previewUrl = URL.createObjectURL(file)
      state.uploadStatus = 'idle'
      state.uploadError = null
      state.visionResult = null
      state.processedArtworkUrl = null
      state.processedArtworkSize = null
    })
  },

  clearUploadedFile: () => {
    set((state) => {
      if (state.previewUrl) URL.revokeObjectURL(state.previewUrl)
      Object.assign(state, initialArtworkState)
    })
  },

  setProcessedArtwork: (url, width, height) => {
    set((state) => {
      state.processedArtworkUrl = url
      state.processedArtworkSize = { width, height }
      // Clear any previous vision result so the dimension form re-appears
      state.visionResult = null
      state.uploadStatus = 'idle'
      state.uploadError = null
    })
  },

  clearProcessedArtwork: () => {
    set((state) => {
      state.processedArtworkUrl = null
      state.processedArtworkSize = null
      state.visionResult = null
      state.uploadStatus = 'idle'
    })
  },

  setManualDimensions: (axis, knownMm) => {
    const { processedArtworkUrl, processedArtworkSize } = get()
    if (!processedArtworkUrl || !processedArtworkSize) return

    const { width: wPx, height: hPx } = processedArtworkSize
    const pixelsPerMm = axis === 'width' ? wPx / knownMm : hPx / knownMm
    const widthMm  = axis === 'width'  ? knownMm : wPx / pixelsPerMm
    const heightMm = axis === 'height' ? knownMm : hPx / pixelsPerMm

    // Build a synthetic VisionResult so all downstream consumers work unchanged.
    const synthetic: VisionResult = {
      id: `manual-${Date.now()}`,
      originalFilename: 'manual-crop',
      croppedImageUrl: processedArtworkUrl,
      dimensions: {
        widthMm,
        heightMm,
        widthPx: wPx,
        heightPx: hPx,
        pixelsPerMm,
        aspectRatio: widthMm / heightMm,
      },
      homography: {
        corners: [[0, 0], [wPx, 0], [wPx, hPx], [0, hPx]],
        transformMatrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
        confidence: 1.0,
      },
      processingTimeMs: 0,
      warnings: [],
    }

    set((state) => {
      state.visionResult = castDraft(synthetic)
      state.uploadStatus = 'success'
      state.uploadProgress = 100
    })
  },

  analyzeArtwork: async (payload) => {
    const { file, knownDimensionAxis, knownDimensionMm } = payload

    set((state) => {
      state.uploadStatus = 'uploading'
      state.uploadProgress = 0
      state.uploadError = null
    })

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('knownDimensionAxis', knownDimensionAxis)
      formData.append('knownDimensionMm', String(knownDimensionMm))

      const apiUrl = process.env['NEXT_PUBLIC_VISION_API_URL'] ?? 'http://localhost:8001'
      const response = await fetch(`${apiUrl}/analyze`, { method: 'POST', body: formData })

      if (!response.ok) {
        const error: VisionAnalyzeError = await response.json()
        set((state) => {
          state.uploadStatus = 'error'
          state.uploadError = error
        })
        return
      }

      const result: VisionResult = await response.json()
      set((state) => {
        state.visionResult = castDraft(result)
        state.uploadStatus = 'success'
        state.uploadProgress = 100
      })
    } catch {
      set((state) => {
        state.uploadStatus = 'error'
        state.uploadError = {
          code: 'PROCESSING_FAILED',
          message: 'Network error — please try again.',
        }
      })
    }
  },

  resetArtwork: () => {
    set((state) => {
      if (state.previewUrl) URL.revokeObjectURL(state.previewUrl)
      Object.assign(state, initialArtworkState)
    })
  },
})
