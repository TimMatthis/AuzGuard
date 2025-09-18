/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gray: {
          900: '#0a0b0f',
          800: '#111318',
          700: '#1a1d26',
          600: '#252932',
          500: '#2d3142',
          400: '#6b7280',
          300: '#a1a8b8',
          200: '#ffffff',
        },
        blue: {
          600: '#3b82f6',
          700: '#2563eb',
        },
        green: {
          500: '#10b981',
        },
        yellow: {
          500: '#f59e0b',
        },
        red: {
          500: '#ef4444',
        },
      },
    },
  },
  plugins: [],
}
