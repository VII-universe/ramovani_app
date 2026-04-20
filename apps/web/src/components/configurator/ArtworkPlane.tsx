'use client'

import { useTexture } from '@react-three/drei'
import type { FrameGeometryParams } from '@ramovani/shared-types'

interface ArtworkPlaneProps {
  geometry: FrameGeometryParams
  imageUrl: string
}

export function ArtworkPlane({ geometry, imageUrl }: ArtworkPlaneProps) {
  const { artworkWidthU, artworkHeightU } = geometry
  const texture = useTexture(imageUrl)

  return (
    <mesh position={[0, 0, -0.05]} receiveShadow>
      <planeGeometry args={[artworkWidthU, artworkHeightU]} />
      <meshStandardMaterial map={texture} roughness={0.85} metalness={0} />
    </mesh>
  )
}
