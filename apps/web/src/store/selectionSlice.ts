// ─────────────────────────────────────────────────────────────────────────────
// selectionSlice — Node Beta catalog selections
// Owns: the chosen frame profile, passepartout, glass toggle, and overlap setting.
// Node Gamma reads this slice to build geometry and material params.
// ─────────────────────────────────────────────────────────────────────────────
import type { StateCreator } from 'zustand'
import type { FrameProfile, PassepartoutProfile } from '@ramovani/shared-types'
import type { StoreState } from './index'

export interface SelectionSlice {
  // ── State ──────────────────────────────────────────────────────────────────
  /** Full frame profile object once loaded from catalog */
  selectedFrame: FrameProfile | null
  /** Full passepartout profile object, null = no mat */
  selectedPassepartout: PassepartoutProfile | null
  /**
   * How much the mat overlaps the artwork on each side (mm).
   * Default: 8 mm. User-adjustable in the passepartout step.
   */
  passepartoutOverlapMm: number
  includeGlass: boolean

  // ── Actions ────────────────────────────────────────────────────────────────
  selectFrame: (frame: FrameProfile) => void
  clearFrame: () => void
  selectPassepartout: (passepartout: PassepartoutProfile) => void
  clearPassepartout: () => void
  setPassepartoutOverlap: (mm: number) => void
  toggleGlass: () => void
  setIncludeGlass: (include: boolean) => void
  resetSelection: () => void
}

const OVERLAP_MIN_MM = 5
const OVERLAP_MAX_MM = 50

const initialSelectionState = {
  selectedFrame: null,
  selectedPassepartout: null,
  passepartoutOverlapMm: 8,
  includeGlass: true,
}

export const createSelectionSlice: StateCreator<
  StoreState,
  [['zustand/immer', never]],
  [],
  SelectionSlice
> = (set) => ({
  ...initialSelectionState,

  selectFrame: (frame) => {
    set((state) => {
      state.selectedFrame = frame
    })
  },

  clearFrame: () => {
    set((state) => {
      state.selectedFrame = null
    })
  },

  selectPassepartout: (passepartout) => {
    set((state) => {
      state.selectedPassepartout = passepartout
    })
  },

  clearPassepartout: () => {
    set((state) => {
      state.selectedPassepartout = null
    })
  },

  setPassepartoutOverlap: (mm) => {
    const clamped = Math.min(OVERLAP_MAX_MM, Math.max(OVERLAP_MIN_MM, mm))
    set((state) => {
      state.passepartoutOverlapMm = clamped
    })
  },

  toggleGlass: () => {
    set((state) => {
      state.includeGlass = !state.includeGlass
    })
  },

  setIncludeGlass: (include) => {
    set((state) => {
      state.includeGlass = include
    })
  },

  resetSelection: () => {
    set((state) => {
      Object.assign(state, initialSelectionState)
    })
  },
})
