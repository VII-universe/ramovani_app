'use client'

import { useEffect, useRef } from 'react'

interface ARViewerProps {
  /** URL to a .glb model — generated server-side on demand */
  modelUrl: string
  /** Physical width of the frame in metres (for AR scale) */
  widthMeters: number
  /** Physical height of the frame in metres */
  heightMeters: number
  poster?: string
}

/**
 * Wraps @google/model-viewer web component.
 * Loaded lazily — the script is injected only when this component mounts.
 */
export function ARViewer({ modelUrl, widthMeters, heightMeters, poster }: ARViewerProps) {
  const ref = useRef<HTMLElement | null>(null)

  useEffect(() => {
    // Inject the model-viewer script once
    if (!document.querySelector('script[data-mv]')) {
      const script = document.createElement('script')
      script.type = 'module'
      script.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js'
      script.dataset['mv'] = '1'
      document.head.appendChild(script)
    }
  }, [])

  return (
    // @ts-expect-error — model-viewer is a custom element, not in JSX typedefs
    <model-viewer
      ref={ref}
      src={modelUrl}
      poster={poster}
      alt="3D frame preview"
      ar
      ar-modes="webxr scene-viewer quick-look"
      camera-controls
      auto-rotate
      shadow-intensity="1"
      style={{
        width: '100%',
        height: '100%',
        '--poster-color': 'transparent',
      }}
      data-width-meters={widthMeters}
      data-height-meters={heightMeters}
    />
  )
}
