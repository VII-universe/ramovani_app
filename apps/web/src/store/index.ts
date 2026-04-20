// ─────────────────────────────────────────────────────────────────────────────
// Zustand store — root
// Combines all slices using immer middleware for safe mutations.
// Usage:  import { useStore } from '@/store'
//         const visionResult = useStore(s => s.visionResult)
// ─────────────────────────────────────────────────────────────────────────────
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { devtools, persist } from 'zustand/middleware'

import { createArtworkSlice, type ArtworkSlice } from './artworkSlice'
import { createSelectionSlice, type SelectionSlice } from './selectionSlice'
import { createOrderSlice, type OrderSlice } from './orderSlice'

// ── Combined store shape ──────────────────────────────────────────────────────

export type StoreState = ArtworkSlice & SelectionSlice & OrderSlice

// ── Store instance ────────────────────────────────────────────────────────────

export const useStore = create<StoreState>()(
  persist(
    devtools(
      immer((...args) => ({
        ...createArtworkSlice(...args),
        ...createSelectionSlice(...args),
        ...createOrderSlice(...args),
      })),
      {
        name: 'ramovani-store',
        enabled: process.env['NODE_ENV'] === 'development',
      },
    ),
    {
      name: 'configurator-storage',
      // skipHydration prevents React hydration mismatches.
      // persist reads localStorage synchronously on the client, which would cause
      // the first client render (with persisted state) to differ from the server
      // HTML (with initial state). skipHydration defers the localStorage read
      // until after hydration; StoreHydration calls rehydrate() in useEffect.
      skipHydration: true,
      // Only persist what survives serialisation and fits in localStorage.
      // visionResult is excluded: croppedImageUrl may be a data URL (hundreds of KB).
      // File objects and blob: URLs are runtime-only; BOM/quote can be re-fetched.
      partialize: (state) => ({
        selectedFrame: state.selectedFrame,
        selectedPassepartout: state.selectedPassepartout,
        passepartoutOverlapMm: state.passepartoutOverlapMm,
        includeGlass: state.includeGlass,
      }),
    },
  ),
)

// ── Typed selectors (memoisation-friendly) ────────────────────────────────────
// Use these instead of inline arrow functions to stabilise references.

export const selectors = {
  // Artwork
  uploadedFile: (s: StoreState) => s.uploadedFile,
  previewUrl: (s: StoreState) => s.previewUrl,
  uploadStatus: (s: StoreState) => s.uploadStatus,
  uploadProgress: (s: StoreState) => s.uploadProgress,
  uploadError: (s: StoreState) => s.uploadError,
  visionResult: (s: StoreState) => s.visionResult,
  artworkDimensions: (s: StoreState) => s.visionResult?.dimensions ?? null,
  processedArtworkUrl: (s: StoreState) => s.processedArtworkUrl,
  processedArtworkSize: (s: StoreState) => s.processedArtworkSize,

  // Selection
  selectedFrame: (s: StoreState) => s.selectedFrame,
  selectedPassepartout: (s: StoreState) => s.selectedPassepartout,
  passepartoutOverlapMm: (s: StoreState) => s.passepartoutOverlapMm,
  includeGlass: (s: StoreState) => s.includeGlass,

  // Order
  quoteStatus: (s: StoreState) => s.quoteStatus,
  quoteError: (s: StoreState) => s.quoteError,
  frameBOM: (s: StoreState) => s.frameBOM,
  passepartoutBOM: (s: StoreState) => s.passepartoutBOM,
  glassBOM: (s: StoreState) => s.glassBOM,
  priceQuote: (s: StoreState) => s.priceQuote,
  confirmedOrder: (s: StoreState) => s.confirmedOrder,

  // ── Derived / computed ──────────────────────────────────────────────────────

  /** True when the user has everything needed to fetch a quote */
  canFetchQuote: (s: StoreState): boolean =>
    s.visionResult !== null && s.selectedFrame !== null,

  /** True when the user can proceed to checkout */
  canConfirmOrder: (s: StoreState): boolean =>
    s.quoteStatus === 'ready' &&
    s.frameBOM !== null &&
    s.priceQuote !== null &&
    s.confirmedOrder === null,

  /** True when the 3D scene has enough data to render */
  canRenderScene: (s: StoreState): boolean =>
    s.visionResult !== null && s.selectedFrame !== null,
} as const
