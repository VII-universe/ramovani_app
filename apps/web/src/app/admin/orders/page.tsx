import type { Metadata } from 'next'
import { OrdersTable, type AdminOrder } from './OrdersTable'

export const metadata: Metadata = { title: 'Orders — Workshop Admin — Ramovani' }

// Always fetch fresh data — this is an operations dashboard, not a public page
export const dynamic = 'force-dynamic'

async function fetchOrders(): Promise<AdminOrder[]> {
  // Use the internal URL on the server (no CORS, no browser restriction)
  const apiUrl = process.env['NEXT_PUBLIC_CATALOG_API_URL'] ?? 'http://localhost:8002'

  try {
    const res = await fetch(`${apiUrl}/orders`, {
      // next.js cache: 0 = always revalidate
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(`API ${res.status}`)
    return res.json() as Promise<AdminOrder[]>
  } catch (err) {
    console.error('[admin/orders] Failed to fetch orders:', err)
    return []
  }
}

export default async function AdminOrdersPage() {
  const orders = await fetchOrders()

  const totalRevenue = orders
    .filter((o) => o.status !== 'CANCELLED')
    .reduce((sum, o) => sum + o.totalPrice, 0)

  const countByStatus = orders.reduce<Partial<Record<string, number>>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="font-mono text-2xs uppercase tracking-[0.2em] text-ink-tertiary">
            Workshop Admin
          </p>
          <h1 className="mt-2 font-serif text-3xl font-light text-ink">Orders</h1>
        </div>
        <p className="font-mono text-xs text-ink-placeholder">
          {orders.length} order{orders.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* KPI strip */}
      {orders.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {(
            [
              ['PENDING', 'Pending'],
              ['PAID', 'Paid'],
              ['IN_PRODUCTION', 'In production'],
              ['SHIPPED', 'Shipped'],
              ['CANCELLED', 'Cancelled'],
            ] as const
          ).map(([status, label]) => (
            <div
              key={status}
              className="rounded border border-canvas-muted bg-canvas p-4"
            >
              <p className="font-mono text-2xs uppercase tracking-[0.1em] text-ink-tertiary">
                {label}
              </p>
              <p className="mt-1 font-serif text-2xl font-light text-ink">
                {countByStatus[status] ?? 0}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Revenue line */}
      {orders.length > 0 && (
        <div className="flex items-center justify-between border-t border-canvas-muted pt-4">
          <span className="font-mono text-xs uppercase tracking-[0.12em] text-ink-tertiary">
            Total revenue (excl. cancelled)
          </span>
          <span className="font-mono text-sm font-medium text-ink">
            {new Intl.NumberFormat('cs-CZ', {
              style: 'currency',
              currency: 'CZK',
              minimumFractionDigits: 2,
            }).format(totalRevenue)}
          </span>
        </div>
      )}

      {/* Orders table */}
      <OrdersTable initialOrders={orders} />
    </div>
  )
}
