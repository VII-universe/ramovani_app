'use client'

/**
 * FrameMesh — parametric picture frame built from ExtrudeGeometry.
 *
 * Geometry strategy
 * -----------------
 * Building four separate rails and rotating each one requires composing
 * non-obvious Euler triples (ExtrudeGeometry extrudes along +Z; redirecting
 * that extrusion to lie along X or Y involves a two-axis rotation).  Instead,
 * we use a single rectangular-annulus shape (outer rect with an inner-opening
 * hole) and extrude it once.  This produces a perfectly centred frame body
 * in one mesh, with no rotation needed.
 *
 * A second, shallower ExtrudeGeometry adds the rabbet lip — the thin inner
 * ledge at the back of the frame that physically holds the artwork stack.
 *
 * Z convention (matches the rest of the scene)
 * ---------------------------------------------
 * Camera sits at z = +60, looking toward the origin.
 * - Frame front face → z = 0  (toward camera)
 * - Frame back        → z = -totalDepthU
 * ExtrudeGeometry extrudes in the +Z direction, so we position each mesh at
 * a negative z offset equal to its depth so the extruded face ends at z = 0.
 *
 * Shadow
 * ------
 * Both meshes carry castShadow so the inner edge of the frame molding casts
 * a gradient shadow onto the mat board / artwork plane below.
 */

import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { FrameGeometryParams } from '@ramovani/shared-types'
import type { PBRParams } from '@ramovani/shared-types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FrameMeshProps {
  geometry: FrameGeometryParams
  pbr: PBRParams
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a rectangular annulus Shape (outer rect + inner hole).
 * Both rectangles are centred on the origin.
 */
function makeAnnulusShape(
  outerW: number,
  outerH: number,
  innerW: number,
  innerH: number,
): THREE.Shape {
  const hw = outerW / 2, hh = outerH / 2
  const hiw = innerW / 2, hih = innerH / 2

  const shape = new THREE.Shape()
  shape.moveTo(-hw, -hh)
  shape.lineTo( hw, -hh)
  shape.lineTo( hw,  hh)
  shape.lineTo(-hw,  hh)
  shape.closePath()

  const hole = new THREE.Path()
  hole.moveTo(-hiw, -hih)
  hole.lineTo( hiw, -hih)
  hole.lineTo( hiw,  hih)
  hole.lineTo(-hiw,  hih)
  hole.closePath()
  shape.holes.push(hole)

  return shape
}

const EXTRUDE_BASE: THREE.ExtrudeGeometryOptions = {
  steps: 1,
  bevelEnabled: false,
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FrameMesh({ geometry, pbr }: FrameMeshProps) {
  const {
    artworkWidthU,
    artworkHeightU,
    profileWidthU,
    totalDepthU,
    rabbetWidthU,
    rabbetDepthU,
  } = geometry

  // ── Derived dimensions ────────────────────────────────────────────────────

  // Outer extent of the frame (profile width added on each side of artwork).
  const outerW = artworkWidthU + 2 * profileWidthU
  const outerH = artworkHeightU + 2 * profileWidthU

  // Visible opening at the frame face (the artwork as seen through the front).
  const openingW = artworkWidthU
  const openingH = artworkHeightU

  // Depth of the main frame body (total minus the rabbet channel at the back).
  // Guard: rabbetDepthU must not exceed totalDepthU.
  const clampedRabbetDepth = Math.min(rabbetDepthU, totalDepthU * 0.8)
  const faceDepth = totalDepthU - clampedRabbetDepth

  // Rabbet inner opening: the artwork + 2× rabbet width on each side.
  // This is the slot the artwork physically slides into.
  // Guard: opening must stay positive.
  const rabbetInnerW = Math.max(openingW - 2 * rabbetWidthU, openingW * 0.1)
  const rabbetInnerH = Math.max(openingH - 2 * rabbetWidthU, openingH * 0.1)

  // ── Shapes ────────────────────────────────────────────────────────────────

  /**
   * Main frame body: from the outer edge to the visible opening.
   * Depth = totalDepthU - rabbetDepthU (the "face plate").
   */
  const bodyShape = useMemo(
    () => makeAnnulusShape(outerW, outerH, openingW, openingH),
    [outerW, outerH, openingW, openingH],
  )

  /**
   * Rabbet lip: the thin inner ledge at the back of the frame.
   * Outer edge matches the opening; inner edge is narrowed by rabbetWidthU.
   * Depth = rabbetDepthU (the remaining back section).
   */
  const rabbetShape = useMemo(
    () => makeAnnulusShape(openingW, openingH, rabbetInnerW, rabbetInnerH),
    [openingW, openingH, rabbetInnerW, rabbetInnerH],
  )

  // ── Geometries ────────────────────────────────────────────────────────────

  const bodyGeo = useMemo(
    () => new THREE.ExtrudeGeometry(bodyShape, { ...EXTRUDE_BASE, depth: faceDepth }),
    [bodyShape, faceDepth],
  )

  const rabbetGeo = useMemo(
    () => new THREE.ExtrudeGeometry(rabbetShape, { ...EXTRUDE_BASE, depth: clampedRabbetDepth }),
    [rabbetShape, clampedRabbetDepth],
  )

  // Dispose imperatively created geometries when they are replaced or
  // the component unmounts — Three.js does not garbage-collect these.
  useEffect(() => {
    return () => {
      bodyGeo.dispose()
      rabbetGeo.dispose()
    }
  }, [bodyGeo, rabbetGeo])

  // ── Material ──────────────────────────────────────────────────────────────

  // meshStandardMaterial responds to the DirectionalLight and AmbientLight in
  // Lighting.tsx, giving physically-based shading and receiving shadows from
  // the frame edge onto the mat / artwork planes.
  const material = (
    <meshStandardMaterial
      color={pbr.colorHex}
      roughness={pbr.roughness}
      metalness={pbr.metalness}
    />
  )

  // ── Positions ─────────────────────────────────────────────────────────────

  // ExtrudeGeometry extrudes in +Z (toward camera).
  // Positioning at z = -depth makes the extruded (+Z) face land at z = 0,
  // so the visible front face of the frame is flush with the artwork plane.

  return (
    <group>
      {/* Main face plate — the visible molding face */}
      <mesh
        geometry={bodyGeo}
        position={[0, 0, -faceDepth]}
        castShadow
        receiveShadow
      >
        {material}
      </mesh>

      {/* Rabbet lip — inner ledge at the back holding the artwork stack */}
      <mesh
        geometry={rabbetGeo}
        position={[0, 0, -totalDepthU]}
        castShadow
        receiveShadow
      >
        {material}
      </mesh>
    </group>
  )
}
