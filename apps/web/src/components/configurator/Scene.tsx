'use client'

/**
 * Scene — root R3F canvas for the framing configurator.
 *
 * Always mounts the WebGL Canvas, even before Steps 1 & 2 are complete.
 * When real state is absent, FALLBACK_FRAME / FALLBACK_DIMENSIONS are used
 * so the user sees a preview frame immediately.  ArtworkPlane is only rendered
 * when a real croppedImageUrl exists (useTexture would throw on an empty string).
 */

import { Suspense, useMemo } from 'react'
import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import { Environment, OrbitControls } from '@react-three/drei'
import { useStore, selectors } from '@/store'
import { mmToWorldUnits } from '@/lib/utils'
import { GLASS_THICKNESS_WORLD, SCENE_BG_COLOR } from '@/lib/constants'
import type { FrameGeometryParams, FrameProfile } from '@ramovani/shared-types'
import { DEFAULT_CAMERA_CONSTRAINTS } from '@ramovani/shared-types'
import { FrameMesh } from './FrameMesh'
import { ArtworkPlane } from './ArtworkPlane'
import { MatPlane } from './MatPlane'
import { GlassPlane } from './GlassPlane'
import { Lighting } from './Lighting'
import { CameraRig } from './CameraRig'
import { Spinner } from '@/components/ui/spinner'

// ---------------------------------------------------------------------------
// Fallback data — used when the user arrives at Step 4 without completing 1 & 2
// ---------------------------------------------------------------------------

const FALLBACK_FRAME: FrameProfile = {
  id: 'preview',
  name: 'Preview Frame',
  slug: 'preview-frame',
  material: 'wood',
  finish: 'natural',
  profileWidthMm: 35,
  totalDepthMm: 18,
  rabbetDepthMm: 8,
  rabbetWidthMm: 6,
  pbr: { colorHex: '#C8A97A', roughness: 0.7, metalness: 0.0 },
  pricePerMeter: 0,
  currency: 'EUR',
  inStock: true,
  thumbnailUrl: '',
  imageUrls: [],
  createdAt: '',
  updatedAt: '',
}

const FALLBACK_DIMENSIONS = { widthMm: 300, heightMm: 400 }

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

export function Scene() {
  const artworkDimensions    = useStore(selectors.artworkDimensions)
  const selectedFrame        = useStore(selectors.selectedFrame)
  const selectedPassepartout = useStore(selectors.selectedPassepartout)
  const passepartoutOverlapMm = useStore(selectors.passepartoutOverlapMm)
  const includeGlass         = useStore(selectors.includeGlass)
  const visionResult         = useStore(selectors.visionResult)

  // Use real state when available, fall back to defaults so Canvas always renders.
  const activeDimensions = artworkDimensions ?? FALLBACK_DIMENSIONS
  const activeFrame      = selectedFrame      ?? FALLBACK_FRAME

  const geometry = useMemo<FrameGeometryParams>(() => {
    const hasPassepartout = selectedPassepartout !== null
    return {
      artworkWidthU:  mmToWorldUnits(activeDimensions.widthMm),
      artworkHeightU: mmToWorldUnits(activeDimensions.heightMm),

      hasPassepartout,
      matOverlapU:    hasPassepartout ? mmToWorldUnits(passepartoutOverlapMm) : 0,
      matThicknessU:  mmToWorldUnits(selectedPassepartout?.thicknessMm ?? 0),

      profileWidthU: mmToWorldUnits(activeFrame.profileWidthMm),
      totalDepthU:   mmToWorldUnits(activeFrame.totalDepthMm),
      rabbetDepthU:  mmToWorldUnits(activeFrame.rabbetDepthMm),
      rabbetWidthU:  mmToWorldUnits(activeFrame.rabbetWidthMm),

      hasGlass:         includeGlass,
      glassThicknessU:  GLASS_THICKNESS_WORLD,
    }
  }, [activeDimensions, activeFrame, selectedPassepartout, passepartoutOverlapMm, includeGlass])

  const croppedImageUrl = visionResult?.croppedImageUrl ?? null

  return (
    <Canvas
      shadows="soft"
      dpr={[1, 2]}
      gl={{
        antialias: true,
        alpha: false,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 0.9,
      }}
      camera={{
        position: [0, 0, 60],
        fov: 35,
        near: 0.1,
        far: 500,
      }}
      style={{ background: SCENE_BG_COLOR }}
    >
      {/* Suspense boundary wraps everything so useTexture can suspend safely */}
      <Suspense fallback={null}>

        {/* ── Lighting & environment ── */}
        <Lighting />
        <Environment preset="studio" background={false} />

        {/*
         * 1. Artwork image — only when a real URL is available.
         *    useTexture throws on empty strings, so we skip it for the fallback state.
         */}
        {croppedImageUrl && (
          <ArtworkPlane geometry={geometry} imageUrl={croppedImageUrl} />
        )}

        {/* 2. Passepartout mat */}
        {geometry.hasPassepartout && selectedPassepartout && (
          <MatPlane geometry={geometry} colorHex={selectedPassepartout.colorHex} />
        )}

        {/* 3. Parametric frame — always rendered */}
        <FrameMesh geometry={geometry} pbr={activeFrame.pbr} />

        {/* 4. Glass — frontmost transmissive layer */}
        {geometry.hasGlass && <GlassPlane geometry={geometry} />}

        {/* ── Camera ── */}
        <CameraRig constraints={DEFAULT_CAMERA_CONSTRAINTS} />
        <OrbitControls
          minPolarAngle={DEFAULT_CAMERA_CONSTRAINTS.minPolarAngle}
          maxPolarAngle={DEFAULT_CAMERA_CONSTRAINTS.maxPolarAngle}
          minAzimuthAngle={DEFAULT_CAMERA_CONSTRAINTS.minAzimuthAngle}
          maxAzimuthAngle={DEFAULT_CAMERA_CONSTRAINTS.maxAzimuthAngle}
          minDistance={DEFAULT_CAMERA_CONSTRAINTS.minDistance}
          maxDistance={DEFAULT_CAMERA_CONSTRAINTS.maxDistance}
          enablePan={false}
          enableDamping
          dampingFactor={0.07}
        />

      </Suspense>
    </Canvas>
  )
}

// ---------------------------------------------------------------------------
// SceneSkeleton — shown by the dynamic() loading boundary in review/page.tsx
// ---------------------------------------------------------------------------

export function SceneSkeleton() {
  return (
    <div className="flex h-full items-center justify-center bg-canvas-subtle">
      <Spinner size="lg" />
    </div>
  )
}
