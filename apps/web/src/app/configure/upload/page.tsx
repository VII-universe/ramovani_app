import type { Metadata } from 'next'
import Link from 'next/link'
import { UploadFlow } from '@/components/upload/UploadFlow'
import { VisionResultPreview } from '@/components/upload/VisionResultPreview'

export const metadata: Metadata = { title: 'Upload Artwork — Ramovani' }

export default function UploadPage() {
  return (
    <div className="container-page py-16">
      <div className="mx-auto max-w-2xl">
        <p className="font-mono text-2xs uppercase tracking-[0.2em] text-ink-tertiary">
          Step 1 of 4
        </p>
        <h1 className="mt-3 font-serif text-4xl font-light text-ink">
          Upload your artwork
        </h1>
        <p className="mt-3 text-ink-secondary">
          Drag the corner handles onto your artwork, enter one physical measurement,
          and we'll calculate the exact dimensions.
        </p>

        <div className="mt-10 space-y-6">
          <UploadFlow />
          <VisionResultPreview />
        </div>

        {/* Skip — go straight to frame browsing without artwork */}
        <div className="mt-12 flex items-center justify-between border-t border-canvas-muted pt-8">
          <span />
          <Link
            href="/configure/frame"
            className="font-mono text-xs uppercase tracking-[0.15em] text-ink-tertiary transition-opacity hover:opacity-60"
          >
            Skip — browse frames without artwork →
          </Link>
        </div>
      </div>
    </div>
  )
}
