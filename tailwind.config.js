/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        onyx: '#08090B',
        graphite: '#111318',
        elevated: '#181B21',
        surface: {
          DEFAULT: '#111318',
          raised: '#181B21',
          hover: '#1D2027',
          sunken: '#0C0E12',
        },
        line: {
          DEFAULT: 'rgba(244,244,242,0.07)',
          strong: 'rgba(244,244,242,0.13)',
          gold: 'rgba(201,162,39,0.28)',
        },
        ink: {
          DEFAULT: '#F4F4F2',
          muted: '#969AA3',
          faint: '#6A6E77',
          ghost: '#43474E',
        },
        gold: {
          DEFAULT: '#C9A227',
          light: '#E0BE55',
          deep: '#8E7119',
          wash: 'rgba(201,162,39,0.10)',
        },
        success: { DEFAULT: '#35B779', wash: 'rgba(53,183,121,0.12)' },
        danger: { DEFAULT: '#E05252', wash: 'rgba(224,82,82,0.12)' },
        warn: { DEFAULT: '#D9A03C', wash: 'rgba(217,160,60,0.12)' },
        info: { DEFAULT: '#5B8DEF', wash: 'rgba(91,141,239,0.12)' },
      },
      fontFamily: {
        display: ['Sentient', 'Iowan Old Style', 'Georgia', 'serif'],
        heading: ['Geist', 'Inter', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['Geist Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      letterSpacing: {
        tightest: '-0.045em',
        editorial: '-0.03em',
        label: '0.14em',
      },
      borderRadius: {
        sm: '6px',
        DEFAULT: '8px',
        md: '10px',
        lg: '14px',
        xl: '18px',
        '2xl': '24px',
      },
      boxShadow: {
        subtle: '0 1px 2px rgba(0,0,0,0.4)',
        raised: '0 8px 24px -12px rgba(0,0,0,0.7)',
        float: '0 24px 60px -24px rgba(0,0,0,0.85)',
        goldring: '0 0 0 1px rgba(201,162,39,0.35)',
      },
      transitionTimingFunction: {
        swift: 'cubic-bezier(0.22, 1, 0.36, 1)',
        entrance: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        breathe: { '0%,100%': { opacity: '0.35' }, '50%': { opacity: '0.75' } },
        drawline: { from: { strokeDashoffset: '1' }, to: { strokeDashoffset: '0' } },
      },
      animation: {
        shimmer: 'shimmer 1.8s ease-in-out infinite',
        breathe: 'breathe 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
