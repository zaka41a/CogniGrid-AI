/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cg: {
          bg:      'var(--cg-bg)',
          surface: 'var(--cg-surface)',
          s2:      'var(--cg-surface2)',
          stripe:  'var(--cg-stripe)',
          border:  'var(--cg-border)',
          hover:   'var(--cg-hover)',
          txt:     'var(--cg-txt)',
          muted:   'var(--cg-muted)',
          faint:   'var(--cg-faint)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

