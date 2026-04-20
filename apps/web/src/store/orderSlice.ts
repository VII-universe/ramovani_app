// ─────────────────────────────────────────────────────────────────────────────
// orderSlice — Node Beta pricing + BOM state
// Owns: quote lifecycle, BOM results, and the frozen OrderConfiguration snapshot.
// ─────────────────────────────────────────────────────────────────────────────
import type { StateCreator } from 'zustand'
import type {
  PriceQuote,
  FrameBOM,
  PassepartoutBOM,
  GlassBOM,
  OrderConfiguration,
  QuoteRequest,
} from '@ramovani/shared-types'
import type { StoreState } from './index'

export type QuoteStatus = 'idle' | 'fetching' | 'ready' | 'error' | 'stale'

export interface OrderSlice {
  // ── State ──────────────────────────────────────────────────────────────────
  quoteStatus: QuoteStatus
  quoteError: string | null

  /** Latest BOM calculations from Node Beta */
  frameBOM: FrameBOM | null
  passepartoutBOM: PassepartoutBOM | null
  glassBOM: GlassBOM | null
  priceQuote: PriceQuote | null

  /**
   * Frozen snapshot created when the user confirms the order.
   * Once set, it is never mutated — only cleared on full reset.
   */
  confirmedOrder: OrderConfiguration | null

  // ── Actions ────────────────────────────────────────────────────────────────
  /** Calls POST /quote and populates BOM + price. Marks quote stale on selection change. */
  fetchQuote: (request: QuoteRequest) => Promise<void>
  /** Called whenever frame/passepartout selection changes to signal re-fetch needed */
  markQuoteStale: () => void
  /** Freezes the current BOM + quote into confirmedOrder */
  confirmOrder: () => void
  resetOrder: () => void
}

const initialOrderState = {
  quoteStatus: 'idle' as QuoteStatus,
  quoteError: null,
  frameBOM: null,
  passepartoutBOM: null,
  glassBOM: null,
  priceQuote: null,
  confirmedOrder: null,
}

export const createOrderSlice: StateCreator<
  StoreState,
  [['zustand/immer', never]],
  [],
  OrderSlice
> = (set, get) => ({
  ...initialOrderState,

  fetchQuote: async (request) => {
    set((state) => {
      state.quoteStatus = 'fetching'
      state.quoteError = null
    })

    try {
      const apiUrl = process.env['NEXT_PUBLIC_CATALOG_API_URL'] ?? 'http://localhost:8002'

      const response = await fetch(`${apiUrl}/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const body = await response.json()
        set((state) => {
          state.quoteStatus = 'error'
          state.quoteError = body?.message ?? 'Failed to fetch quote.'
        })
        return
      }

      const data: {
        frameBOM: FrameBOM
        passepartoutBOM?: PassepartoutBOM
        glassBOM?: GlassBOM
        quote: PriceQuote
      } = await response.json()

      set((state) => {
        state.frameBOM = data.frameBOM
        state.passepartoutBOM = data.passepartoutBOM ?? null
        state.glassBOM = data.glassBOM ?? null
        state.priceQuote = data.quote
        state.quoteStatus = 'ready'
      })
    } catch {
      set((state) => {
        state.quoteStatus = 'error'
        state.quoteError = 'Network error — please try again.'
      })
    }
  },

  markQuoteStale: () => {
    set((state) => {
      if (state.quoteStatus === 'ready') {
        state.quoteStatus = 'stale'
      }
    })
  },

  confirmOrder: () => {
    const s = get()
    const { visionResult } = s
    const { selectedFrame, selectedPassepartout, passepartoutOverlapMm, includeGlass } = s
    const { frameBOM, passepartoutBOM, glassBOM, priceQuote } = s

    if (!visionResult || !selectedFrame || !frameBOM || !priceQuote) {
      console.error('[orderSlice] confirmOrder called with incomplete state')
      return
    }

    const snapshot: OrderConfiguration = {
      artworkWidthMm: visionResult.dimensions.widthMm,
      artworkHeightMm: visionResult.dimensions.heightMm,

      frameProfileId: selectedFrame.id,
      frameProfileName: selectedFrame.name,
      frameProfileWidthMm: selectedFrame.profileWidthMm,
      frameRabbetDepthMm: selectedFrame.rabbetDepthMm,
      frameRabbetWidthMm: selectedFrame.rabbetWidthMm,

      ...(selectedPassepartout && {
        passepartoutProfileId: selectedPassepartout.id,
        passepartoutProfileName: selectedPassepartout.name,
        passepartoutOverlapMm,
      }),

      includeGlass,

      frameBOM,
      ...(passepartoutBOM && { passepartoutBOM }),
      ...(glassBOM && { glassBOM }),
      quote: priceQuote,
    }

    set((state) => {
      state.confirmedOrder = snapshot
    })
  },

  resetOrder: () => {
    set((state) => {
      Object.assign(state, initialOrderState)
    })
  },
})
