/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        colors: {
          'brand-dark': '#0a0a0a',
          'brand-darker': '#050505',
          'brand-red': '#ef4444',
          'brand-orange': '#f97316',
          'brand-coral': '#fb7185',
        },
        backgroundImage: {
          'gradient-brand': 'linear-gradient(135deg, #ef4444, #f97316, #fb7185)',
          'gradient-brand-reverse': 'linear-gradient(135deg, #fb7185, #f97316, #ef4444)',
        },
        fontFamily: {
          'display': ['Montserrat', 'sans-serif'],
          'body': ['Inter', 'sans-serif'],
        },
        animation: {
          'bubble-float': 'bubble-float 8s ease-in-out infinite',
          'bubble-float-slow': 'bubble-float 12s ease-in-out infinite',
          'bubble-float-fast': 'bubble-float 6s ease-in-out infinite',
        },
      },
    },
    plugins: [],
  }