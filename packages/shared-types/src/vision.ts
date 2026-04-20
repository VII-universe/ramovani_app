// ─────────────────────────────────────────────────────────────────────────────
// NODE ALPHA — Vision Engine contracts
// Defines the request/response shapes for POST /analyze
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The axis the user provides as a known physical reference dimension.
 */
export type KnownDimensionAxis = 'width' | 'height'

/**
 * Physical dimensions of the detected artwork after homography warp and crop.
 * All measurements in millimetres unless suffixed _px.
 */
export interface ArtworkDimensions {
  /** Artwork width in millimetres (physical, real-world) */
  widthMm: number
  /** Artwork height in millimetres (physical, real-world) */
  heightMm: number
  /** Cropped image width in pixels */
  widthPx: number
  /** Cropped image height in pixels */
  heightPx: number
  /** Calibrated scale: how many pixels represent 1 mm in the warped image */
  pixelsPerMm: number
  /** width / height — used to constrain 3D geometry */
  aspectRatio: number
}

/**
 * The four corners of the detected artwork in the ORIGINAL (unwarped) image,
 * expressed as [x, y] pixel coordinates, ordered TL → TR → BR → BL.
 */
export type QuadCorners = [
  [number, number], // top-left
  [number, number], // top-right
  [number, number], // bottom-right
  [number, number], // bottom-left
]

/**
 * Result of the homography analysis step.
 */
export interface HomographyResult {
  /** The four detected corners in the original image */
  corners: QuadCorners
  /** 3×3 perspective transform matrix (row-major, flattened to 9 elements) */
  transformMatrix: readonly [
    number, number, number,
    number, number, number,
    number, number, number,
  ]
  /**
   * Detection confidence score [0, 1].
   * < 0.5 → warn user, < 0.2 → reject.
   */
  confidence: number
}

/**
 * Full response payload returned by Node Alpha's POST /analyze endpoint.
 */
export interface VisionResult {
  /** Unique ID for this analysis run — used for cache / CDN lookup */
  id: string
  /** Original uploaded filename */
  originalFilename: string
  /**
   * Signed URL (or relative path) to the perspective-corrected, cropped image
   * stored temporarily on the Vision API server / object storage.
   */
  croppedImageUrl: string
  /** Calculated physical and pixel dimensions */
  dimensions: ArtworkDimensions
  /** Homography details for debugging / visualisation overlay */
  homography: HomographyResult
  /** Wall-clock processing time in milliseconds */
  processingTimeMs: number
  /**
   * Non-fatal warnings the client should surface to the user.
   * e.g. "Low confidence detection — please verify dimensions."
   */
  warnings: string[]
}

// ── Request types (sent FROM the frontend TO Node Alpha) ──────────────────────

/**
 * Multipart form data sent to POST /analyze.
 * The `file` field is a binary image upload.
 * This interface represents the non-file fields that travel alongside it.
 */
export interface VisionAnalyzeFormFields {
  /** Which physical dimension the user is providing as ground truth */
  knownDimensionAxis: KnownDimensionAxis
  /** The physical measurement in millimetres */
  knownDimensionMm: number
}

/**
 * Combined shape used by the frontend hook before it builds the FormData.
 */
export interface VisionUploadPayload extends VisionAnalyzeFormFields {
  file: File
}

// ── Error response ────────────────────────────────────────────────────────────

export interface VisionAnalyzeError {
  code:
    | 'NO_ARTWORK_DETECTED'
    | 'LOW_CONFIDENCE'
    | 'INVALID_IMAGE'
    | 'INVALID_DIMENSION'
    | 'PROCESSING_FAILED'
  message: string
  detail?: string
}
