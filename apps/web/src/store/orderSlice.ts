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
import { computeClientPrice } from '@/lib/pricing'

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

  /** ID returned by POST /orders after a successful submission */
  submittedOrderId: string | null
  submitError: string | null

  // ── Actions ────────────────────────────────────────────────────────────────
  /** Calls POST /quote and populates BOM + price. Marks quote stale on selection change. */
  fetchQuote: (request: QuoteRequest) => Promise<void>
  /** Called whenever frame/passepartout selection changes to signal re-fetch needed */
  markQuoteStale: () => void
  /** Freezes the current BOM + quote into confirmedOrder */
  confirmOrder: () => void
  /**
   * Freezes the snapshot (like confirmOrder) then POSTs to POST /orders.
   * Returns the new order ID on success, throws on failure.
   */
  submitOrder: (customerEmail: string) => Promise<string>
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
  submittedOrderId: null,
  submitError: null,
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
    const { visionResult, selectedFrame, selectedPassepartout, passepartoutOverlapMm, includeGlass } = s

    if (!selectedFrame) {
      console.error('[orderSlice] confirmOrder called without frame selection')
      return
    }

    const dims = visionResult?.dimensions
    const artworkWidthMm  = dims?.widthMm  ?? 300
    const artworkHeightMm = dims?.heightMm ?? 400

    // ── BOM + quote — use API data when available, otherwise synthesise ────────
    const overlapMm      = selectedPassepartout ? passepartoutOverlapMm : 0
    const outerWidthMm   = artworkWidthMm  + 2 * overlapMm
    const outerHeightMm  = artworkHeightMm + 2 * overlapMm
    const railLen        = (dim: number) => dim + 2 * selectedFrame.profileWidthMm
    const topBottomMm    = railLen(outerWidthMm)
    const leftRightMm    = railLen(outerHeightMm)

    const resolvedFrameBOM: FrameBOM = s.frameBOM ?? {
      frameOuterWidthMm:   outerWidthMm,
      frameOuterHeightMm:  outerHeightMm,
      topRailMm:           topBottomMm,
      bottomRailMm:        topBottomMm,
      leftStileMm:         leftRightMm,
      rightStileMm:        leftRightMm,
      totalMoldingMm:      topBottomMm * 2 + leftRightMm * 2,
      totalMoldingMeters:  (topBottomMm * 2 + leftRightMm * 2) / 1_000,
    }

    let resolvedPriceQuote: PriceQuote = s.priceQuote ?? (() => {
      const bp = computeClientPrice({
        artworkWidthMm, artworkHeightMm,
        selectedFrame, selectedPassepartout,
        passepartoutOverlapMm, includeGlass,
      })
      return {
        quoteId:    `client-${Date.now()}`,
        validUntil: new Date(Date.now() + 24 * 60 * 60 * 1_000).toISOString(),
        lineItems:  bp.lineItems.map((li) => ({
          description: li.label,
          quantity:    1,
          unit:        'piece',
          unitPrice:   li.amount,
          totalPrice:  li.amount,
          currency:    li.currency,
        })),
        subtotal: bp.subtotal,
        tax:      bp.vat,
        taxRate:  bp.vatRate,
        total:    bp.total,
        currency: bp.currency,
      }
    })()

    const resolvedPassepartoutBOM: PassepartoutBOM | undefined =
      s.passepartoutBOM ?? (selectedPassepartout
        ? {
            outerWidthMm,
            outerHeightMm,
            innerWidthMm:      artworkWidthMm  - 2 * overlapMm,
            innerHeightMm:     artworkHeightMm - 2 * overlapMm,
            overlapPerSideMm:  overlapMm,
            areaSqMm:          outerWidthMm * outerHeightMm,
            areaSqMeters:      (outerWidthMm * outerHeightMm) / 1_000_000,
          }
        : undefined)

    const resolvedGlassBOM: GlassBOM | undefined =
      s.glassBOM ?? (includeGlass
        ? {
            widthMm:      artworkWidthMm,
            heightMm:     artworkHeightMm,
            areaSqMm:     artworkWidthMm * artworkHeightMm,
            areaSqMeters: (artworkWidthMm * artworkHeightMm) / 1_000_000,
          }
        : undefined)

    const snapshot: OrderConfiguration = {
      artworkWidthMm,
      artworkHeightMm,
      frameProfileId:      selectedFrame.id,
      frameProfileName:    selectedFrame.name,
      frameProfileWidthMm: selectedFrame.profileWidthMm,
      frameRabbetDepthMm:  selectedFrame.rabbetDepthMm,
      frameRabbetWidthMm:  selectedFrame.rabbetWidthMm,

      ...(selectedPassepartout && {
        passepartoutProfileId:   selectedPassepartout.id,
        passepartoutProfileName: selectedPassepartout.name,
        passepartoutOverlapMm,
      }),

      includeGlass,
      frameBOM: resolvedFrameBOM,
      ...(resolvedPassepartoutBOM && { passepartoutBOM: resolvedPassepartoutBOM }),
      ...(resolvedGlassBOM        && { glassBOM:        resolvedGlassBOM }),
      quote: resolvedPriceQuote,
    }

    set((state) => {
      state.confirmedOrder = snapshot
    })
  },

  submitOrder: async (customerEmail: string): Promise<string> => {
    // Build the snapshot first (reuses confirmOrder logic)
    get().confirmOrder()

    // Read the freshly-set snapshot synchronously (Zustand set is sync)
    const snapshot = get().confirmedOrder
    if (!snapshot) throw new Error('Failed to build order snapshot')

    const apiUrl = process.env['NEXT_PUBLIC_CATALOG_API_URL'] ?? 'http://localhost:8002'

    set((state) => { state.submitError = null })

    const res = await fetch(`${apiUrl}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerEmail,
        artworkWidthMm:  snapshot.artworkWidthMm,
        artworkHeightMm: snapshot.artworkHeightMm,
        frameProfileId:   snapshot.frameProfileId,
        frameProfileName: snapshot.frameProfileName,
        ...(snapshot.passepartoutProfileId   && { passepartoutProfileId:   snapshot.passepartoutProfileId }),
        ...(snapshot.passepartoutProfileName && { passepartoutProfileName: snapshot.passepartoutProfileName }),
        ...(snapshot.passepartoutOverlapMm   && { passepartoutOverlapMm:   snapshot.passepartoutOverlapMm }),
        includeGlass: snapshot.includeGlass,
        totalPrice: snapshot.quote.total,
        currency:   snapshot.quote.currency,
        configSnapshot: snapshot,
      }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      const msg = (body as { message?: string }).message ?? 'Failed to submit order'
      set((state) => { state.submitError = msg })
      throw new Error(msg)
    }

    const data = await res.json() as { id: string }
    set((state) => { state.submittedOrderId = data.id })
    return data.id
  },

  resetOrder: () => {
    set((state) => {
      Object.assign(state, initialOrderState)
    })
  },
})
