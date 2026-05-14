/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      // ── Brand & surface palette ──────────────────────────────────────────
      // Centralized design tokens — prefer these over hard-coded hex values.
      // `brand` is the indigo→violet primary used for hero CTAs and accents.
      // `surface` is the deep-black elevation system used by widgets.
      // `ink` is the text scale on dark surfaces.
      colors: {
        brand: {
          50:  '#EEEBFD',
          100: '#D9D3FB',
          200: '#B5A8F6',
          300: '#917DF2',
          400: '#7263ED',
          500: '#5B4FE8',
          600: '#4A3FCC',
          700: '#3A31A6',
          800: '#2C2580',
          900: '#1F1A5A',
        },
        // `accent` is the magenta-violet companion to `brand`. Used as the
        // gradient terminus on the primary CTA pattern (`from-brand-500 to-accent-500`).
        // Values mirror Tailwind's default `purple-*` ramp so existing
        // `to-purple-*` usages migrate cleanly while keeping the gradient
        // recipe inside the design system.
        accent: {
          50:  '#FAF5FF',
          100: '#F3E8FF',
          200: '#E9D5FF',
          300: '#D8B4FE',
          400: '#C084FC',
          500: '#A855F7',
          600: '#9333EA',
          700: '#7E22CE',
          800: '#6B21A8',
          900: '#581C87',
        },
        surface: {
          base:     '#0A0A0A',
          widget:   '#161616',
          card:     '#1E1E1E',
          elevated: '#252525',
        },
        ink: {
          primary: '#F0F0F5',
          sub:     '#B0B0C0',
          dim:     '#888898',
          meta:    '#555568',
        },
      },
      fontFamily: {
        sans: ["Inter", "SF Pro Display", "system-ui", "sans-serif"],
      },
      boxShadow: {
        // Widget shadow — heavier depth used by dashboard cards.
        card:    '0 8px 40px rgba(0,0,0,0.70), 0 2px 8px rgba(0,0,0,0.50)',
        // Subtle elevation for inputs / small cards.
        tile:    '0 4px 16px rgba(0,0,0,0.40)',
        // Glow used on the primary CTA.
        brand:   '0 4px 22px rgba(91,79,232,0.40)',
      },
      borderRadius: {
        tile: '1rem',     // 16px — consistent for cards / inputs
        widget: '1.5rem', // 24px — used for big dashboard widgets
      },
      keyframes: {
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'slide-up': 'slideUp 0.2s ease-out',
      },
    },
  },
  plugins: [],
};
