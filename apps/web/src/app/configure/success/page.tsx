'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Spinner } from '@/components/ui/spinner'

type ConfirmState = 'checking' | 'paid' | 'pending' | 'error'

const API_URL = process.env.NEXT_PUBLIC_CATALOG_API_URL ?? 'http://localhost:8002'

function SuccessContent() {
  const params     = useSearchParams()
  const orderId    = params.get('orderId')
  const fromStripe = params.get('payment') === 'success'

  const [state, setState] = useState<ConfirmState>(fromStripe ? 'checking' : 'pending')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!fromStripe || !orderId) {
      setState('pending')
      return
    }

    let cancelled = false

    async function confirm() {
      try {
        const res = await fetch(`${API_URL}/checkout/success?orderId=${orderId}`)
        if (cancelled) return

        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as { message?: string }
          throw new Error(body.message ?? `HTTP ${res.status}`)
        }

        const data = await res.json() as { status: string }
        if (cancelled) return
        setState(data.status === 'PAID' ? 'paid' : 'pending')
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Could not confirm payment')
        setState('error')
      }
    }

    confirm()
    return () => { cancelled = true }
  }, [orderId, fromStripe])

  return (
    <div className="mx-auto max-w-lg text-center">
      {/* Icon */}
      <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-full border border-canvas-muted">
        {state === 'checking' ? (
          <Spinner size="lg" />
        ) : (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-8 w-8 text-ink"
            aria-hidden="true"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>

      <p className="font-mono text-2xs uppercase tracking-[0.2em] text-ink-tertiary">
        {state === 'checking' ? 'Confirming payment'  :
         state === 'paid'     ? 'Payment confirmed'   :
                                'Order received'}
      </p>

      <h1 className="mt-4 font-serif text-4xl font-light text-ink">
        {state === 'checking' ? 'Verifying your payment...' :
         state === 'paid'     ? 'Thank you for your payment' :
                                'Your frame is on its way'}
      </h1>

      <p className="mt-4 font-sans text-base text-ink-secondary">
        {state === 'checking'
          ? 'Please wait while we confirm your payment with Stripe.'
          : state === 'paid'
          ? 'Your payment was processed successfully. Our workshop will start cutting your frame shortly. An email confirmation will follow once production begins.'
          : 'We have received your order and our workshop will start cutting shortly. An email confirmation will follow once production begins.'}
      </p>

      {state === 'error' && error && (
        <p className="mt-3 font-mono text-xs text-ink-placeholder">
          (Payment check: {error})
        </p>
      )}

      {orderId && state !== 'checking' && (
        <div className="mt-8 rounded border border-canvas-muted bg-canvas-subtle px-6 py-4">
          <p className="font-mono text-2xs uppercase tracking-[0.12em] text-ink-tertiary">
            Order ID
          </p>
          <p className="mt-1 break-all font-mono text-sm text-ink">{orderId}</p>
        </div>
      )}

      {state !== 'checking' && (
        <div className="mt-12 flex flex-col items-center gap-4">
          <Link
            href="/"
            className="border border-ink px-8 py-3 font-mono text-xs uppercase tracking-[0.15em] text-ink transition-opacity hover:opacity-60"
          >
            Back to home
          </Link>
          <Link
            href="/configure/upload"
            className="font-mono text-xs uppercase tracking-[0.12em] text-ink-tertiary transition-opacity hover:opacity-60"
          >
            Frame another artwork
          </Link>
        </div>
      )}
    </div>
  )
}

export default function SuccessPage() {
  return (
    <div className="container-page py-24">
      <Suspense
        fallback={
          <div className="mx-auto flex max-w-lg items-center justify-center py-24">
            <Spinner size="lg" />
          </div>
        }
      >
        <SuccessContent />
      </Suspense>
    </div>
  )
}
