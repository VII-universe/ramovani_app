'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import * as Dialog from '@radix-ui/react-dialog'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface FrameRow {
  id:             string
  name:           string
  slug:           string
  material:       string
  finish:         string
  profileWidthMm: number
  totalDepthMm:   number
  rabbetDepthMm:  number
  rabbetWidthMm:  number
  pricePerMeter:  number
  currency:       string
  inStock:        boolean
  isActive:       boolean
  thumbnailUrl:   string
  textureUrl:     string
  pbr:            { colorHex: string; roughness: number; metalness: number }
  imageUrls:      string[]
  createdAt:      string
}

type FormData = {
  name:           string
  slug:           string
  material:       'wood' | 'metal' | 'composite'
  finish:         'matte' | 'gloss' | 'satin' | 'brushed' | 'natural' | 'lacquered'
  profileWidthMm: string
  totalDepthMm:   string
  rabbetDepthMm:  string
  rabbetWidthMm:  string
  pricePerMeter:  string
  currency:       string
  inStock:        boolean
  isActive:       boolean
  thumbnailUrl:   string
  textureUrl:     string
  colorHex:       string
  roughness:      string
  metalness:      string
}

const EMPTY_FORM: FormData = {
  name: '', slug: '', material: 'wood', finish: 'natural',
  profileWidthMm: '', totalDepthMm: '', rabbetDepthMm: '', rabbetWidthMm: '',
  pricePerMeter: '', currency: 'CZK',
  inStock: true, isActive: true,
  thumbnailUrl: '', textureUrl: '',
  colorHex: '#C8A97A', roughness: '0.7', metalness: '0.0',
}

const API = process.env.NEXT_PUBLIC_CATALOG_API_URL ?? 'http://localhost:8002'

const MATERIAL_LABELS: Record<string, string> = { wood: 'Wood', metal: 'Metal', composite: 'Composite' }
const FINISH_LABELS: Record<string, string>   = { matte: 'Matte', gloss: 'Gloss', satin: 'Satin', brushed: 'Brushed', natural: 'Natural', lacquered: 'Lacquered' }

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// ── Main component ─────────────────────────────────────────────────────────────

export function InventoryClient({ initialFrames }: { initialFrames: FrameRow[] }) {
  const router      = useRouter()
  const [frames, setFrames]     = useState<FrameRow[]>(initialFrames)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]   = useState<FrameRow | null>(null)   // null = new frame
  const [form, setForm]         = useState<FormData>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, startSave]     = useTransition()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, startDelete] = useTransition()
  const [toggling, startToggle] = useTransition()

  const active   = frames.filter(f => f.isActive).length
  const inactive = frames.filter(f => !f.isActive).length
  const outStock = frames.filter(f => !f.inStock).length

  // ── Open modal ───────────────────────────────────────────────────────────────
  function openNew() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setModalOpen(true)
  }

  function openEdit(frame: FrameRow) {
    setEditing(frame)
    const pbr = frame.pbr ?? { colorHex: '#C8A97A', roughness: 0.7, metalness: 0 }
    setForm({
      name:           frame.name,
      slug:           frame.slug,
      material:       frame.material as FormData['material'],
      finish:         frame.finish   as FormData['finish'],
      profileWidthMm: String(frame.profileWidthMm),
      totalDepthMm:   String(frame.totalDepthMm),
      rabbetDepthMm:  String(frame.rabbetDepthMm),
      rabbetWidthMm:  String(frame.rabbetWidthMm),
      pricePerMeter:  String(frame.pricePerMeter),
      currency:       frame.currency,
      inStock:        frame.inStock,
      isActive:       frame.isActive,
      thumbnailUrl:   frame.thumbnailUrl ?? '',
      textureUrl:     frame.textureUrl   ?? '',
      colorHex:       pbr.colorHex,
      roughness:      String(pbr.roughness),
      metalness:      String(pbr.metalness),
    })
    setFormError(null)
    setModalOpen(true)
  }

  // ── Form field helpers ───────────────────────────────────────────────────────
  function field(key: keyof FormData) {
    return {
      value: form[key] as string,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setForm(prev => ({ ...prev, [key]: e.target.value })),
    }
  }
  function check(key: 'inStock' | 'isActive') {
    return {
      checked: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm(prev => ({ ...prev, [key]: e.target.checked })),
    }
  }

  // ── Save (create or update) ──────────────────────────────────────────────────
  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    startSave(async () => {
      const body = {
        name:           form.name,
        slug:           form.slug,
        material:       form.material,
        finish:         form.finish,
        profileWidthMm: Number(form.profileWidthMm),
        totalDepthMm:   Number(form.totalDepthMm),
        rabbetDepthMm:  Number(form.rabbetDepthMm),
        rabbetWidthMm:  Number(form.rabbetWidthMm),
        pricePerMeter:  Number(form.pricePerMeter),
        currency:       form.currency,
        inStock:        form.inStock,
        isActive:       form.isActive,
        thumbnailUrl:   form.thumbnailUrl,
        textureUrl:     form.textureUrl,
        pbr: {
          colorHex:  form.colorHex,
          roughness: Number(form.roughness),
          metalness: Number(form.metalness),
        },
        imageUrls: [],
      }

      const url    = editing ? `${API}/frames/${editing.id}` : `${API}/frames`
      const method = editing ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { message?: string }
        setFormError(data.message ?? 'Save failed')
        return
      }

      const saved = await res.json() as FrameRow
      setFrames(prev =>
        editing
          ? prev.map(f => f.id === saved.id ? saved : f)
          : [saved, ...prev],
      )
      setModalOpen(false)
      router.refresh()
    })
  }

  // ── Toggle isActive ──────────────────────────────────────────────────────────
  function handleToggleActive(frame: FrameRow) {
    startToggle(async () => {
      const res = await fetch(`${API}/frames/${frame.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ isActive: !frame.isActive }),
      })
      if (!res.ok) return
      const updated = await res.json() as FrameRow
      setFrames(prev => prev.map(f => f.id === updated.id ? updated : f))
    })
  }

  // ── Delete ───────────────────────────────────────────────────────────────────
  function handleDelete(id: string) {
    setDeleteId(id)
    startDelete(async () => {
      const res = await fetch(`${API}/frames/${id}`, { method: 'DELETE' })
      if (res.ok || res.status === 204) {
        setFrames(prev => prev.filter(f => f.id !== id))
        router.refresh()
      }
      setDeleteId(null)
    })
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">

      {/* Page header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="font-mono text-2xs uppercase tracking-[0.2em] text-ink-tertiary">Workshop Admin</p>
          <h1 className="mt-2 font-serif text-3xl font-light text-ink">Frame Inventory</h1>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="rounded border border-ink bg-ink px-4 py-2 font-mono text-2xs uppercase tracking-[0.12em] text-canvas transition-opacity hover:opacity-70"
        >
          + Add Frame
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-4">
        {[
          ['Total', frames.length],
          ['Active', active],
          ['Hidden', inactive],
          ['Out of stock', outStock],
        ].map(([label, count]) => (
          <div key={label} className="rounded border border-canvas-muted bg-canvas p-4">
            <p className="font-mono text-2xs uppercase tracking-[0.1em] text-ink-tertiary">{label}</p>
            <p className="mt-1 font-serif text-2xl font-light text-ink">{count}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded border border-canvas-muted bg-canvas">
        {frames.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-sans text-sm text-ink-tertiary">No frames yet — add one above.</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-canvas-muted bg-canvas-subtle">
                {['Frame', 'SKU', 'Material', 'Width mm', 'Price / m', 'Active', 'Stock', 'Actions'].map(h => (
                  <th key={h} className="py-3 pl-4 pr-3 font-mono text-2xs uppercase tracking-[0.12em] text-ink-tertiary whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {frames.map(frame => (
                <tr
                  key={frame.id}
                  className={[
                    'border-t border-canvas-muted transition-colors hover:bg-canvas-subtle',
                    !frame.isActive ? 'opacity-50' : '',
                  ].join(' ')}
                >
                  {/* Name + color swatch */}
                  <td className="py-3 pl-4 pr-3 align-middle">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-4 w-4 flex-shrink-0 rounded-full border border-canvas-muted"
                        style={{ backgroundColor: (frame.pbr as { colorHex?: string })?.colorHex ?? '#aaa' }}
                      />
                      <span className="font-sans text-sm font-medium text-ink">{frame.name}</span>
                    </div>
                  </td>
                  {/* SKU */}
                  <td className="py-3 pr-3 align-middle font-mono text-xs text-ink-secondary">{frame.slug}</td>
                  {/* Material */}
                  <td className="py-3 pr-3 align-middle font-sans text-sm text-ink-secondary whitespace-nowrap">
                    {MATERIAL_LABELS[frame.material] ?? frame.material}
                    <span className="ml-1 text-ink-placeholder">/ {FINISH_LABELS[frame.finish] ?? frame.finish}</span>
                  </td>
                  {/* Width */}
                  <td className="py-3 pr-3 align-middle font-mono text-sm text-ink">{frame.profileWidthMm}</td>
                  {/* Price */}
                  <td className="py-3 pr-3 align-middle font-mono text-sm text-ink whitespace-nowrap">
                    {frame.pricePerMeter.toFixed(0)} {frame.currency}
                  </td>
                  {/* isActive badge */}
                  <td className="py-3 pr-3 align-middle">
                    <span className={[
                      'inline-block rounded border px-2 py-0.5 font-mono text-2xs uppercase tracking-[0.08em]',
                      frame.isActive
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-canvas-muted bg-canvas-subtle text-ink-placeholder',
                    ].join(' ')}>
                      {frame.isActive ? 'Visible' : 'Hidden'}
                    </span>
                  </td>
                  {/* inStock badge */}
                  <td className="py-3 pr-3 align-middle">
                    <span className={[
                      'inline-block rounded border px-2 py-0.5 font-mono text-2xs uppercase tracking-[0.08em]',
                      frame.inStock
                        ? 'border-blue-200 bg-blue-50 text-blue-700'
                        : 'border-amber-200 bg-amber-50 text-amber-700',
                    ].join(' ')}>
                      {frame.inStock ? 'In stock' : 'Out of stock'}
                    </span>
                  </td>
                  {/* Actions */}
                  <td className="py-3 pl-3 pr-4 align-middle">
                    <div className="flex items-center gap-2">
                      {/* Edit */}
                      <button
                        type="button"
                        onClick={() => openEdit(frame)}
                        className="rounded border border-canvas-muted px-2 py-1 font-mono text-2xs uppercase tracking-[0.08em] text-ink-secondary transition-colors hover:border-ink hover:text-ink"
                      >
                        Edit
                      </button>
                      {/* Toggle active */}
                      <button
                        type="button"
                        disabled={toggling}
                        onClick={() => handleToggleActive(frame)}
                        className="rounded border border-canvas-muted px-2 py-1 font-mono text-2xs uppercase tracking-[0.08em] text-ink-secondary transition-colors hover:border-ink hover:text-ink disabled:opacity-40"
                      >
                        {frame.isActive ? 'Hide' : 'Show'}
                      </button>
                      {/* Delete */}
                      <button
                        type="button"
                        disabled={deleting && deleteId === frame.id}
                        onClick={() => handleDelete(frame.id)}
                        className="rounded border border-canvas-muted px-2 py-1 font-mono text-2xs uppercase tracking-[0.08em] text-error transition-colors hover:border-error disabled:opacity-40"
                      >
                        {deleting && deleteId === frame.id ? '…' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Add / Edit modal ── */}
      <Dialog.Root open={modalOpen} onOpenChange={setModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
          <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col overflow-y-auto bg-canvas shadow-2xl">

            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-canvas-muted px-6 py-4">
              <Dialog.Title className="font-serif text-xl font-light text-ink">
                {editing ? 'Edit Frame' : 'Add New Frame'}
              </Dialog.Title>
              <Dialog.Close className="text-ink-tertiary transition-opacity hover:opacity-60">
                <span className="font-mono text-lg leading-none">✕</span>
              </Dialog.Close>
            </div>

            {/* Form */}
            <form onSubmit={handleSave} className="flex flex-1 flex-col gap-0">
              <div className="flex-1 space-y-6 px-6 py-6">

                {/* ── Basic info ── */}
                <Section title="Basic information">
                  <Field label="Name *">
                    <input
                      className={inputCls}
                      required
                      placeholder="e.g. Oslo Oak Natural"
                      {...field('name')}
                      onChange={e => {
                        const name = e.target.value
                        setForm(prev => ({
                          ...prev,
                          name,
                          // Auto-generate slug only when creating a new frame
                          ...(!editing && { slug: slugify(name) }),
                        }))
                      }}
                    />
                  </Field>
                  <Field label="SKU / Slug *" hint="Lowercase, hyphens only">
                    <input className={inputCls} required pattern="[a-z0-9-]+" {...field('slug')} />
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Material *">
                      <select className={inputCls} {...field('material')}>
                        <option value="wood">Wood</option>
                        <option value="metal">Metal</option>
                        <option value="composite">Composite</option>
                      </select>
                    </Field>
                    <Field label="Finish *">
                      <select className={inputCls} {...field('finish')}>
                        <option value="natural">Natural</option>
                        <option value="matte">Matte</option>
                        <option value="gloss">Gloss</option>
                        <option value="satin">Satin</option>
                        <option value="brushed">Brushed</option>
                        <option value="lacquered">Lacquered</option>
                      </select>
                    </Field>
                  </div>
                </Section>

                {/* ── Dimensions ── */}
                <Section title="Physical dimensions (mm)">
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Profile width *" hint="Visible moulding face">
                      <input className={inputCls} type="number" required min="1" step="0.1" {...field('profileWidthMm')} />
                    </Field>
                    <Field label="Total depth *">
                      <input className={inputCls} type="number" required min="1" step="0.1" {...field('totalDepthMm')} />
                    </Field>
                    <Field label="Rabbet depth *" hint="Holds artwork stack">
                      <input className={inputCls} type="number" required min="1" step="0.1" {...field('rabbetDepthMm')} />
                    </Field>
                    <Field label="Rabbet width *" hint="Lip over artwork">
                      <input className={inputCls} type="number" required min="1" step="0.1" {...field('rabbetWidthMm')} />
                    </Field>
                  </div>
                </Section>

                {/* ── Commerce ── */}
                <Section title="Commerce">
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Price per metre *">
                      <input className={inputCls} type="number" required min="1" step="1" {...field('pricePerMeter')} />
                    </Field>
                    <Field label="Currency">
                      <input className={inputCls} maxLength={3} {...field('currency')} />
                    </Field>
                  </div>
                  <div className="flex gap-6">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input type="checkbox" className="h-4 w-4 accent-ink" {...check('isActive')} />
                      <span className="font-sans text-sm text-ink">Visible in configurator</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input type="checkbox" className="h-4 w-4 accent-ink" {...check('inStock')} />
                      <span className="font-sans text-sm text-ink">In stock</span>
                    </label>
                  </div>
                </Section>

                {/* ── 3D appearance ── */}
                <Section title="3D appearance (PBR)">
                  <div className="grid grid-cols-3 gap-4">
                    <Field label="Colour">
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          className="h-9 w-12 cursor-pointer rounded border border-canvas-muted bg-canvas p-0.5"
                          {...field('colorHex')}
                        />
                        <input className={inputCls} maxLength={7} {...field('colorHex')} />
                      </div>
                    </Field>
                    <Field label="Roughness" hint="0 – 1">
                      <input className={inputCls} type="number" min="0" max="1" step="0.01" {...field('roughness')} />
                    </Field>
                    <Field label="Metalness" hint="0 – 1">
                      <input className={inputCls} type="number" min="0" max="1" step="0.01" {...field('metalness')} />
                    </Field>
                  </div>
                  <Field label="Thumbnail URL" hint="Optional preview image">
                    <input className={inputCls} type="url" placeholder="https://…" {...field('thumbnailUrl')} />
                  </Field>
                  <Field label="Texture URL" hint="Optional PBR texture for 3D scene">
                    <input className={inputCls} type="url" placeholder="https://…" {...field('textureUrl')} />
                  </Field>
                </Section>

              </div>

              {/* Sticky footer */}
              <div className="sticky bottom-0 border-t border-canvas-muted bg-canvas px-6 py-4">
                {formError && (
                  <p className="mb-3 font-sans text-sm text-error">{formError}</p>
                )}
                <div className="flex items-center justify-end gap-3">
                  <Dialog.Close asChild>
                    <button type="button" className="rounded border border-canvas-muted px-4 py-2 font-mono text-2xs uppercase tracking-[0.1em] text-ink-secondary transition-colors hover:border-ink hover:text-ink">
                      Cancel
                    </button>
                  </Dialog.Close>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded border border-ink bg-ink px-4 py-2 font-mono text-2xs uppercase tracking-[0.1em] text-canvas transition-opacity hover:opacity-70 disabled:opacity-40"
                  >
                    {saving ? 'Saving…' : editing ? 'Save changes' : 'Create frame'}
                  </button>
                </div>
              </div>
            </form>

          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

    </div>
  )
}

// ── Small layout helpers ───────────────────────────────────────────────────────

const inputCls = 'w-full rounded border border-canvas-muted bg-canvas px-3 py-2 font-sans text-sm text-ink placeholder:text-ink-placeholder focus:border-ink focus:outline-none'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="font-mono text-2xs uppercase tracking-[0.15em] text-ink-tertiary">{title}</p>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="flex items-baseline gap-2">
        <span className="font-sans text-sm text-ink-secondary">{label}</span>
        {hint && <span className="font-mono text-2xs text-ink-placeholder">{hint}</span>}
      </label>
      {children}
    </div>
  )
}
