/**
 * Client-side pricing engine — mirrors the backend PricingEngine but runs
 * entirely in the browser so the price is always visible, even when the
 * Catalog API is not called.
 *
 * Formula (matches services/catalog-api/src/services/pricing.service.ts):
 *
 *   outerWidth  = artworkWidth  + 2 × passepartoutOverlap   (if mat selected)
 *   outerHeight = artworkHeight + 2 × passepartoutOverlap
 *   perimeter   = (outerWidth + outerHeight) × 2 / 1 000    → metres
 *   frameCost   = perimeter × frame.pricePerMeter
 *   matCost     = (outerWidth × outerHeight / 1 000 000) × mat.pricePerSqMeter
 *   glassCost   = (artworkW × artworkH / 1 000 000) × GLASS_PRICE_PER_M2
 *
 * All values are in CZK (excl. VAT). VAT is added as the final line.
 */

import type { FrameProfile, PassepartoutProfile } from '@ramovani/shared-types'

// ── Constants ─────────────────────────────────────────────────────────────────

/** CZK per m² for standard anti-reflective glass sheet */
export const GLASS_PRICE_PER_M2 = 450

/** Czech VAT rate */
export const VAT_RATE = 0.21

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PriceLineItem {
  label: string
  detail: string    // human-readable calculation detail shown in the breakdown
  amount: number    // excl. VAT, CZK
  currency: string
}

export interface ClientPriceBreakdown {
  lineItems: PriceLineItem[]
  subtotal: number
  vat: number
  vatRate: number
  total: number
  currency: 'CZK'
  /** For display in the sidebar header */
  outerWidthMm: number
  outerHeightMm: number
  perimeterMeters: number
  /** True when artwork dimensions are fallback estimates, not measured values */
  isEstimate: boolean
}

// ── Core function ─────────────────────────────────────────────────────────────

export function computeClientPrice(params: {
  artworkWidthMm: number
  artworkHeightMm: number
  selectedFrame: FrameProfile
  selectedPassepartout: PassepartoutProfile | null
  passepartoutOverlapMm: number
  includeGlass: boolean
  isEstimate?: boolean
}): ClientPriceBreakdown {
  const {
    artworkWidthMm,
    artworkHeightMm,
    selectedFrame,
    selectedPassepartout,
    passepartoutOverlapMm,
    includeGlass,
    isEstimate = false,
  } = params

  // Outer opening of the frame includes mat overlap on each edge
  const overlapMm    = selectedPassepartout ? passepartoutOverlapMm : 0
  const outerWidthMm = artworkWidthMm  + 2 * overlapMm
  const outerHeightMm = artworkHeightMm + 2 * overlapMm

  // Perimeter in metres — this is the length of moulding needed
  const perimeterMeters = ((outerWidthMm + outerHeightMm) * 2) / 1_000

  const lineItems: PriceLineItem[] = []

  // ── Frame moulding ──────────────────────────────────────────────────────────
  const frameCost = perimeterMeters * selectedFrame.pricePerMeter
  lineItems.push({
    label: selectedFrame.name,
    detail: `${perimeterMeters.toFixed(2)} m × ${selectedFrame.pricePerMeter} ${selectedFrame.currency}/m`,
    amount: frameCost,
    currency: selectedFrame.currency,
  })

  // ── Passepartout (mat board) ────────────────────────────────────────────────
  if (selectedPassepartout) {
    const areaSqM   = (outerWidthMm * outerHeightMm) / 1_000_000
    const areaSqCm  = areaSqM * 10_000
    const matCost   = areaSqM * selectedPassepartout.pricePerSqMeter
    lineItems.push({
      label: `Mat — ${selectedPassepartout.colorName}`,
      detail: `${areaSqCm.toFixed(0)} cm² × ${selectedPassepartout.pricePerSqMeter} ${selectedPassepartout.currency}/m²`,
      amount: matCost,
      currency: selectedPassepartout.currency,
    })
  }

  // ── Glass ───────────────────────────────────────────────────────────────────
  if (includeGlass) {
    const areaSqM  = (artworkWidthMm * artworkHeightMm) / 1_000_000
    const areaSqCm = areaSqM * 10_000
    const glassCost = areaSqM * GLASS_PRICE_PER_M2
    lineItems.push({
      label: 'Anti-reflective glass',
      detail: `${areaSqCm.toFixed(0)} cm² × ${GLASS_PRICE_PER_M2} CZK/m²`,
      amount: glassCost,
      currency: 'CZK',
    })
  }

  const subtotal = lineItems.reduce((sum, li) => sum + li.amount, 0)
  const vat      = subtotal * VAT_RATE
  const total    = subtotal + vat

  return {
    lineItems,
    subtotal,
    vat,
    vatRate: VAT_RATE,
    total,
    currency: 'CZK',
    outerWidthMm,
    outerHeightMm,
    perimeterMeters,
    isEstimate,
  }
}
