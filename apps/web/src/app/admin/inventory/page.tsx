import type { Metadata } from 'next'
import { InventoryClient, type FrameRow } from './InventoryClient'

export const metadata: Metadata = { title: 'Inventory — Workshop Admin — Ramovani' }
export const dynamic = 'force-dynamic'

async function fetchFrames(): Promise<FrameRow[]> {
  const apiUrl = process.env['NEXT_PUBLIC_CATALOG_API_URL'] ?? 'http://localhost:8002'
  try {
    const res = await fetch(`${apiUrl}/frames?admin=true&pageSize=200`, { cache: 'no-store' })
    if (!res.ok) throw new Error(`API ${res.status}`)
    const data = await res.json() as { items: FrameRow[] }
    return data.items
  } catch (err) {
    console.error('[admin/inventory] Failed to fetch frames:', err)
    return []
  }
}

export default async function InventoryPage() {
  const frames = await fetchFrames()
  return <InventoryClient initialFrames={frames} />
}
