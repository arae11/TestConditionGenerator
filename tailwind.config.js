/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Rail-industry palette: National Rail "double arrow" red as the
        // primary brand colour, paired with a dark rail-blue navy (close to
        // the historic BS 114 "Rail Blue" specified for British Rail
        // livery) for headers and dark UI elements.
        paper: '#F5F6F7',
        ink: '#131A22',
        line: '#D8DCE1',
        muted: '#5B6672',
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
          DEFAULT: '#D9262F',
          dark: '#A81B22',
          light: '#F7DCDD',
        },
        navy: {
          DEFAULT: '#10243E',
          dark: '#0A1929',
          light: '#DDE4EC',
        },
        warn: '#B45309',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(19, 26, 34, 0.06), 0 1px 0 rgba(19, 26, 34, 0.04)',
      },
    },
  },
  plugins: [],
};
