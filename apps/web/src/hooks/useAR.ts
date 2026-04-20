'use client'

import { useState, useCallback } from 'react'
import { useStore, selectors } from '@/store'

interface ARExportState {
  isExporting: boolean
  modelUrl: string | null
  error: string | null
}

/**
 * Triggers server-side GLB generation for AR preview.
 * The actual export endpoint is a future implementation — this hook
 * owns the loading state and model URL lifecycle.
 */
export function useAR() {
  const [state, setState] = useState<ARExportState>({
    isExporting: false,
    modelUrl: null,
    error: null,
  })

  const confirmedOrder = useStore(selectors.confirmedOrder)
  const visionResult = useStore(selectors.visionResult)

  const requestARExport = useCallback(async () => {
    if (!confirmedOrder || !visionResult) return

    setState({ isExporting: true, modelUrl: null, error: null })

    try {
      // Placeholder — AR export endpoint to be implemented in a future module
      const catalogApiUrl = process.env['NEXT_PUBLIC_CATALOG_API_URL'] ?? 'http://localhost:8002'
      const response = await fetch(`${catalogApiUrl}/ar/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: confirmedOrder.quote.quoteId }),
      })

      if (!response.ok) throw new Error('AR export failed')

      const { modelUrl } = await response.json() as { modelUrl: string }
      setState({ isExporting: false, modelUrl, error: null })
    } catch (err) {
      setState({
        isExporting: false,
        modelUrl: null,
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  }, [confirmedOrder, visionResult])

  return { ...state, requestARExport }
}
