import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // ── Design tokens ───────────────────────────────────────────────────────
      colors: {
        // Neutral foundation — warm off-white system
        canvas: {
          DEFAULT: '#F8F6F2',   // page background
          subtle: '#F0EDE7',    // card / panel background
          muted: '#E8E4DC',     // hover states, borders
        },
        // Primary ink — near-black with warm undertone
        ink: {
          DEFAULT: '#1A1714',
          secondary: '#4A4540',
          tertiary: '#8A8480',
          placeholder: '#B8B4B0',
        },
        // Accent — restrained gold for CTAs and highlights
        gold: {
          DEFAULT: '#B8975A',
          light: '#CDB17A',
          dark: '#9A7B40',
          muted: '#F0E8D8',
        },
        // Semantic
        success: '#3D7A5E',
        warning: '#B8813A',
        error: '#B83A3A',
      },

      fontFamily: {
        // Primary: editorial serif for headings
        serif: ['var(--font-cormorant)', 'Georgia', 'serif'],
        // Secondary: geometric sans for body and UI
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        // Monospace: for dimension/price readouts
        mono: ['var(--font-geist-mono)', 'monospace'],
      },

      fontSize: {
        // Custom scale — slightly larger than default, editorial feel
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
        xs: ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.04em' }],
        sm: ['0.875rem', { lineHeight: '1.375rem' }],
        base: ['1rem', { lineHeight: '1.625rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.875rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.375rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.75rem', letterSpacing: '-0.01em' }],
        '5xl': ['3rem', { lineHeight: '3.5rem', letterSpacing: '-0.02em' }],
        '6xl': ['3.75rem', { lineHeight: '4.25rem', letterSpacing: '-0.025em' }],
      },

      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '30': '7.5rem',
        '34': '8.5rem',
      },

      borderRadius: {
        none: '0',
        sm: '0.125rem',
        DEFAULT: '0.25rem',
        md: '0.375rem',
        lg: '0.5rem',
        xl: '0.75rem',
      },

      boxShadow: {
        // Soft, warm-tinted shadows — no harsh cool-grey defaults
        card: '0 1px 3px 0 rgba(26, 23, 20, 0.06), 0 1px 2px -1px rgba(26, 23, 20, 0.06)',
        elevated: '0 4px 16px 0 rgba(26, 23, 20, 0.08), 0 2px 4px -2px rgba(26, 23, 20, 0.06)',
        modal: '0 20px 60px 0 rgba(26, 23, 20, 0.18), 0 8px 16px -4px rgba(26, 23, 20, 0.1)',
      },

      transitionTimingFunction: {
        // Smooth ease-out for UI micro-interactions
        'ease-out-quart': 'cubic-bezier(0.25, 1, 0.5, 1)',
        'ease-in-out-quart': 'cubic-bezier(0.76, 0, 0.24, 1)',
      },

      transitionDuration: {
        '250': '250ms',
        '350': '350ms',
        '450': '450ms',
      },

      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },

      animation: {
        'fade-in': 'fade-in 300ms ease-out-quart',
        'slide-up': 'slide-up 350ms ease-out-quart',
        'scale-in': 'scale-in 200ms ease-out-quart',
      },
    },
  },
  plugins: [],
}

export default config
