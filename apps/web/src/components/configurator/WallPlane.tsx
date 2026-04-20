'use client'

/**
 * WallPlane — a large matte plane that sits behind the frame to simulate
 * a gallery wall.
 *
 * Positioning:
 *   The frame front face is at z = 0, back face at z = -totalDepthU.
 *   We push the wall to z = -totalDepthU - 1.0 so it clears the rabbet
 *   by ~10 mm and creates the illusion the frame is mounted on the wall.
 *
 * Shadows:
 *   receiveShadow = true. The key directional light (upper-left, castShadow)
 *   rakes across the frame and projects its silhouette onto the wall — the
 *   most important visual cue that the frame is 3-dimensional.
 */

interface WallPlaneProps {
  color: string
  frameBackZ: number   // z position of frame back face (negative value)
}

export function WallPlane({ color, frameBackZ }: WallPlaneProps) {
  // Push wall 1 world unit (10 mm) behind the frame back face
  const wallZ = frameBackZ - 1.0

  return (
    <mesh position={[0, 0, wallZ]} receiveShadow>
      {/* 200 × 140 world units = 2 m × 1.4 m — fills any camera view at this FOV */}
      <planeGeometry args={[200, 140]} />
      <meshStandardMaterial
        color={color}
        roughness={0.85}
        metalness={0}
      />
    </mesh>
  )
}
