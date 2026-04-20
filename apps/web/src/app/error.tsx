'use client'

import { useEffect } from 'react'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log to console in development; swap for an error-reporting service in prod
    console.error('[app error boundary]', error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 text-center">
      <p className="font-mono text-2xs uppercase tracking-[0.2em] text-ink-tertiary">
        Something went wrong
      </p>
      <h1 className="mt-4 font-serif text-3xl font-light text-ink">
        An unexpected error occurred
      </h1>
      {error.message && (
        <p className="mt-3 max-w-md font-sans text-sm text-ink-secondary">
          {error.message}
        </p>
      )}
      {process.env.NODE_ENV === 'development' && error.stack && (
        <pre className="mt-6 max-w-2xl overflow-x-auto rounded border border-canvas-muted bg-canvas-subtle p-4 text-left font-mono text-xs text-ink-secondary">
          {error.stack}
        </pre>
      )}
      <button
        type="button"
        onClick={reset}
        className="mt-8 border border-ink px-6 py-3 font-mono text-xs uppercase tracking-[0.15em] text-ink transition-opacity hover:opacity-60"
      >
        Try again
      </button>
    </div>
  )
}
