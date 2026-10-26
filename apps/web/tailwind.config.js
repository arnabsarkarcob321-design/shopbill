/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#F8FAFC',
        surface: '#FFFFFF',
        sidebar: {
          DEFAULT: '#0F172A',
          hover: '#1E293B',
          text: '#94A3B8',
          active: '#2563EB',
        },
        financial: {
          blue: {
            text: '#1D4ED8',
            bg: '#EFF6FF',
            pill: '#DBEAFE',
          },
          green: {
            text: '#15803D',
            bg: '#F0FDF4',
            pill: '#DCFCE7',
          },
          amber: {
            text: '#D97706',
            bg: '#FFFBEB',
            pill: '#FEF3C7',
          },
          red: {
            text: '#DC2626',
            bg: '#FEF2F2',
            pill: '#FEE2E2',
          },
          purple: {
            text: '#6D28D9',
            bg: '#F5F3FF',
            pill: '#EDE9FE',
          },
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
