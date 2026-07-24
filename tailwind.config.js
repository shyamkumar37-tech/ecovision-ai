/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Cabinet Grotesk"', '"Syne"', 'sans-serif'],
        body: ['"Satoshi"', '"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        eco: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        teal: {
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
        },
        surface: {
          DEFAULT: '#0c1a0c',
          card:    '#111f11',
          elevated:'#172417',
          border:  '#1e3a1e',
        },
      },
      backgroundImage: {
        'mesh-green': 'radial-gradient(at 40% 20%, hsla(134,72%,15%,1) 0px, transparent 50%), radial-gradient(at 80% 0%, hsla(163,90%,8%,1) 0px, transparent 50%), radial-gradient(at 0% 50%, hsla(134,50%,10%,1) 0px, transparent 50%)',
        'glow-green': 'radial-gradient(ellipse at center, rgba(34,197,94,0.12) 0%, transparent 70%)',
      },
      animation: {
        'fade-up':     'fadeUp 0.5s ease forwards',
        'fade-in':     'fadeIn 0.4s ease forwards',
        'pulse-slow':  'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer':     'shimmer 2s linear infinite',
        'float':       'float 6s ease-in-out infinite',
        'scan':        'scan 3s linear infinite',
      },
      keyframes: {
        fadeUp:  { from: { opacity:'0', transform:'translateY(16px)' }, to: { opacity:'1', transform:'translateY(0)' } },
        fadeIn:  { from: { opacity:'0' }, to: { opacity:'1' } },
        shimmer: { from: { backgroundPosition: '-200% 0' }, to: { backgroundPosition: '200% 0' } },
        float:   { '0%,100%': { transform:'translateY(0)' }, '50%': { transform:'translateY(-8px)' } },
        scan:    { from: { transform:'translateY(-100%)' }, to: { transform:'translateY(100vh)' } },
      },
      boxShadow: {
        'glow-sm':  '0 0 12px rgba(34,197,94,0.25)',
        'glow':     '0 0 24px rgba(34,197,94,0.30)',
        'glow-lg':  '0 0 48px rgba(34,197,94,0.20)',
        'card':     '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)',
        'card-hover':'0 4px 20px rgba(0,0,0,0.5), 0 0 0 1px rgba(34,197,94,0.2)',
      },
    },
  },
  plugins: [],
}
