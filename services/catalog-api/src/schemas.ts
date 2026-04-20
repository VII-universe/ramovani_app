/**
 * Node Beta — Catalog API runtime validation schemas.
 *
 * Zod is the TypeScript equivalent of Pydantic: these schemas validate data
 * at runtime (API request bodies, Prisma responses crossing service boundaries)
 * and provide the inferred TypeScript types used throughout the service.
 *
 * Relationship to @ramovani/shared-types:
 *   shared-types exports compile-time TypeScript *interfaces*.
 *   These schemas provide runtime *validation* of the same shapes plus the
 *   additional Glazing entity which has no Prisma model yet.
 */

import { z } from 'zod'

// ── Shared primitives ──────────────────────────────────────────────────────────

/** ISO 4217 three-letter currency code, upper-case. */
const CurrencyCode = z
  .string()
  .length(3)
  .regex(/^[A-Z]{3}$/, 'Must be a 3-letter ISO 4217 currency code (e.g. CZK)')
  .default('CZK')

/** CSS hex colour string, e.g. "#FAF8F4". */
const HexColour = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a 6-digit hex colour: #RRGGBB')

// ── Frame Profile ──────────────────────────────────────────────────────────────

/**
 * Physical inventory schema for a frame molding profile.
 *
 * Field notes:
 *   sku          — URL-safe catalog identifier (maps to `slug` in Prisma).
 *   widthMm      — The visible face width of the molding, front edge → rabbet.
 *                  This is the critical dimension in the mitre-corner formula:
 *                  each corner consumes 2 × widthMm of extra molding length.
 *   rabbetDepthMm — Depth of the channel that holds the artwork stack.
 *   rabbetWidthMm — Width of the lip that overlaps the artwork (5–8 mm typical).
 *   pricePerMeter — Per linear metre, excl. VAT. The BOM calculation uses this
 *                   after multiplying by totalMoldingMeters.
 */
export const FrameProfileSchema = z.object({
  id: z.string().min(1),
  sku: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/, 'sku must be lowercase alphanumeric with hyphens'),
  name: z.string().min(1).max(120),
  material: z.enum(['wood', 'metal', 'composite']),
  finish: z.enum(['matte', 'gloss', 'satin', 'brushed', 'natural', 'lacquered']),

  // Physical dimensions (all in mm)
  /** Visible molding face width — used directly in the mitre corner formula. */
  widthMm: z.number().positive().max(200),
  /** Total depth from front face to back edge. */
  totalDepthMm: z.number().positive().max(100),
  /** Depth of the rabbet channel holding artwork + glass + backing. */
  rabbetDepthMm: z.number().positive().max(80),
  /** Width of the rabbet lip overlapping the artwork on each side. */
  rabbetWidthMm: z.number().positive().max(30),

  // Commerce
  pricePerMeter: z.number().positive(),
  currency: CurrencyCode,
  inStock: z.boolean().default(true),
  thumbnailUrl: z.string().url(),
})

// ── Passepartout ───────────────────────────────────────────────────────────────

/**
 * Physical inventory schema for a passepartout (mat board) profile.
 *
 * Field notes:
 *   pricePerSqMeter — Raw board price before the 15 % waste factor applied
 *                     by PricingEngine. The final line-item cost =
 *                     areaSqMeters × 1.15 × pricePerSqMeter.
 */
export const PassepartoutSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120),
  colorName: z.string().min(1).max(80),
  colorHex: HexColour,
  style: z.enum(['single', 'double', 'bevel']),

  // Physical dimensions (mm)
  /** Board thickness — typically 1.4 mm (single) or 2.8 mm (double). */
  thicknessMm: z.number().positive().max(10),
  /** Bevel cut angle in degrees — must be acute. Standard is 45°. */
  bevelAngleDeg: z.number().min(1).max(89).default(45),

  // Commerce
  pricePerSqMeter: z.number().positive(),
  currency: CurrencyCode,
  inStock: z.boolean().default(true),
  thumbnailUrl: z.string().url(),
})

// ── Glazing ────────────────────────────────────────────────────────────────────

/**
 * Physical inventory schema for a glazing (glass / acrylic) product.
 *
 * Glazing is ordered as a flat sheet cut to match the frame inner opening.
 * Pricing is per square metre; area is derived from the frame BOM.
 *
 * Glazing types:
 *   clear            — Standard float glass. Lowest cost.
 *   anti_reflective  — AR-coated glass. Reduces glare to < 1 % reflection.
 *   uv_protective    — Filters 99 % UV to prevent artwork fading.
 *   museum_glass     — AR + UV combined. Premium product.
 *   acrylic          — Lightweight shatter-resistant plastic sheet.
 */
export const GlazingSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120),
  type: z.enum(['clear', 'anti_reflective', 'uv_protective', 'museum_glass', 'acrylic']),

  // Physical
  /** Sheet thickness in mm. Standard glazing is 2 mm; museum glass is 3–4 mm. */
  thicknessMm: z.number().positive().max(10),
  /**
   * UV transmission coefficient, where 0 = blocks all UV and 1 = fully
   * transparent to UV.  museum_glass is typically < 0.01; clear is ~0.65.
   */
  uvTransmittance: z.number().min(0).max(1).optional(),

  // Commerce
  pricePerSqMeter: z.number().positive(),
  currency: CurrencyCode,
  inStock: z.boolean().default(true),
})

// ── Quote request ──────────────────────────────────────────────────────────────

/**
 * Incoming body schema for POST /quote.
 *
 * artworkWidthMm / artworkHeightMm are sourced directly from Node Alpha's
 * ArtworkDimensions response.  The maximum of 5 000 mm matches Node Alpha's
 * own known_dimension_mm constraint.
 */
export const QuoteRequestSchema = z.object({
  /** Physical artwork dimensions from Node Alpha (mm). */
  artworkWidthMm: z.number().positive().max(5_000),
  artworkHeightMm: z.number().positive().max(5_000),

  frameProfileId: z.string().min(1),
  passepartoutProfileId: z.string().min(1).optional(),
  /** Passepartout overlap over artwork per side in mm. Default: 8 mm. */
  passepartoutOverlapMm: z.number().positive().max(50).default(8),

  includeGlass: z.boolean(),
  /**
   * Optional glazing product override.  If omitted and includeGlass is true,
   * PricingEngine uses the default anti-reflective glass price constant.
   */
  glazingId: z.string().min(1).optional(),
})

// ── Order create request ───────────────────────────────────────────────────────

/**
 * POST /orders — body schema.
 *
 * The frontend sends the full OrderConfiguration snapshot (dimensions, chosen
 * profiles, client-side BOM, price breakdown) plus the customer's email.
 * The backend persists it verbatim in configSnapshot and extracts totalPrice.
 */
export const OrderCreateSchema = z.object({
  customerEmail: z.string().email('Must be a valid email address'),

  // Physical artwork dimensions
  artworkWidthMm:  z.number().positive().max(5_000),
  artworkHeightMm: z.number().positive().max(5_000),

  // Chosen profiles
  frameProfileId:   z.string().min(1),
  frameProfileName: z.string().min(1),

  passepartoutProfileId:   z.string().min(1).optional(),
  passepartoutProfileName: z.string().min(1).optional(),
  passepartoutOverlapMm:   z.number().positive().optional(),

  includeGlass: z.boolean(),

  // Calculated totals (client-side pricing engine)
  totalPrice: z.number().positive(),
  currency:   z.string().length(3).default('CZK'),

  // Complete JSON snapshot for the workshop cut-sheet
  // Accepts any object — it is stored verbatim and never re-validated server-side.
  configSnapshot: z.record(z.unknown()),
})

// ── Inferred TypeScript types ──────────────────────────────────────────────────

export type FrameProfileInput = z.infer<typeof FrameProfileSchema>
export type PassepartoutInput = z.infer<typeof PassepartoutSchema>
export type GlazingInput = z.infer<typeof GlazingSchema>
export type QuoteRequestInput = z.infer<typeof QuoteRequestSchema>
export type OrderCreateInput = z.infer<typeof OrderCreateSchema>
