'use client'

import { useStore, selectors } from '@/store'
import { formatPrice, formatMm } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

export function PriceSummary() {
  const selectedFrame = useStore(selectors.selectedFrame)
  const selectedPassepartout = useStore(selectors.selectedPassepartout)
  const includeGlass = useStore(selectors.includeGlass)
  const toggleGlass = useStore((s) => s.toggleGlass)
  const priceQuote = useStore(selectors.priceQuote)
  const quoteStatus = useStore(selectors.quoteStatus)
  const confirmedOrder = useStore(selectors.confirmedOrder)
  const confirmOrder = useStore((s) => s.confirmOrder)
  const canConfirmOrder = useStore(selectors.canConfirmOrder)
  const artworkDimensions = useStore(selectors.artworkDimensions)

  return (
    <aside className="flex flex-col gap-6 border border-canvas-muted bg-canvas p-6">
      <h2 className="font-mono text-2xs uppercase tracking-[0.15em] text-ink-tertiary">
        Order summary
      </h2>

      {/* Artwork */}
      {artworkDimensions && (
        <div className="space-y-1">
          <p className="font-mono text-2xs uppercase tracking-[0.1em] text-ink-placeholder">Artwork</p>
          <p className="font-sans text-sm text-ink">
            {formatMm(artworkDimensions.widthMm)} &times; {formatMm(artworkDimensions.heightMm)}
          </p>
        </div>
      )}

      {/* Frame */}
      <div className="space-y-1">
        <p className="font-mono text-2xs uppercase tracking-[0.1em] text-ink-placeholder">Frame</p>
        <p className="font-sans text-sm text-ink">
          {selectedFrame?.name ?? <span className="text-ink-tertiary">Not selected</span>}
        </p>
      </div>

      {/* Passepartout */}
      <div className="space-y-1">
        <p className="font-mono text-2xs uppercase tracking-[0.1em] text-ink-placeholder">Mat</p>
        <p className="font-sans text-sm text-ink">
          {selectedPassepartout?.colorName ?? <span className="text-ink-tertiary">None</span>}
        </p>
      </div>

      {/* Glass toggle */}
      <div className="flex items-center justify-between border-t border-canvas-muted pt-4">
        <span className="font-sans text-sm text-ink">Anti-reflective glass</span>
        <button
          type="button"
          role="switch"
          aria-checked={includeGlass}
          onClick={toggleGlass}
          className={[
            'relative h-6 w-11 rounded-full transition-colors duration-200',
            includeGlass ? 'bg-ink' : 'bg-canvas-muted',
          ].join(' ')}
        >
          <span
            className={[
              'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-canvas transition-transform duration-200',
              includeGlass ? 'translate-x-5' : 'translate-x-0',
            ].join(' ')}
          />
        </button>
      </div>

      {/* Price */}
      <div className="border-t border-canvas-muted pt-4">
        {quoteStatus === 'fetching' ? (
          <div className="flex items-center gap-2 text-ink-tertiary">
            <Spinner size="sm" /> Calculating…
          </div>
        ) : priceQuote ? (
          <div className="space-y-2">
            {priceQuote.lineItems.map((item) => (
              <div key={item.description} className="flex justify-between text-sm">
                <span className="text-ink-secondary">{item.description}</span>
                <span className="font-mono text-ink">
                  {formatPrice(item.totalPrice, item.currency)}
                </span>
              </div>
            ))}
            <div className="divider" />
            <div className="flex justify-between">
              <span className="font-sans text-base font-medium text-ink">Total</span>
              <span className="font-mono text-base font-medium text-ink">
                {formatPrice(priceQuote.total, priceQuote.currency)}
              </span>
            </div>
          </div>
        ) : (
          <p className="font-sans text-sm text-ink-tertiary">
            {quoteStatus === 'stale'
              ? 'Selection changed — recalculate to update price.'
              : 'Complete your selection to see pricing.'}
          </p>
        )}
      </div>

      <Button
        disabled={!canConfirmOrder || !!confirmedOrder}
        className="w-full"
        size="lg"
        onClick={confirmOrder}
      >
        {confirmedOrder ? 'Order confirmed' : 'Confirm & order'}
      </Button>
    </aside>
  )
}
