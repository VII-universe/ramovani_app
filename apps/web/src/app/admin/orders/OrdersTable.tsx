'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { formatPrice } from '@/lib/utils'
import { generateWorksheetPdf } from '@/lib/worksheetPdf'

export type OrderStatus = 'PENDING' | 'PAID' | 'IN_PRODUCTION' | 'SHIPPED' | 'CANCELLED'

export interface AdminOrder {
  id: string
  status: OrderStatus
  createdAt: string
  customerEmail: string
  totalPrice: number
  currency: string
  artworkWidthMm: number | null
  artworkHeightMm: number | null
  frameProfileName: string | null
  passepartoutProfileName: string | null
  passepartoutOverlapMm: number | null
  includeGlass: boolean
  configSnapshot?: Record<string, unknown>
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING:       'Pending',
  PAID:          'Paid',
  IN_PRODUCTION: 'In production',
  SHIPPED:       'Shipped',
  CANCELLED:     'Cancelled',
}

const STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING:       'bg-amber-50   text-amber-700  border-amber-200',
  PAID:          'bg-blue-50    text-blue-700   border-blue-200',
  IN_PRODUCTION: 'bg-violet-50  text-violet-700 border-violet-200',
  SHIPPED:       'bg-emerald-50 text-emerald-700 border-emerald-200',
  CANCELLED:     'bg-canvas-subtle text-ink-placeholder border-canvas-muted',
}

// Status transitions available from each state
const NEXT_STATUSES: Partial<Record<OrderStatus, OrderStatus[]>> = {
  PENDING:       ['PAID', 'CANCELLED'],
  PAID:          ['IN_PRODUCTION', 'CANCELLED'],
  IN_PRODUCTION: ['SHIPPED'],
}

const API_URL = process.env.NEXT_PUBLIC_CATALOG_API_URL ?? 'http://localhost:8002'

function shorten(id: string) {
  return id.slice(0, 8).toUpperCase()
}

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('cs-CZ', {
    day:    '2-digit',
    month:  '2-digit',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

function fmtMm(mm: number | null) {
  if (mm == null) return '—'
  return `${Math.round(mm)} mm`
}

interface RowProps {
  order: AdminOrder
  onUpdated: (id: string, status: OrderStatus) => void
}

function OrderRow({ order, onUpdated }: RowProps) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const nextStatuses = NEXT_STATUSES[order.status] ?? []

  const handleStatusChange = (newStatus: OrderStatus) => {
    setError(null)
    startTransition(async () => {
      const res = await fetch(`${API_URL}/orders/${order.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        setError('Update failed')
        return
      }
      onUpdated(order.id, newStatus)
    })
  }

  return (
    <tr className={[
      'border-t border-canvas-muted transition-colors',
      pending ? 'opacity-50' : 'hover:bg-canvas',
    ].join(' ')}>
      {/* ID */}
      <td className="py-3 pl-6 pr-4 align-top">
        <span
          className="font-mono text-xs text-ink cursor-default"
          title={order.id}
        >
          {shorten(order.id)}
        </span>
      </td>

      {/* Date */}
      <td className="py-3 pr-4 align-top font-mono text-xs text-ink-secondary whitespace-nowrap">
        {fmtDate(order.createdAt)}
      </td>

      {/* Customer */}
      <td className="py-3 pr-4 align-top font-sans text-sm text-ink-secondary max-w-[180px] truncate">
        {order.customerEmail}
      </td>

      {/* Status badge + controls */}
      <td className="py-3 pr-4 align-top">
        <div className="flex flex-col gap-1.5">
          <span className={[
            'inline-block rounded border px-2 py-0.5 font-mono text-2xs uppercase tracking-[0.1em]',
            STATUS_COLORS[order.status],
          ].join(' ')}>
            {STATUS_LABELS[order.status]}
          </span>
          {nextStatuses.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {nextStatuses.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={pending}
                  onClick={() => handleStatusChange(s)}
                  className="rounded border border-canvas-muted bg-canvas px-2 py-0.5 font-mono text-2xs uppercase tracking-[0.08em] text-ink-secondary transition-colors hover:border-ink hover:text-ink disabled:opacity-40"
                >
                  → {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          )}
          {error && <p className="font-mono text-2xs text-error">{error}</p>}
        </div>
      </td>

      {/* Print Sheet */}
      <td className="py-3 pr-4 align-top">
        {(order.status === 'PAID' || order.status === 'IN_PRODUCTION') && (
          <button
            type="button"
            onClick={() => generateWorksheetPdf({
              id:            order.id,
              customerEmail: order.customerEmail,
              createdAt:     order.createdAt,
              totalPrice:    order.totalPrice,
              currency:      order.currency,
              ...(order.configSnapshot          && { configSnapshot:          order.configSnapshot }),
              ...(order.artworkWidthMm   != null && { artworkWidthMm:          order.artworkWidthMm }),
              ...(order.artworkHeightMm  != null && { artworkHeightMm:         order.artworkHeightMm }),
              ...(order.frameProfileName         && { frameProfileName:        order.frameProfileName }),
              ...(order.passepartoutProfileName  && { passepartoutProfileName: order.passepartoutProfileName }),
              ...(order.passepartoutOverlapMm != null && { passepartoutOverlapMm: order.passepartoutOverlapMm }),
              includeGlass: order.includeGlass,
            })}
            className="rounded border border-canvas-muted bg-canvas px-2 py-1 font-mono text-2xs uppercase tracking-[0.08em] text-ink-secondary transition-colors hover:border-ink hover:text-ink"
          >
            Print sheet
          </button>
        )}
      </td>

      {/* Production specs */}
      <td className="py-3 pr-4 align-top">
        <div className="space-y-0.5">
          <p className="font-sans text-sm text-ink">
            {fmtMm(order.artworkWidthMm)} × {fmtMm(order.artworkHeightMm)}
          </p>
          <p className="font-mono text-2xs text-ink-secondary">
            {order.frameProfileName ?? '—'}
          </p>
          {order.passepartoutProfileName && (
            <p className="font-mono text-2xs text-ink-placeholder">
              Mat: {order.passepartoutProfileName}
              {order.passepartoutOverlapMm != null && ` (${order.passepartoutOverlapMm} mm)`}
            </p>
          )}
          {order.includeGlass && (
            <p className="font-mono text-2xs text-ink-placeholder">Glass ✓</p>
          )}
        </div>
      </td>

      {/* Price */}
      <td className="py-3 align-top text-right font-mono text-sm font-medium text-ink whitespace-nowrap">
        {formatPrice(order.totalPrice, order.currency)}
      </td>
    </tr>
  )
}

interface Props {
  initialOrders: AdminOrder[]
}

export function OrdersTable({ initialOrders }: Props) {
  const router = useRouter()
  const [orders, setOrders] = useState<AdminOrder[]>(initialOrders)

  const handleUpdated = (id: string, newStatus: OrderStatus) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: newStatus } : o)),
    )
    // Revalidate server data in background
    router.refresh()
  }

  if (orders.length === 0) {
    return (
      <div className="rounded border border-canvas-muted bg-canvas py-16 text-center">
        <p className="font-sans text-sm text-ink-tertiary">No orders yet.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded border border-canvas-muted bg-canvas">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-canvas-muted bg-canvas-subtle">
            <th className="py-3 pl-6 pr-4 font-mono text-2xs uppercase tracking-[0.12em] text-ink-tertiary">
              Order
            </th>
            <th className="py-3 pr-4 font-mono text-2xs uppercase tracking-[0.12em] text-ink-tertiary">
              Date
            </th>
            <th className="py-3 pr-4 font-mono text-2xs uppercase tracking-[0.12em] text-ink-tertiary">
              Customer
            </th>
            <th className="py-3 pr-4 font-mono text-2xs uppercase tracking-[0.12em] text-ink-tertiary">
              Status
            </th>
            <th className="py-3 pr-4 font-mono text-2xs uppercase tracking-[0.12em] text-ink-tertiary">
              Print
            </th>
            <th className="py-3 pr-4 font-mono text-2xs uppercase tracking-[0.12em] text-ink-tertiary">
              Production specs
            </th>
            <th className="py-3 pr-6 text-right font-mono text-2xs uppercase tracking-[0.12em] text-ink-tertiary">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <OrderRow
              key={order.id}
              order={order}
              onUpdated={handleUpdated}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
