/** Maximum file size accepted by the upload zone (10 MB) */
export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024

/** Accepted MIME types for artwork upload */
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/tiff']

/** Default passepartout overlap per side (mm) */
export const DEFAULT_PASSEPARTOUT_OVERLAP_MM = 8

/** Passepartout overlap limits (mm) */
export const PASSEPARTOUT_OVERLAP_MIN_MM = 5
export const PASSEPARTOUT_OVERLAP_MAX_MM = 50

/** Three.js world unit convention: 1 unit = 1 cm */
export const WORLD_UNITS_PER_MM = 0.1

/** Glass thickness in world units (2 mm) */
export const GLASS_THICKNESS_WORLD = 0.2

/** R3F canvas background colour */
export const SCENE_BG_COLOR = '#F0EDE7'

/** Step routes in order */
export const CONFIGURE_STEPS = [
  { label: 'Upload', href: '/configure/upload' },
  { label: 'Frame', href: '/configure/frame' },
  { label: 'Passepartout', href: '/configure/passepartout' },
  { label: 'Review', href: '/configure/review' },
] as const
