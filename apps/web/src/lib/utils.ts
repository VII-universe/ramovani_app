import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge Tailwind class names safely — canonical shadcn/ui helper */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format a price value for display — e.g. 1234.5 → "1 234,50 Kč" */
export function formatPrice(amount: number, currency = 'CZK', locale = 'cs-CZ'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/** Format mm dimension for display — e.g. 297.3 → "297,3 mm" */
export function formatMm(mm: number, locale = 'cs-CZ'): string {
  return `${new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(mm)} mm`
}

/** Convert mm to world units (cm) for Three.js scene */
export function mmToWorldUnits(mm: number): number {
  return mm / 10
}

/** Clamp a number between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
