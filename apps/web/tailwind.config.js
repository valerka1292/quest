/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,js}'],
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#09090b',
          card: 'rgba(255, 255, 255, 0.02)',
          elevated: 'rgba(255, 255, 255, 0.06)',
        },
        accent: {
          red: '#DC2626',
          amber: '#D97706',
          purple: '#7C3AED',
        },
        text: {
          primary: '#FFFFFF',
          secondary: 'rgba(255,255,255,0.7)',
          muted: 'rgba(255,255,255,0.4)',
        },
        border: {
          subtle: 'rgba(255,255,255,0.06)',
          medium: 'rgba(255,255,255,0.12)',
        },
      },
      fontFamily: {
        sans: ['Inter Variable', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '16px',
      },
      animation: {
        'bounce-slow': 'bounce 1.8s infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
