'use client'

import type { FrameGeometryParams } from '@ramovani/shared-types'

interface GlassPlaneProps {
  geometry: FrameGeometryParams
}

/**
 * Simulates anti-reflective glass: a thin, near-transparent plane
 * with a subtle blue-tint and low roughness for a specular sheen.
 */
export function GlassPlane({ geometry }: GlassPlaneProps) {
  const { artworkWidthU, artworkHeightU, matThicknessU, hasPassepartout, glassThicknessU } = geometry
  const zOffset = (hasPassepartout ? matThicknessU : 0) + glassThicknessU * 0.5 + 0.01

  return (
    <mesh position={[0, 0, zOffset]}>
      <planeGeometry args={[artworkWidthU, artworkHeightU]} />
      <meshPhysicalMaterial
        color="#ddeeff"
        transmission={0.94}
        roughness={0.04}
        metalness={0}
        thickness={glassThicknessU}
        transparent
        opacity={0.25}
        envMapIntensity={1.2}
      />
    </mesh>
  )
}
