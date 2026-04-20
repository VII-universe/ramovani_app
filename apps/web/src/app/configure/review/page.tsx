import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { PriceSummary } from '@/components/catalog/PriceSummary'
import { Spinner } from '@/components/ui/spinner'

export const metadata: Metadata = { title: 'Review & Order — Ramovani' }

/**
 * Scene is loaded client-side only.
 *
 * `ssr: false` is mandatory: @react-three/fiber's Canvas initialises WebGL
 * and reads `window` during import, which crashes on the server.
 * Next.js dynamic() handles this cleanly — the server renders the `loading`
 * fallback; the client hydrates and mounts the real Canvas.
 *
 * The Scene component itself reads canvasDimensions, selectedFrame, and
 * selectedPassepartout directly from the Zustand store via selectors —
 * no props need to be threaded down from this Server Component.
 */
const Scene = dynamic(
  () => import('@/components/configurator/Scene').then((m) => m.Scene),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-canvas-subtle">
        <Spinner size="lg" />
      </div>
    ),
  },
)

export default function ReviewPage() {
  return (
    <div className="container-page py-16">
      <div className="mx-auto max-w-6xl">
        <p className="font-mono text-2xs uppercase tracking-[0.2em] text-ink-tertiary">
          Step 4 of 4
        </p>
        <h1 className="mt-3 font-serif text-4xl font-light text-ink">
          Review your frame
        </h1>
        <p className="mt-3 text-ink-secondary">
          Rotate, inspect, and confirm before we start cutting.
        </p>

        {/*
         * Two-column layout:
         *   Left  — parametric 3D scene (Node Gamma)
         *   Right — order summary + confirm button (Node Beta data)
         *
         * The Scene reads state (canvasDimensions, selectedFrame, passepartout)
         * from Zustand internally. If the user arrives here without completing
         * Steps 1–2, Scene renders its own "Complete steps 1 & 2" placeholder.
         */}
        <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_380px]">
          {/* 3D canvas — square aspect ratio to keep the frame centred */}
          <div className="aspect-square w-full overflow-hidden rounded-lg">
            <Scene />
          </div>

          {/* Sidebar: artwork dimensions, frame, mat, glass toggle, pricing, confirm */}
          <PriceSummary />
        </div>

        {/* Back navigation */}
        <div className="mt-12 border-t border-canvas-muted pt-8">
          <Link
            href="/configure/passepartout"
            className="font-mono text-xs uppercase tracking-[0.15em] text-ink-tertiary transition-opacity hover:opacity-60"
          >
            ← Back to mat selection
          </Link>
        </div>
      </div>
    </div>
  )
}
