import type { ReactNode } from 'react'
import Link from 'next/link'

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas-subtle">
      <header className="border-b border-canvas-muted bg-canvas">
        <div className="container-page flex h-14 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-serif text-lg font-light text-ink">
              Ramovani
            </Link>
            <span className="text-canvas-muted">|</span>
            <span className="font-mono text-2xs uppercase tracking-[0.15em] text-ink-tertiary">
              Workshop Admin
            </span>
          </div>
          <nav className="flex items-center gap-6">
            <Link
              href="/admin/orders"
              className="font-mono text-2xs uppercase tracking-[0.12em] text-ink-secondary transition-opacity hover:opacity-60"
            >
              Orders
            </Link>
            <Link
              href="/admin/inventory"
              className="font-mono text-2xs uppercase tracking-[0.12em] text-ink-secondary transition-opacity hover:opacity-60"
            >
              Inventory
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 container-page py-10">{children}</main>
    </div>
  )
}
