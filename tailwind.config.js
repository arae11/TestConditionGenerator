/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F7F8F4',
        ink: '#1B1F1D',
        line: '#DCDFD6',
        muted: '#6B7268',
        given: {
          DEFAULT: '#3B5BA5',
          bg: '#EAEFF9',
        },
        when: {
          DEFAULT: '#A8720E',
          bg: '#FBF1E1',
        },
        then: {
          DEFAULT: '#2F7D5C',
          bg: '#E8F3EC',
        },
        brand: {
          DEFAULT: '#2D5F4C',
          dark: '#1F4737',
          light: '#DDEAE3',
        },
        warn: '#C0392B',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(27, 31, 29, 0.06), 0 1px 0 rgba(27, 31, 29, 0.04)',
      },
    },
  },
  plugins: [],
};
