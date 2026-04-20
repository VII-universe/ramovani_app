// ─────────────────────────────────────────────────────────────────────────────
// NODE BETA — Pricing & BOM contracts
// Bill of Materials and price quote shapes returned by POST /quote.
// ─────────────────────────────────────────────────────────────────────────────

// ── Bill of Materials ─────────────────────────────────────────────────────────

/**
 * Exact molding cut lengths for the four frame rails.
 * All measurements in millimetres.
 *
 * Calculation reference:
 *   outer dimension = artwork_dim + 2 * rabbet_width
 *   rail length (outside) = outer dimension + 2 * profile_width
 *   joined with 45° mitre → each piece length = outer_dim + 2 * profile_width
 */
export interface FrameBOM {
  /** Outer dimension of the frame (artwork + 2× rabbet width) */
  frameOuterWidthMm: number
  frameOuterHeightMm: number

  /** Cut lengths for each rail at the long (outside) edge */
  topRailMm: number
  bottomRailMm: number
  leftStileMm: number
  rightStileMm: number

  /** Sum of all four rail lengths */
  totalMoldingMm: number
  totalMoldingMeters: number
}

/**
 * Passepartout (mat board) cut dimensions.
 * All measurements in millimetres.
 */
export interface PassepartoutBOM {
  /** Outer size of the mat — same as frame's inner opening */
  outerWidthMm: number
  outerHeightMm: number

  /** Inner opening — artwork minus overlap on each side */
  innerWidthMm: number
  innerHeightMm: number

  /** How much the mat overlaps the artwork per side (typically 5–10 mm) */
  overlapPerSideMm: number

  areaSqMm: number
  areaSqMeters: number
}

/**
 * Glass / acrylic sheet cut dimensions.
 */
export interface GlassBOM {
  widthMm: number
  heightMm: number
  areaSqMm: number
  areaSqMeters: number
}

// ── Pricing ───────────────────────────────────────────────────────────────────

export interface LineItem {
  /** Human-readable description e.g. "Oslo Oak Natural — 4× mitre cut" */
  description: string
  quantity: number
  /** Unit of measure: "m", "m²", "piece" */
  unit: string
  unitPrice: number
  totalPrice: number
  currency: string
}

export interface PriceQuote {
  quoteId: string
  /** ISO 8601 — quote validity window (typically 24 h) */
  validUntil: string
  lineItems: LineItem[]
  subtotal: number
  /** Calculated tax amount */
  tax: number
  /** e.g. 0.21 for 21% VAT */
  taxRate: number
  total: number
  currency: string
}

// ── Quote request (frontend → Node Beta) ─────────────────────────────────────

export interface QuoteRequest {
  /** Physical artwork dimensions — sourced from Node Alpha output */
  artworkWidthMm: number
  artworkHeightMm: number
  frameProfileId: string
  passepartoutProfileId?: string
  /** Requested overlap of mat over artwork on each side (mm) */
  passepartoutOverlapMm?: number
  includeGlass: boolean
}

// ── Full order configuration snapshot ────────────────────────────────────────

/**
 * Immutable snapshot saved when user proceeds to checkout.
 * Contains resolved BOM + price — never re-calculated after this point.
 */
export interface OrderConfiguration {
  artworkWidthMm: number
  artworkHeightMm: number

  frameProfileId: string
  frameProfileName: string
  frameProfileWidthMm: number
  frameRabbetDepthMm: number
  frameRabbetWidthMm: number

  passepartoutProfileId?: string
  passepartoutProfileName?: string
  passepartoutOverlapMm?: number

  includeGlass: boolean

  frameBOM: FrameBOM
  passepartoutBOM?: PassepartoutBOM
  glassBOM?: GlassBOM
  quote: PriceQuote
}
