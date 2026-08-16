/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#fef9ee',
          100: '#fdf0cc',
          200: '#fbe09a',
          300: '#f0d070',   // bright gold — active text
          400: '#c9a84c',   // standard gold
          500: '#c9a84c',
          600: '#c9a84c',   // active borders / bg tints
          700: '#7a6030',   // dark gold
          800: '#5a4520',
          900: '#3a2d12',
        },
        turquoise: { DEFAULT: '#1eb3bc', dark: '#158b92' },
        gold:      { DEFAULT: '#c9a84c', bright: '#f0d070', dim: '#7a6030' },
        profit:    { light: '#34d399', DEFAULT: '#10b981', dark: '#059669' },
        loss:      { light: '#f87171', DEFAULT: '#ef4444', dark: '#dc2626' },
        surface: {
          DEFAULT: '#060810',
          card:    '#090d15',
          hover:   '#0d1220',
          border:  '#2a2210',
        },
      },
      fontFamily: {
        sans:     ['Inter', 'system-ui', 'sans-serif'],
        mono:     ['JetBrains Mono', 'Fira Code', 'monospace'],
        orbitron: ['Orbitron', 'monospace'],
      },
      animation: {
        'fade-in':    'fadeIn 0.25s ease-out',
        'slide-up':   'slideUp 0.3s ease-out',
        'pulse-gold': 'pulseGold 1.5s ease-in-out infinite',
        'glow':       'glow 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:    { '0%': { opacity: '0', transform: 'translateY(6px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideUp:   { '0%': { transform: 'translateY(10px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        pulseGold: { '0%, 100%': { boxShadow: '0 0 0 0 rgba(201,168,76,0.5)' }, '50%': { boxShadow: '0 0 0 8px rgba(201,168,76,0)' } },
        glow:      { '0%, 100%': { filter: 'drop-shadow(0 0 6px rgba(240,208,112,0.3))' }, '50%': { filter: 'drop-shadow(0 0 14px rgba(240,208,112,0.7))' } },
      },
    },
  },
  plugins: [],
}
