'use client'

import { useCatalog } from '@/hooks/useCatalog'
import { FrameCard } from './FrameCard'
import { Spinner } from '@/components/ui/spinner'

export function FrameGrid() {
  const { frames, isLoading, error } = useCatalog()

  if (isLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <p className="font-sans text-sm text-error">
        Failed to load frames — {error}
      </p>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
      {frames.map((frame) => (
        <FrameCard key={frame.id} frame={frame} />
      ))}
    </div>
  )
}
