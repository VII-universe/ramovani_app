// ─────────────────────────────────────────────────────────────────────────────
// NODE BETA — Catalog Engine contracts
// Frame profiles, passepartout profiles, and catalog filter shapes.
// ─────────────────────────────────────────────────────────────────────────────

export type FrameMaterialType = 'wood' | 'metal' | 'composite'

export type MaterialFinish =
  | 'matte'
  | 'gloss'
  | 'satin'
  | 'brushed'
  | 'natural'
  | 'lacquered'

export type PassepartoutStyle = 'single' | 'double' | 'bevel'

// ── Frame Profile ─────────────────────────────────────────────────────────────

/**
 * PBR (Physically Based Rendering) material parameters.
 * Used by Node Gamma to configure Three.js MeshStandardMaterial.
 */
export interface PBRParams {
  /** Base hex colour e.g. "#2C1810" */
  colorHex: string
  /** PBR roughness [0 = mirror, 1 = fully diffuse] */
  roughness: number
  /** PBR metalness [0 = dielectric, 1 = fully metallic] */
  metalness: number
  /** URL to albedo/diffuse texture (optional) */
  textureUrl?: string
  /** URL to normal map texture (optional) */
  normalMapUrl?: string
  /** URL to roughness map (optional) */
  roughnessMapUrl?: string
}

/**
 * A single frame molding profile — the Single Source of Truth for all
 * physical, visual, and commercial properties of a frame.
 */
export interface FrameProfile {
  id: string
  name: string
  /** URL-safe identifier, e.g. "oslo-oak-natural" */
  slug: string
  material: FrameMaterialType
  finish: MaterialFinish

  // ── Physical dimensions (all in mm) ────────────────────────────────────────
  /** Visible width of the molding face from outside edge to rabbet */
  profileWidthMm: number
  /** Total depth of the molding from front face to back */
  totalDepthMm: number
  /** Depth of the rabbet channel that holds the artwork stack */
  rabbetDepthMm: number
  /**
   * Rabbet width — how far the molding overlaps onto the artwork/glass.
   * Typically 5–8 mm. Critical for BOM calculations.
   */
  rabbetWidthMm: number

  // ── Rendering (consumed by Node Gamma) ─────────────────────────────────────
  pbr: PBRParams

  // ── Commerce ───────────────────────────────────────────────────────────────
  /** Price per linear metre of molding (excl. tax) */
  pricePerMeter: number
  currency: string
  inStock: boolean
  thumbnailUrl: string
  /** Gallery images for the product detail view */
  imageUrls: string[]

  // ── Metadata ───────────────────────────────────────────────────────────────
  createdAt: string   // ISO 8601
  updatedAt: string
}

// ── Passepartout Profile ──────────────────────────────────────────────────────

/**
 * A single passepartout (mat board) profile.
 */
export interface PassepartoutProfile {
  id: string
  name: string
  /** Human-readable colour name e.g. "Warm White" */
  colorName: string
  /** Hex colour for swatch rendering and Node Gamma plane material */
  colorHex: string
  style: PassepartoutStyle

  // ── Physical dimensions (mm) ───────────────────────────────────────────────
  /** Board thickness — typically 1.2 mm (single) or 2.4 mm (double) */
  thicknessMm: number
  /** Bevel cut angle in degrees — typically 45° */
  bevelAngleDeg: number

  // ── Commerce ───────────────────────────────────────────────────────────────
  /** Price per square metre of board (excl. waste factor) */
  pricePerSqMeter: number
  currency: string
  inStock: boolean
  thumbnailUrl: string

  // ── Metadata ───────────────────────────────────────────────────────────────
  createdAt: string
  updatedAt: string
}

// ── Catalog API response wrappers ─────────────────────────────────────────────

export interface FrameCatalogResponse {
  items: FrameProfile[]
  total: number
  page: number
  pageSize: number
}

export interface PassepartoutCatalogResponse {
  items: PassepartoutProfile[]
  total: number
  page: number
  pageSize: number
}

// ── Filters ───────────────────────────────────────────────────────────────────

export interface FrameCatalogFilters {
  material?: FrameMaterialType
  finish?: MaterialFinish
  minProfileWidthMm?: number
  maxProfileWidthMm?: number
  maxPricePerMeter?: number
  inStockOnly?: boolean
  page?: number
  pageSize?: number
}
