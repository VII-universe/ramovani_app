import type { Metadata } from 'next'
import Link from 'next/link'
import { FrameGrid } from '@/components/catalog/FrameGrid'

export const metadata: Metadata = { title: 'Choose Frame — Ramovani' }

export default function FramePage() {
  return (
    <div className="container-page py-16">
      <div className="mx-auto max-w-5xl">
        <p className="font-mono text-2xs uppercase tracking-[0.2em] text-ink-tertiary">
          Step 2 of 4
        </p>
        <h1 className="mt-3 font-serif text-4xl font-light text-ink">
          Choose your frame
        </h1>
        <p className="mt-3 text-ink-secondary">
          Each molding is precision-cut to your artwork dimensions.
        </p>

        <div className="mt-10">
          <FrameGrid />
        </div>

        {/* Navigation */}
        <div className="mt-12 flex items-center justify-between border-t border-canvas-muted pt-8">
          <Link
            href="/configure/upload"
            className="font-mono text-xs uppercase tracking-[0.15em] text-ink-tertiary transition-opacity hover:opacity-60"
          >
            ← Back
          </Link>
          <Link
            href="/configure/passepartout"
            className="inline-block bg-ink px-8 py-3 font-mono text-xs uppercase tracking-[0.15em] text-canvas transition-opacity hover:opacity-75"
          >
            Continue →
          </Link>
        </div>
      </div>
    </div>
  )
}
