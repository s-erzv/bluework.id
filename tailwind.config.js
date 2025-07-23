/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
      },
      colors: {
        'blue-primary': '#007BFF',
        'blue-accent': '#4A90E2',
        'blue-darker': '#0468cd',

        'light-bg-primary': '#FFFFFF',
        'light-bg-secondary': '#F8F9FA',
        'light-text-primary': '#212529',
        'light-text-secondary': '#6C757D',
        'light-border': '#DEE2E6',
        'light-input-bg': '#F0F2F5',

        'dark-bg-primary': '#0D1B2A',
        'dark-bg-secondary': '#1B2E4A',
        'dark-text-primary': '#E0E0E0',
        'dark-text-secondary': '#B0B0B0',
        'dark-border': '#34495E',
        'dark-input-bg': '#2C3E50',
        
        'accent-teal': '#28B4AF',
        'accent-purple': '#8E44AD',
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(135deg, var(--dark-bg-primary) 0%, var(--dark-bg-secondary) 100%)',
        'dark-radial': 'radial-gradient(circle at center, var(--dark-bg-secondary) 0%, var(--dark-bg-primary) 100%)',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        zoomIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.6s ease-out forwards',
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'slide-in-left': 'slideInLeft 0.6s ease-out forwards',
        'slide-in-right': 'slideInRight 0.6s ease-out forwards',
        'zoom-in': 'zoomIn 0.5s ease-out forwards',
      },
    },
  },
  plugins: [],
}
