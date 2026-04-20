import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Custom Picture Framing' }

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6">
      <div className="max-w-2xl text-center">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-tertiary">
          Ramovani
        </p>
        <h1 className="mt-4 font-serif text-6xl font-light text-ink">
          Frame your world,
          <br />
          <em>precisely.</em>
        </h1>
        <p className="mt-6 font-sans text-lg text-ink-secondary">
          Upload your artwork. We measure it. You choose your frame. Preview it in 3D.
        </p>
        <Link
          href="/configure/upload"
          className="mt-10 inline-block bg-ink px-10 py-4 font-sans text-sm uppercase tracking-[0.15em] text-canvas transition-opacity duration-250 hover:opacity-75"
        >
          Start framing
        </Link>
      </div>
    </main>
  )
}
