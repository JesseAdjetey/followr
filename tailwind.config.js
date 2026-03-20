/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'sans-serif'],
        mono: ['var(--font-dm-mono)', 'monospace'],
      },
      colors: {
        bg:       '#F2F1ED',
        surface:  '#FFFFFF',
        surface2: '#F7F6F2',
        text:     '#1A1814',
        muted:    '#888580',
        hint:     '#B8B5AE',
        accent: {
          DEFAULT: '#2563EB',
          bg:      '#EEF4FF',
        },
        status: {
          red:        '#DC2626',
          'red-bg':   '#FEF2F2',
          amber:      '#D97706',
          'amber-bg': '#FFFBEB',
          green:      '#16A34A',
          'green-bg': '#F0FDF4',
        },
      },
      borderRadius: {
        DEFAULT: '12px',
        sm: '8px',
        lg: '16px',
      },
    },
  },
  plugins: [],
}
