/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#f0f7fa',
          100: '#e0f0f5',
          200: '#baddea',
          300: '#8cc3d7',
          400: '#57a4c0',
          500: '#3d8ca8',
          600: '#2f748e',
          700: '#295e74',
          800: '#254b5d',
          900: '#234050',
        },
        neutral: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        accent: {
          50: '#f6f7f9',
          100: '#ebecf1',
          200: '#d5d8e0',
          300: '#b3b9c7',
          400: '#8c96a8',
          500: '#707a8c',
          600: '#596273',
          700: '#48505e',
          800: '#3d444f',
          900: '#343a44',
        },
      },
    },
  },
  plugins: [],
};