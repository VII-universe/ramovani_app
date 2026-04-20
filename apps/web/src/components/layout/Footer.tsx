export function Footer() {
  return (
    <footer className="border-t border-canvas-muted bg-canvas py-10">
      <div className="container-page flex items-center justify-between">
        <span className="font-serif text-lg font-light text-ink-tertiary">Ramovani</span>
        <p className="font-mono text-2xs uppercase tracking-[0.1em] text-ink-placeholder">
          &copy; {new Date().getFullYear()} Ramovani
        </p>
      </div>
    </footer>
  )
}
