'use client'

/**
 * Lighting — gallery-quality three-point rig for the framing configurator.
 *
 * Light roles
 * -----------
 *
 *  Key light  (DirectionalLight, upper-left, warm white, castShadow)
 *    The primary light source.  Rakes across the frame face at ~40° to reveal
 *    surface texture (wood grain, brushed metal).  The shadow camera is sized
 *    tightly around the largest expected frame so the full 2048² shadow map is
 *    spent on the frame rather than empty scene.
 *
 *    Shadow target: the inner frame edge casts a soft gradient shadow onto the
 *    mat board and artwork plane.  This is the most visually important shadow
 *    in the scene — it makes the frame look three-dimensional and grounded.
 *
 *  Fill light  (DirectionalLight, upper-right, cool blue-white, no shadow)
 *    Lifts the shadow side of the frame molding so it doesn't go fully black.
 *    The slight cool tint creates a warm/cool contrast that reads as natural
 *    gallery lighting (warm tungsten key, cool daylight fill).
 *
 *  Rim light   (DirectionalLight, behind + below, neutral, no shadow)
 *    Separates the dark frame from a dark background by catching the back
 *    edges of the molding.  Keeps the frame readable when the user orbits to
 *    an oblique angle.
 *
 *  Ambient     (AmbientLight, very warm, low intensity)
 *    Floor for global illumination.  Without this, any face perpendicular to
 *    all three directional lights would be pure black.
 *
 * Shadow map configuration
 * ------------------------
 * - mapSize 2048×2048: crisp enough for a close-up product view.
 * - camera bounds ±40 world units (= ±400 mm): covers up to an 80 cm frame
 *   with one profile width of margin.  Tighter than the previous ±60 so each
 *   texel covers fewer scene units → sharper shadow edge.
 * - shadow-radius 3: PCF kernel size for soft penumbra.  Requires the
 *   PCFSoftShadowMap set on the Canvas (`shadows="soft"`).
 * - shadow-bias -0.0005: counteracts shadow acne on flat planes without the
 *   self-shadowing artefacts that larger bias values introduce.
 */

export function Lighting() {
  return (
    <>
      {/* Global fill floor — prevents fully-black faces */}
      <ambientLight intensity={0.30} color="#FFF5EC" />

      {/*
       * Key light — casts the critical frame-edge shadow onto the mat/artwork.
       * Position: upper-left, angled so light crosses the frame face diagonally.
       */}
      <directionalLight
        position={[-8, 14, 12]}
        intensity={1.6}
        color="#FFF4E0"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={160}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
        shadow-radius={3}
        shadow-bias={-0.0005}
      />

      {/*
       * Fill light — cool counterpart to the warm key.
       * Upper-right, no shadow (performance + avoids double-shadow artefacts).
       */}
      <directionalLight
        position={[10, 8, 6]}
        intensity={0.45}
        color="#D8EAFF"
      />

      {/*
       * Rim light — catches back edges when the user orbits the frame.
       * Comes from behind and slightly below to separate frame from background.
       */}
      <directionalLight
        position={[2, -6, -12]}
        intensity={0.20}
        color="#FFFFFF"
      />
    </>
  )
}
