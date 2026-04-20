import Link from 'next/link'

export function Header() {
  return (
    <header className="border-b border-canvas-muted bg-canvas">
      <div className="container-page flex h-16 items-center justify-between">
        <Link href="/" className="font-serif text-2xl font-light text-ink">
          Ramovani
        </Link>
        <nav className="flex items-center gap-8">
          <Link
            href="/configure"
            className="font-mono text-2xs uppercase tracking-[0.15em] text-ink-secondary transition-colors hover:text-ink"
          >
            Configure
          </Link>
        </nav>
      </div>
    </header>
  )
}
