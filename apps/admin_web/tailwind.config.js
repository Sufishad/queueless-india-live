/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0B0F19',
        card: '#121A2B',
        panel: '#121A2B',
        border: '#1E293B',
        orange: {
          primary: '#F97316',
          hover: '#EA580C',
        },
        emerald: {
          primary: '#10B981',
          hover: '#059669',
        },
        slate: {
          light: '#F8FAFC',
          muted: '#8B98AD',
        }
      },
    },
  },
  plugins: [],
}
