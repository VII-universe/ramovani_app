// ─────────────────────────────────────────────────────────────────────────────
// NODE GAMMA — 3D Configurator contracts
// Geometry parameters consumed by React Three Fiber scene components.
// World unit convention: 1 unit = 1 cm (so 210 mm → 21.0 units)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pure geometry parameters for the parametric frame mesh.
 * Derived by the `useFrameGeometry` hook from Zustand state.
 * All values in Three.js world units (1 unit = 1 cm).
 */
export interface FrameGeometryParams {
  // ── Artwork ─────────────────────────────────────────────────────────────────
  artworkWidthU: number
  artworkHeightU: number

  // ── Passepartout ────────────────────────────────────────────────────────────
  hasPassepartout: boolean
  matOverlapU: number       // mat overlap per side
  matThicknessU: number     // physical board thickness

  // ── Frame molding ───────────────────────────────────────────────────────────
  profileWidthU: number     // visible face width of the molding
  totalDepthU: number       // full depth of the frame box
  rabbetDepthU: number      // depth of the rabbet channel
  rabbetWidthU: number      // overlap onto artwork stack

  // ── Glass ───────────────────────────────────────────────────────────────────
  hasGlass: boolean
  glassThicknessU: number   // typically 0.2 (2 mm)
}

/**
 * PBR material parameters forwarded to Three.js MeshStandardMaterial.
 * Mirrors PBRParams from catalog.ts — kept separate to avoid R3F importing catalog types.
 */
export interface SceneMaterialParams {
  colorHex: string
  roughness: number
  metalness: number
  textureUrl?: string
  normalMapUrl?: string
  roughnessMapUrl?: string
}

/**
 * Lighting / environment presets for the configurator canvas.
 */
export type EnvironmentPreset = 'studio' | 'gallery' | 'home' | 'daylight'

/**
 * Full scene configuration — the single object Node Gamma reads
 * to build the entire 3D scene.
 */
export interface SceneConfig {
  geometry: FrameGeometryParams
  frameMaterial: SceneMaterialParams
  /** Hex colour of the mat face, if passepartout is present */
  matColorHex?: string
  /** URL to the perspective-corrected artwork image (from Node Alpha) */
  artworkImageUrl: string
  environmentPreset: EnvironmentPreset
  /** Overlay physical dimension annotations */
  showDimensions: boolean
  /** Soft shadow intensity [0, 1] */
  shadowIntensity: number
}

/**
 * Camera orbit constraints for the configurator.
 * Prevents the user from navigating to nonsensical angles.
 */
export interface CameraConstraints {
  minPolarAngle: number    // radians — top limit
  maxPolarAngle: number    // radians — bottom limit
  minAzimuthAngle: number  // radians — left limit
  maxAzimuthAngle: number  // radians — right limit
  minDistance: number      // closest zoom
  maxDistance: number      // furthest zoom
}

export const DEFAULT_CAMERA_CONSTRAINTS: CameraConstraints = {
  minPolarAngle: Math.PI * 0.1,
  maxPolarAngle: Math.PI * 0.75,
  minAzimuthAngle: -Math.PI * 0.5,
  maxAzimuthAngle: Math.PI * 0.5,
  minDistance: 20,
  maxDistance: 120,
}

/**
 * AR export request — parameters needed to generate a .glb for model-viewer.
 */
export interface ARExportRequest {
  sceneConfig: SceneConfig
  /** Desired output mesh resolution: low for AR preview, high for export */
  quality: 'preview' | 'high'
}
