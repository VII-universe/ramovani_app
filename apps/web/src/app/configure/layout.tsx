'use client'

import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useStore } from '@/store'

const STEPS = ['Upload', 'Frame', 'Passepartout', 'Review'] as const

/**
 * Triggers Zustand persist rehydration after the client mounts.
 * We use skipHydration:true on the persist middleware to prevent React from
 * throwing a hydration error when the server HTML (initial state) doesn't match
 * the client's first render (persisted state from localStorage).
 * This component bridges the gap: safe hydration first, then localStorage load.
 */
function StoreHydration() {
  useEffect(() => {
    useStore.persist.rehydrate()
  }, [])
  return null
}

export default function ConfigureLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      {/* Top nav strip */}
      <header className="border-b border-canvas-muted bg-canvas/80 backdrop-blur-sm">
        <div className="container-page flex h-16 items-center justify-between">
          <span className="font-serif text-xl font-light text-ink">Ramovani</span>
          <nav aria-label="Configuration steps">
            <ol className="flex items-center gap-8">
              {STEPS.map((step, i) => (
                <li
                  key={step}
                  className="flex items-center gap-2 font-mono text-2xs uppercase tracking-[0.15em] text-ink-tertiary"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full border border-current text-[10px]">
                    {i + 1}
                  </span>
                  <span className="hidden sm:inline">{step}</span>
                </li>
              ))}
            </ol>
          </nav>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1">{children}</main>

      {/* Rehydrates Zustand persist store from localStorage after safe hydration */}
      <StoreHydration />
    </div>
  )
}
