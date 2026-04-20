/**
 * Node Beta — PricingEngine
 *
 * Owns all money arithmetic for the catalog service.  Two responsibilities:
 *
 *   1. calculateBomAndPrice — Given canvas dimensions and a frame profile,
 *      compute total molding length using the standard 45° mitre formula and
 *      return the material cost.
 *
 *   2. buildQuote — Assemble a full PriceQuote from pre-calculated BOMs and
 *      catalog profiles, applying the waste factor to mat board and adding VAT.
 *
 * Money rules
 * -----------
 * - All intermediate values are computed at full float precision.
 * - Values are rounded only at the point they enter a LineItem or the
 *   PriceQuote totals — never mid-calculation.
 * - Subtotal + tax are each rounded independently before summing to total,
 *   matching standard Czech VAT invoicing practice.
 */

import { randomUUID } from 'crypto'
import type {
  FrameBOM,
  GlassBOM,
  LineItem,
  PassepartoutBOM,
  PriceQuote,
} from '@ramovani/shared-types'

// ── Constants ──────────────────────────────────────────────────────────────────

/** Czech standard VAT rate. */
const DEFAULT_TAX_RATE = 0.21

/** Fallback glass price when no GlazingProfile is supplied (CZK / m²). */
const FALLBACK_GLASS_PRICE_PER_SQ_METER = 850

/** Default currency for all line items. */
const DEFAULT_CURRENCY = 'CZK'

/**
 * Waste factor applied to passepartout area.
 * A 15 % uplift covers offcuts from bevel-cut openings and border trims.
 */
const MAT_WASTE_FACTOR = 1.15

// ── Input interfaces ───────────────────────────────────────────────────────────

/**
 * The subset of a FrameProfile required by calculateBomAndPrice.
 * Accepts both the Prisma model (profileWidthMm) and the API schema (widthMm)
 * via the union — callers pass whichever they have.
 */
export interface FramePricingProfile {
  /** Visible molding face width — the critical dimension in the corner formula. */
  widthMm: number
  /** Price per linear metre, excl. tax. */
  pricePerMeter: number
  currency?: string
}

export interface PassepartoutPricingProfile {
  pricePerSqMeter: number
  currency?: string
}

export interface GlazingPricingProfile {
  /** Human-readable label used in the line-item description. */
  name: string
  pricePerSqMeter: number
  currency?: string
}

// ── Output interfaces ──────────────────────────────────────────────────────────

/**
 * Return type of calculateBomAndPrice.
 * Contains the molding quantity and the frame material cost only —
 * passepartout and glazing are assembled separately in buildQuote.
 */
export interface FrameBomAndPrice {
  /**
   * Total molding length in millimetres.
   *
   * Formula: 2 × (canvasWidth + canvasHeight) + 8 × profileWidth
   *
   * The 8 × profileWidth term accounts for the four 45° mitre corners:
   * each corner joins two pieces, and each cut loses one profileWidth of
   * material to the mitre angle — 4 corners × 2 cuts = 8 × profileWidth.
   */
  totalMoldingMm: number
  /** totalMoldingMm expressed in metres for purchase ordering. */
  totalMoldingMeters: number
  /** Frame molding cost = totalMoldingMeters × pricePerMeter, excl. tax. */
  moldingCost: number
  currency: string
}

// ── PricingEngine ──────────────────────────────────────────────────────────────

export class PricingEngine {
  private readonly taxRate: number
  private readonly currency: string

  constructor(options: { taxRate?: number; currency?: string } = {}) {
    this.taxRate = options.taxRate ?? DEFAULT_TAX_RATE
    this.currency = options.currency ?? DEFAULT_CURRENCY
  }

  /**
   * Calculate total frame molding length and material cost.
   *
   * Formula (industry-standard 45° mitre picture framing):
   *
   *   totalMoldingMm = 2 × (canvasWidthMm + canvasHeightMm) + 8 × widthMm
   *
   * Where:
   *   2 × (W + H)   — perimeter of the artwork opening
   *   8 × widthMm   — corner allowance: 4 corners × 2 mitre cuts, each
   *                   consuming one full profile width of material
   *
   * This is the aggregated total.  For exact per-rail cut lengths with rabbet
   * width included, use calculateFrameBOM() in bom.service.ts.
   *
   * @param canvasWidthMm   Canvas/artwork width in mm. Must be > 0.
   * @param canvasHeightMm  Canvas/artwork height in mm. Must be > 0.
   * @param frameProfile    Profile with widthMm and pricePerMeter.
   * @throws {RangeError}   If any input is non-positive.
   */
  calculateBomAndPrice(
    canvasWidthMm: number,
    canvasHeightMm: number,
    frameProfile: FramePricingProfile,
  ): FrameBomAndPrice {
    if (canvasWidthMm <= 0) {
      throw new RangeError(`canvasWidthMm must be > 0, got ${canvasWidthMm}`)
    }
    if (canvasHeightMm <= 0) {
      throw new RangeError(`canvasHeightMm must be > 0, got ${canvasHeightMm}`)
    }
    if (frameProfile.widthMm <= 0) {
      throw new RangeError(`frameProfile.widthMm must be > 0, got ${frameProfile.widthMm}`)
    }
    if (frameProfile.pricePerMeter <= 0) {
      throw new RangeError(
        `frameProfile.pricePerMeter must be > 0, got ${frameProfile.pricePerMeter}`,
      )
    }

    const totalMoldingMm =
      2 * (canvasWidthMm + canvasHeightMm) + 8 * frameProfile.widthMm

    const totalMoldingMeters = totalMoldingMm / 1_000
    const moldingCost = totalMoldingMeters * frameProfile.pricePerMeter

    return {
      totalMoldingMm: round2(totalMoldingMm),
      totalMoldingMeters: round4(totalMoldingMeters),
      moldingCost: round2(moldingCost),
      currency: frameProfile.currency ?? this.currency,
    }
  }

  /**
   * Assemble a full PriceQuote from pre-calculated BOMs and catalog profiles.
   *
   * Line items produced (in order):
   *   1. Frame molding     — always present
   *   2. Passepartout      — when passepartoutBOM + passepartoutProfile supplied
   *   3. Glazing           — when glassBOM supplied (uses glazingProfile or fallback)
   *
   * VAT is applied to the subtotal as a single tax line.
   * Quote validity window is 24 hours from creation time.
   */
  buildQuote(input: {
    frameBOM: FrameBOM
    frameProfile: { pricePerMeter: number; currency: string }
    passepartoutBOM?: PassepartoutBOM
    passepartoutProfile?: PassepartoutPricingProfile
    glassBOM?: GlassBOM
    glazingProfile?: GlazingPricingProfile
  }): PriceQuote {
    const {
      frameBOM,
      frameProfile,
      passepartoutBOM,
      passepartoutProfile,
      glassBOM,
      glazingProfile,
    } = input

    const lineItems: LineItem[] = []

    // ── Frame molding ─────────────────────────────────────────────────────────
    const moldingQty = round4(frameBOM.totalMoldingMeters)
    lineItems.push({
      description: 'Frame molding — 4× mitre cut',
      quantity: moldingQty,
      unit: 'm',
      unitPrice: frameProfile.pricePerMeter,
      totalPrice: round2(moldingQty * frameProfile.pricePerMeter),
      currency: this.currency,
    })

    // ── Passepartout ──────────────────────────────────────────────────────────
    if (passepartoutBOM && passepartoutProfile) {
      // Apply waste factor: bevel cuts leave ~15 % offcut from the corner triangles.
      const matQty = round6(passepartoutBOM.areaSqMeters * MAT_WASTE_FACTOR)
      lineItems.push({
        description: 'Passepartout mat board (incl. 15 % waste factor)',
        quantity: matQty,
        unit: 'm²',
        unitPrice: passepartoutProfile.pricePerSqMeter,
        totalPrice: round2(matQty * passepartoutProfile.pricePerSqMeter),
        currency: this.currency,
      })
    }

    // ── Glazing ───────────────────────────────────────────────────────────────
    if (glassBOM) {
      const glassQty = round6(glassBOM.areaSqMeters)
      const unitPrice = glazingProfile?.pricePerSqMeter ?? FALLBACK_GLASS_PRICE_PER_SQ_METER
      const description = glazingProfile?.name ?? 'Anti-reflective glass'
      lineItems.push({
        description,
        quantity: glassQty,
        unit: 'm²',
        unitPrice,
        totalPrice: round2(glassQty * unitPrice),
        currency: this.currency,
      })
    }

    // ── Totals ────────────────────────────────────────────────────────────────
    const subtotal = round2(lineItems.reduce((acc, item) => acc + item.totalPrice, 0))
    const tax = round2(subtotal * this.taxRate)
    const total = round2(subtotal + tax)

    return {
      quoteId: randomUUID(),
      validUntil: new Date(Date.now() + 24 * 60 * 60 * 1_000).toISOString(),
      lineItems,
      subtotal,
      tax,
      taxRate: this.taxRate,
      total,
      currency: this.currency,
    }
  }
}

// ── Rounding helpers ───────────────────────────────────────────────────────────
// Kept private to this module. Precision choices:
//   round2  — monetary values and mm measurements (2 decimal places)
//   round4  — metre quantities (4 decimal places — sub-mm precision in metres)
//   round6  — m² quantities (6 decimal places — sub-mm² precision)

function round2(n: number): number { return Math.round(n * 1e2) / 1e2 }
function round4(n: number): number { return Math.round(n * 1e4) / 1e4 }
function round6(n: number): number { return Math.round(n * 1e6) / 1e6 }
