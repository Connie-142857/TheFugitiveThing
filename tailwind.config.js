/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        parchment: {
          50: '#fdfbf7',
          100: '#f8f4e9',
          200: '#f0e6ce',
          300: '#e5d4ad',
          400: '#d7be8a',
          500: '#c5a56b',
          600: '#ad8b50',
          700: '#8c6d3d',
          800: '#715734',
          900: '#5c462c',
        },
        ink: {
          light: '#423326',
          DEFAULT: '#271c14',
          dark: '#140d09',
          deep: '#0c0705',
        },
        manuscript: {
          burgundy: '#58181f',
          'burgundy-light': '#7a222c',
          forest: '#1e382b',
          'forest-light': '#2c4f3e',
          gold: '#c29b38',
          'gold-light': '#ddb452',
          charcoal: '#212121',
          wax: '#8b1e1e',
        }
      },
      fontFamily: {
        serif: ['Cinzel', 'MedievalSharp', 'Georgia', 'serif'],
        body: ['Alegreya', 'Crimson Text', 'Garamond', 'serif'],
        handwritten: ['Caveat', 'cursive'],
        mono: ['Courier Prime', 'monospace']
      },
      boxShadow: {
        'parchment-inset': 'inset 0 0 40px rgba(70, 45, 20, 0.25)',
        'wax-seal': '0 4px 10px rgba(80, 10, 10, 0.4), inset 0 2px 4px rgba(255, 200, 200, 0.2)',
        'woodcut': '3px 3px 0px rgba(20, 13, 9, 0.85)',
      }
    },
  },
  plugins: [],
}
