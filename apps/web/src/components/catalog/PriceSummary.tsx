'use client'

import { useState } from 'react'
import { useStore, selectors } from '@/store'
import { formatPrice, formatMm } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { WallColorPicker } from '@/components/configurator/WallColorPicker'

export function PriceSummary() {
  const selectedFrame        = useStore(selectors.selectedFrame)
  const selectedPassepartout = useStore(selectors.selectedPassepartout)
  const includeGlass         = useStore(selectors.includeGlass)
  const toggleGlass          = useStore((s) => s.toggleGlass)
  const confirmedOrder       = useStore(selectors.confirmedOrder)
  const submitError          = useStore(selectors.submitError)
  const canConfirmOrder      = useStore(selectors.canConfirmOrder)
  const artworkDimensions    = useStore(selectors.artworkDimensions)
  const clientPrice          = useStore(selectors.clientPrice)
  const submitOrder          = useStore((s) => s.submitOrder)

  const [email, setEmail]           = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const canSubmit  = canConfirmOrder && emailValid && !submitting && !confirmedOrder

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setCheckoutError(null)
    try {
      // 1. Create the order in the DB (status: PENDING)
      const apiUrl = process.env.NEXT_PUBLIC_CATALOG_API_URL ?? 'http://localhost:8002'
      const orderId = await submitOrder(email)

      // 2. Create a Stripe Checkout Session for this order
      const res = await fetch(`${apiUrl}/checkout`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ orderId }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { message?: string }
        throw new Error(body.message ?? 'Failed to start payment')
      }

      const { checkoutUrl } = await res.json() as { checkoutUrl: string }

      // 3. Hand off to Stripe — full page navigation so Stripe's CSP is satisfied
      window.location.href = checkoutUrl
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : 'Something went wrong')
      setSubmitting(false)
    }
    // Note: setSubmitting(false) is intentionally omitted on the success path —
    // the button stays in "loading" state while Stripe loads in the same tab.
  }

  return (
    <aside className="flex flex-col gap-6 border border-canvas-muted bg-canvas p-6">
      <h2 className="font-mono text-2xs uppercase tracking-[0.15em] text-ink-tertiary">
        Order summary
      </h2>

      {/* Artwork */}
      {artworkDimensions && (
        <div className="space-y-1">
          <p className="font-mono text-2xs uppercase tracking-[0.1em] text-ink-placeholder">
            Artwork
          </p>
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

      {/* Wall colour */}
      <div className="border-t border-canvas-muted pt-4">
        <WallColorPicker />
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

      {/* Price breakdown */}
      <div className="border-t border-canvas-muted pt-4">
        {clientPrice ? (
          <div className="space-y-2">
            {clientPrice.isEstimate && (
              <p className="font-mono text-2xs text-ink-placeholder">
                Estimated price — upload artwork for exact dimensions
              </p>
            )}

            <p className="font-mono text-2xs text-ink-placeholder">
              {clientPrice.outerWidthMm.toFixed(0)} &times; {clientPrice.outerHeightMm.toFixed(0)} mm outer
              &ensp;·&ensp;{clientPrice.perimeterMeters.toFixed(2)} m perimeter
            </p>

            <div className="space-y-1.5 pt-1">
              {clientPrice.lineItems.map((item) => (
                <div key={item.label} className="space-y-0.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-ink-secondary">{item.label}</span>
                    <span className="font-mono text-ink">
                      {formatPrice(item.amount, item.currency)}
                    </span>
                  </div>
                  <p className="font-mono text-2xs text-ink-placeholder">
                    {item.detail}
                  </p>
                </div>
              ))}
            </div>

            <div className="space-y-1 border-t border-canvas-muted pt-2">
              <div className="flex justify-between text-sm">
                <span className="text-ink-secondary">Subtotal excl. VAT</span>
                <span className="font-mono text-ink">
                  {formatPrice(clientPrice.subtotal, clientPrice.currency)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-secondary">
                  VAT ({(clientPrice.vatRate * 100).toFixed(0)} %)
                </span>
                <span className="font-mono text-ink">
                  {formatPrice(clientPrice.vat, clientPrice.currency)}
                </span>
              </div>
            </div>

            <div className="flex justify-between border-t border-canvas-muted pt-2">
              <span className="font-sans text-base font-medium text-ink">Total</span>
              <span className="font-mono text-base font-medium text-ink">
                {formatPrice(clientPrice.total, clientPrice.currency)}
              </span>
            </div>
          </div>
        ) : (
          <p className="font-sans text-sm text-ink-tertiary">
            Select a frame to see pricing.
          </p>
        )}
      </div>

      {/* Order form */}
      <form onSubmit={handleSubmit} className="space-y-3 border-t border-canvas-muted pt-4">
        <Input
          label="Email for order confirmation"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          disabled={!!confirmedOrder || submitting}
        />

        {(submitError || checkoutError) && (
          <p className="font-sans text-sm text-error">
            {checkoutError ?? submitError}
          </p>
        )}

        <Button
          type="submit"
          disabled={!canSubmit}
          className="w-full"
          size="lg"
        >
          {submitting ? (
            <span className="flex items-center gap-3">
              <Spinner size="sm" />
              Redirecting to payment…
            </span>
          ) : (
            'Pay now →'
          )}
        </Button>
      </form>
    </aside>
  )
}
