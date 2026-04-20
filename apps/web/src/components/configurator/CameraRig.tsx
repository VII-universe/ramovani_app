'use client'

import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { CameraConstraints } from '@ramovani/shared-types'
import { useStore, selectors } from '@/store'

interface CameraRigProps {
  constraints: CameraConstraints
}

/**
 * Smooth auto-frame camera: on first mount (or when geometry changes),
 * the camera eases to a position that fits the frame comfortably in view.
 * After that, OrbitControls takes over.
 */
export function CameraRig({ constraints }: CameraRigProps) {
  const { camera } = useThree()
  const targetZ = useRef(60)
  const settled = useRef(false)
  const geometry = useStore(selectors.artworkDimensions)

  // Recalculate target distance when geometry changes
  if (geometry) {
    const maxDim = Math.max(geometry.widthMm, geometry.heightMm) / 10 // → world units
    targetZ.current = Math.min(
      constraints.maxDistance,
      Math.max(constraints.minDistance, maxDim * 2.2),
    )
    settled.current = false
  }

  useFrame(() => {
    if (settled.current) return
    const current = camera.position.z
    const target = targetZ.current
    const next = THREE.MathUtils.lerp(current, target, 0.06)
    camera.position.setZ(next)
    if (Math.abs(next - target) < 0.05) {
      camera.position.setZ(target)
      settled.current = true
    }
  })

  return null
}
