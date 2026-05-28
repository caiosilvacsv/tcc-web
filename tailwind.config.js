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
          bg: '#F3F4F6',
          paper: '#FFFFFF',
          brand: '#059669', // Verde IFNMG
          accent: '#3B82F6', // Azul Biblioteca
          dark: '#111827', // Preto neo-brutalista
          yellow: '#FBBF24', // Amarelo tíquete estudante
          blue: '#60A5FA', // Azul tíquete professor
          green: '#34D399', // Verde água tíquete lanche
        }
      },
      fontFamily: {
        heading: ['"Space Grotesk"', 'sans-serif'],
        body: ['"IBM Plex Mono"', 'monospace'],
      },
      boxShadow: {
        'neo-sm': '2px 2px 0px 0px #111827',
        'neo-md': '4px 4px 0px 0px #111827',
        'neo-lg': '8px 8px 0px 0px #111827',
        'neo-xl': '12px 12px 0px 0px #111827',
      },
      borderWidth: {
        '3': '3px',
      }
    },
  },
  plugins: [],
}
