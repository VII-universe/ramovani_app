'use client'

/**
 * GlassPlane — simulates anti-reflective museum glass over the artwork.
 *
 * Material recipe:
 *   transmission  0.92   — lets almost all light through (slightly tinted)
 *   roughness     0.03   — near-perfectly smooth, gives sharp specular highlight
 *   metalness     0.0    — dielectric, not metallic
 *   ior           1.52   — borosilicate glass refractive index
 *   reflectivity  0.08   — subtle Fresnel reflection at oblique angles
 *   thickness     real glass depth in world units — drives refraction depth
 *   color         #E8F4FF — very faint blue tint (AR coating)
 *   envMapIntensity 1.6  — picks up studio environment for the specular sheen
 *
 * The thin BoxGeometry (rather than a zero-thickness plane) is important:
 * MeshPhysicalMaterial's transmission requires geometry with actual depth
 * for the refraction shader to work correctly.
 */

import type { FrameGeometryParams } from '@ramovani/shared-types'

interface GlassPlaneProps {
  geometry: FrameGeometryParams
}

export function GlassPlane({ geometry }: GlassPlaneProps) {
  const {
    artworkWidthU,
    artworkHeightU,
    matThicknessU,
    hasPassepartout,
    glassThicknessU,
  } = geometry

  // Sit just in front of the mat (or artwork if no mat), centred on the stack
  const zCenter = (hasPassepartout ? matThicknessU : 0) + glassThicknessU * 0.5 + 0.02

  return (
    <mesh position={[0, 0, zCenter]} castShadow={false}>
      <boxGeometry args={[artworkWidthU, artworkHeightU, glassThicknessU]} />
      <meshPhysicalMaterial
        color="#E8F4FF"
        transmission={0.92}
        roughness={0.03}
        metalness={0}
        ior={1.52}
        reflectivity={0.08}
        thickness={glassThicknessU}
        transparent
        opacity={0.18}
        envMapIntensity={1.6}
        toneMapped={false}
      />
    </mesh>
  )
}
