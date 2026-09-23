/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        neo: {
          bg: '#F8FAFC',
          paper: '#FFFFFF',
          brand: '#059669', // Verde Institucional IFNMG
          'brand-hover': '#047857',
          'brand-light': '#D1FAE5',
          accent: '#2563EB', // Azul Institucional
          'accent-hover': '#1D4ED8',
          'accent-light': '#DBEAFE',
          dark: '#0F172A', // Preto profundo neo-brutalista
          yellow: '#FBBF24', // Amarelo tíquete estudante
          'yellow-hover': '#F59E0B',
          'yellow-light': '#FEF3C7',
          blue: '#38BDF8', // Azul celeste
          green: '#34D399', // Verde água
          red: '#EF4444',
          'red-hover': '#DC2626',
          'red-light': '#FEE2E2',
          purple: '#8B5CF6',
          'purple-light': '#EDE9FE',
          muted: '#64748B',
        }
      },
      fontFamily: {
        heading: ['"Space Grotesk"', 'sans-serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
        body: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'neo-xs': '2px 2px 0px 0px #0F172A',
        'neo-sm': '3px 3px 0px 0px #0F172A',
        'neo-md': '5px 5px 0px 0px #0F172A',
        'neo-lg': '8px 8px 0px 0px #0F172A',
        'neo-xl': '12px 12px 0px 0px #0F172A',
        'neo-yellow': '4px 4px 0px 0px #FBBF24',
        'neo-brand': '4px 4px 0px 0px #059669',
        'neo-inset': 'inset 2px 2px 0px 0px #0F172A',
      },
      borderWidth: {
        '3': '3px',
      }
    },
  },
  plugins: [],
}
