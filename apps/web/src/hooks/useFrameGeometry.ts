'use client'

import { useMemo } from 'react'
import { useStore, selectors } from '@/store'
import type { FrameGeometryParams } from '@ramovani/shared-types'
import { mmToWorldUnits } from '@/lib/utils'
import { GLASS_THICKNESS_WORLD } from '@/lib/constants'

/**
 * Derives FrameGeometryParams (Three.js world units) from Zustand state.
 * Returns null when not enough state is available to render the scene.
 * Memoised — only recalculates when relevant slice values change.
 */
export function useFrameGeometry(): FrameGeometryParams | null {
  const artworkDimensions = useStore(selectors.artworkDimensions)
  const selectedFrame = useStore(selectors.selectedFrame)
  const selectedPassepartout = useStore(selectors.selectedPassepartout)
  const passepartoutOverlapMm = useStore(selectors.passepartoutOverlapMm)
  const includeGlass = useStore(selectors.includeGlass)

  return useMemo(() => {
    if (!artworkDimensions || !selectedFrame) return null

    const hasPassepartout = selectedPassepartout !== null
    const matThicknessMm = selectedPassepartout?.thicknessMm ?? 0

    return {
      artworkWidthU: mmToWorldUnits(artworkDimensions.widthMm),
      artworkHeightU: mmToWorldUnits(artworkDimensions.heightMm),

      hasPassepartout,
      matOverlapU: hasPassepartout ? mmToWorldUnits(passepartoutOverlapMm) : 0,
      matThicknessU: mmToWorldUnits(matThicknessMm),

      profileWidthU: mmToWorldUnits(selectedFrame.profileWidthMm),
      totalDepthU: mmToWorldUnits(selectedFrame.totalDepthMm),
      rabbetDepthU: mmToWorldUnits(selectedFrame.rabbetDepthMm),
      rabbetWidthU: mmToWorldUnits(selectedFrame.rabbetWidthMm),

      hasGlass: includeGlass,
      glassThicknessU: GLASS_THICKNESS_WORLD,
    } satisfies FrameGeometryParams
  }, [
    artworkDimensions,
    selectedFrame,
    selectedPassepartout,
    passepartoutOverlapMm,
    includeGlass,
  ])
}
