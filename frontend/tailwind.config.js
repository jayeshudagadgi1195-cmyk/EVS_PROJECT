/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        ink: {
          950: '#040a07',
          900: '#07110c',
          850: '#0a1711',
          800: '#0e1f17',
          700: '#152d22',
          600: '#1f3d2f',
        },
        mint: { 300: '#a7f3d0', 400: '#6ee7b7' },
        leaf: { 400: '#34d399', 500: '#10b981', 600: '#059669' },
        lime: { 300: '#d9f99d', 400: '#bef264' },
      },
      boxShadow: {
        card: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 20px 40px -24px rgba(0,0,0,0.6)',
        glow: '0 0 0 1px rgba(52,211,153,0.25), 0 10px 30px -10px rgba(52,211,153,0.35)',
      },
      borderRadius: { '2.5xl': '1.25rem' },
    },
  },
  plugins: [],
}
