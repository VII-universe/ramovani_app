'use client'

import { useEffect, useState } from 'react'
import type { FrameProfile, PassepartoutProfile, FrameCatalogFilters } from '@ramovani/shared-types'
import { catalogApi } from '@/lib/api'

interface CatalogState {
  frames: FrameProfile[]
  passepartouts: PassepartoutProfile[]
  isLoading: boolean
  error: string | null
}

/**
 * Fetches frame and passepartout catalogs from Node Beta.
 * Caches in module-level memory for the session — no SWR/React Query needed yet.
 */
let frameCache: FrameProfile[] | null = null
let passepartoutCache: PassepartoutProfile[] | null = null

export function useCatalog(filters?: FrameCatalogFilters) {
  const [state, setState] = useState<CatalogState>({
    frames: frameCache ?? [],
    passepartouts: passepartoutCache ?? [],
    isLoading: !frameCache || !passepartoutCache,
    error: null,
  })

  useEffect(() => {
    if (frameCache && passepartoutCache) return

    let cancelled = false

    async function fetchAll() {
      setState((s) => ({ ...s, isLoading: true, error: null }))
      try {
        const [framesRes, passepartoutsRes] = await Promise.all([
          catalogApi.getFrames<{ items: FrameProfile[] }>(
            filters as Record<string, string | number | boolean> | undefined,
          ),
          catalogApi.getPassepartouts<{ items: PassepartoutProfile[] }>(),
        ])
        if (cancelled) return
        frameCache = framesRes.items
        passepartoutCache = passepartoutsRes.items
        setState({ frames: frameCache, passepartouts: passepartoutCache, isLoading: false, error: null })
      } catch (err) {
        if (cancelled) return
        setState((s) => ({
          ...s,
          isLoading: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        }))
      }
    }

    fetchAll()
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return state
}
