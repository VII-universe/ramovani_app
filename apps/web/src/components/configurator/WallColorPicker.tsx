'use client'

import { useStore, selectors } from '@/store'

const WALL_PRESETS = [
  { name: 'Gallery White',  hex: '#F0EDE7' },
  { name: 'Warm Beige',     hex: '#DDD0BB' },
  { name: 'Stone Grey',     hex: '#B0A99E' },
  { name: 'Sage Green',     hex: '#7A9977' },
  { name: 'Deep Charcoal',  hex: '#2E2E2E' },
  { name: 'Navy Blue',      hex: '#1C2B4A' },
] as const

export function WallColorPicker() {
  const wallColor    = useStore(selectors.wallColor)
  const setWallColor = useStore((s) => s.setWallColor)

  return (
    <div className="space-y-2">
      <p className="font-mono text-2xs uppercase tracking-[0.1em] text-ink-placeholder">
        Wall colour
      </p>
      <div className="flex flex-wrap gap-2">
        {WALL_PRESETS.map((preset) => {
          const active = wallColor === preset.hex
          return (
            <button
              key={preset.hex}
              type="button"
              title={preset.name}
              aria-label={preset.name}
              aria-pressed={active}
              onClick={() => setWallColor(preset.hex)}
              className={[
                'h-7 w-7 rounded-full border-2 transition-transform duration-150 hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-1',
                active ? 'border-ink scale-110' : 'border-canvas-muted',
              ].join(' ')}
              style={{ backgroundColor: preset.hex }}
            />
          )
        })}
      </div>
    </div>
  )
}
