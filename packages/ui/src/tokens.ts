/**
 * Design tokens — mirrors tailwind.config.ts values as JS constants.
 * Use these in any context that can't consume Tailwind classes (e.g. Three.js materials).
 */

export const colors = {
  canvas: { DEFAULT: '#F8F6F2', subtle: '#F0EDE7', muted: '#E8E4DC' },
  ink: {
    DEFAULT: '#1A1714',
    secondary: '#4A4540',
    tertiary: '#8A8480',
    placeholder: '#B8B4B0',
  },
  gold: { DEFAULT: '#B8975A', light: '#CDB17A', dark: '#9A7B40', muted: '#F0E8D8' },
  success: '#3D7A5E',
  warning: '#B8813A',
  error: '#B83A3A',
} as const

export const spacing = {
  px: '1px',
  0: '0',
  1: '0.25rem',
  2: '0.5rem',
  4: '1rem',
  6: '1.5rem',
  8: '2rem',
  10: '2.5rem',
  16: '4rem',
} as const
