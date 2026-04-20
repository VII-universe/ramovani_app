'use client'

import { useMemo } from 'react'
import * as THREE from 'three'
import type { FrameGeometryParams } from '@ramovani/shared-types'

interface MatPlaneProps {
  geometry: FrameGeometryParams
  colorHex: string
}

/**
 * Renders the passepartout mat board as a flat plane with a rectangular hole
 * (using THREE.Shape with a subtracted path) for the artwork opening.
 */
export function MatPlane({ geometry, colorHex }: MatPlaneProps) {
  const {
    artworkWidthU,
    artworkHeightU,
    matOverlapU,
    matThicknessU,
  } = geometry

  const outerW = artworkWidthU
  const outerH = artworkHeightU
  const innerW = artworkWidthU - 2 * matOverlapU
  const innerH = artworkHeightU - 2 * matOverlapU

  const shapeGeo = useMemo(() => {
    const outer = new THREE.Shape()
    outer.moveTo(-outerW / 2, -outerH / 2)
    outer.lineTo(outerW / 2, -outerH / 2)
    outer.lineTo(outerW / 2, outerH / 2)
    outer.lineTo(-outerW / 2, outerH / 2)
    outer.closePath()

    const hole = new THREE.Path()
    hole.moveTo(-innerW / 2, -innerH / 2)
    hole.lineTo(innerW / 2, -innerH / 2)
    hole.lineTo(innerW / 2, innerH / 2)
    hole.lineTo(-innerW / 2, innerH / 2)
    hole.closePath()
    outer.holes.push(hole)

    return new THREE.ShapeGeometry(outer)
  }, [outerW, outerH, innerW, innerH])

  return (
    <mesh geometry={shapeGeo} position={[0, 0, matThicknessU * 0.5]} receiveShadow castShadow>
      <meshStandardMaterial color={colorHex} roughness={0.95} metalness={0} side={THREE.FrontSide} />
    </mesh>
  )
}
