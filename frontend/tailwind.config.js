/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cg: {
          bg:        'var(--cg-bg)',
          surface:   'var(--cg-surface)',
          s2:        'var(--cg-surface2)',
          s3:        'var(--cg-surface3)',
          stripe:    'var(--cg-stripe)',
          border:    'var(--cg-border)',
          border2:   'var(--cg-border2)',
          hover:     'var(--cg-hover)',
          txt:       'var(--cg-txt)',
          txt2:      'var(--cg-txt2)',
          muted:     'var(--cg-muted)',
          faint:     'var(--cg-faint)',
          primary:   'var(--cg-primary)',
          'primary-h':'var(--cg-primary-h)',
          'primary-s':'var(--cg-primary-s)',
          secondary: 'var(--cg-secondary)',
          's2-s':    'var(--cg-secondary-s)',
          accent:    'var(--cg-accent)',
          'accent-s':'var(--cg-accent-s)',
          danger:    'var(--cg-danger)',
          'danger-s':'var(--cg-danger-s)',
          warning:   'var(--cg-warning)',
          'warning-s':'var(--cg-warning-s)',
          info:      'var(--cg-info)',
          'info-s':  'var(--cg-info-s)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        xl2: '1rem',
        xl3: '1.25rem',
      },
      boxShadow: {
        'cg-sm': 'var(--cg-shadow-sm)',
        'cg':    'var(--cg-shadow)',
        'cg-md': 'var(--cg-shadow-md)',
        'cg-lg': 'var(--cg-shadow-lg)',
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        'accordion-down': { from:{height:'0'}, to:{height:'var(--radix-accordion-content-height)'} },
        'accordion-up':   { from:{height:'var(--radix-accordion-content-height)'}, to:{height:'0'} },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up':   'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [],
}
