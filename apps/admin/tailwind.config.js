/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,js}'],
  theme: {
    extend: {
      colors: {
        bg: { base: '#0D0D1A', card: '#1A1A2E', elevated: '#252540' },
        accent: { red: '#DC2626', purple: '#7C3AED', green: '#22C55E' },
        text: { primary: '#FFFFFF', secondary: 'rgba(255,255,255,0.7)', muted: 'rgba(255,255,255,0.4)' },
        border: { subtle: 'rgba(255,255,255,0.06)', medium: 'rgba(255,255,255,0.12)' },
      },
      borderRadius: { card: '16px' },
    },
  },
  plugins: [],
};
