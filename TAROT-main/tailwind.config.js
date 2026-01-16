/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'heading': ['Cinzel', 'serif'],
        'serif': ['Cormorant Garamond', 'serif'],
        'mono': ['Share Tech Mono', 'monospace'],
      },
      colors: {
        'mystic-dark': {
          DEFAULT: '#0f0518',
          light: '#1a0b2e',
          lighter: '#0a0514',
        },
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'spin-reverse': 'spin-reverse 1s linear infinite',
      },
      keyframes: {
        'spin-reverse': {
          from: { transform: 'rotate(360deg)' },
          to: { transform: 'rotate(0deg)' },
        },
      },
    },
  },
  plugins: [],
}
