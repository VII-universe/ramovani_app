import type { FrameBOM, PassepartoutBOM, GlassBOM } from '@ramovani/shared-types'

/**
 * Calculate the Bill of Materials for the frame molding.
 * Uses the standard picture-framing formula with 45° mitre joins.
 *
 * outer_dim = artwork_dim + 2 * rabbet_width
 * rail_length = outer_dim + 2 * profile_width  (outside mitre measurement)
 */
export function calculateFrameBOM(params: {
  artworkWidthMm: number
  artworkHeightMm: number
  profileWidthMm: number
  rabbetWidthMm: number
}): FrameBOM {
  const { artworkWidthMm, artworkHeightMm, profileWidthMm, rabbetWidthMm } = params

  const frameOuterWidthMm = artworkWidthMm + 2 * rabbetWidthMm
  const frameOuterHeightMm = artworkHeightMm + 2 * rabbetWidthMm

  const topRailMm = frameOuterWidthMm + 2 * profileWidthMm
  const bottomRailMm = topRailMm
  const leftStileMm = frameOuterHeightMm + 2 * profileWidthMm
  const rightStileMm = leftStileMm

  const totalMoldingMm = topRailMm + bottomRailMm + leftStileMm + rightStileMm

  return {
    frameOuterWidthMm: round2(frameOuterWidthMm),
    frameOuterHeightMm: round2(frameOuterHeightMm),
    topRailMm: round2(topRailMm),
    bottomRailMm: round2(bottomRailMm),
    leftStileMm: round2(leftStileMm),
    rightStileMm: round2(rightStileMm),
    totalMoldingMm: round2(totalMoldingMm),
    totalMoldingMeters: round4(totalMoldingMm / 1000),
  }
}

/**
 * Calculate the passepartout mat board BOM.
 */
export function calculatePassepartoutBOM(params: {
  artworkWidthMm: number
  artworkHeightMm: number
  overlapPerSideMm: number
}): PassepartoutBOM {
  const { artworkWidthMm, artworkHeightMm, overlapPerSideMm } = params

  const outerWidthMm = artworkWidthMm
  const outerHeightMm = artworkHeightMm
  const innerWidthMm = artworkWidthMm - 2 * overlapPerSideMm
  const innerHeightMm = artworkHeightMm - 2 * overlapPerSideMm

  const areaSqMm = outerWidthMm * outerHeightMm
  const areaSqMeters = areaSqMm / 1_000_000

  return {
    outerWidthMm: round2(outerWidthMm),
    outerHeightMm: round2(outerHeightMm),
    innerWidthMm: round2(innerWidthMm),
    innerHeightMm: round2(innerHeightMm),
    overlapPerSideMm,
    areaSqMm: round2(areaSqMm),
    areaSqMeters: round6(areaSqMeters),
  }
}

/**
 * Calculate the glass / acrylic sheet BOM.
 * Glass is cut to match the frame's inner rabbet size.
 */
export function calculateGlassBOM(params: {
  artworkWidthMm: number
  artworkHeightMm: number
  rabbetWidthMm: number
}): GlassBOM {
  const { artworkWidthMm, artworkHeightMm, rabbetWidthMm } = params

  const widthMm = artworkWidthMm + 2 * rabbetWidthMm
  const heightMm = artworkHeightMm + 2 * rabbetWidthMm
  const areaSqMm = widthMm * heightMm

  return {
    widthMm: round2(widthMm),
    heightMm: round2(heightMm),
    areaSqMm: round2(areaSqMm),
    areaSqMeters: round6(areaSqMm / 1_000_000),
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function round2(n: number): number { return Math.round(n * 100) / 100 }
function round4(n: number): number { return Math.round(n * 10000) / 10000 }
function round6(n: number): number { return Math.round(n * 1_000_000) / 1_000_000 }
