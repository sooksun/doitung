/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sarabun)', 'Sarabun', 'sans-serif'],
        sarabun: ['var(--font-sarabun)', 'Sarabun', 'sans-serif'],
      },
      colors: {
        // Primary - Purple tones
        primary: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7c3aed',
          800: '#6b21a8',
          900: '#581c87',
          950: '#3b0764',
        },
        // Secondary - Blue tones
        secondary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        // Dark mode specific colors
        dark: {
          bg: '#0f0a1a',
          card: '#1a1025',
          border: '#2d1f42',
          hover: '#251736',
        },
        // Light mode specific colors  
        light: {
          bg: '#f0f9ff',
          card: '#ffffff',
          border: '#e0f2fe',
          hover: '#f8fafc',
        },
      },
      backgroundImage: {
        'gradient-dark': 'linear-gradient(135deg, #1a1025 0%, #0f0a1a 50%, #0c1929 100%)',
        'gradient-light': 'linear-gradient(135deg, #f0f9ff 0%, #ffffff 50%, #faf5ff 100%)',
      },
      boxShadow: {
        'glow-purple': '0 0 20px rgba(139, 92, 246, 0.3)',
        'glow-blue': '0 0 20px rgba(59, 130, 246, 0.3)',
      },
    },
  },
  plugins: [],
}
