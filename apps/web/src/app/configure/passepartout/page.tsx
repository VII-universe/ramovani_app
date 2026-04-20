import type { Metadata } from 'next'
import Link from 'next/link'
import { PassepartoutSwatch } from '@/components/catalog/PassepartoutSwatch'

export const metadata: Metadata = { title: 'Add Mat — Ramovani' }

export default function PassepartoutPage() {
  return (
    <div className="container-page py-16">
      <div className="mx-auto max-w-3xl">
        <p className="font-mono text-2xs uppercase tracking-[0.2em] text-ink-tertiary">
          Step 3 of 4
        </p>
        <h1 className="mt-3 font-serif text-4xl font-light text-ink">
          Add a passepartout
        </h1>
        <p className="mt-3 text-ink-secondary">
          A mat board creates breathing room between your artwork and the frame.
          Optional — skip if you prefer a borderless look.
        </p>

        <div className="mt-10">
          <PassepartoutSwatch />
        </div>

        {/* Navigation */}
        <div className="mt-12 flex items-center justify-between border-t border-canvas-muted pt-8">
          <Link
            href="/configure/frame"
            className="font-mono text-xs uppercase tracking-[0.15em] text-ink-tertiary transition-opacity hover:opacity-60"
          >
            ← Back
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/configure/review"
              className="font-mono text-xs uppercase tracking-[0.15em] text-ink-tertiary transition-opacity hover:opacity-60"
            >
              Skip
            </Link>
            <Link
              href="/configure/review"
              className="inline-block bg-ink px-8 py-3 font-mono text-xs uppercase tracking-[0.15em] text-canvas transition-opacity hover:opacity-75"
            >
              Continue →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
