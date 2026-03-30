/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
       colors: {
         primary: {
           50: '#eff6ff',
           100: '#dbeafe',
           300: '#93c5fd',
           500: '#39b54a',
           600: '#001b71',
           700: '#00155a',
           900: '#00124f',
         },
         success: '#10b981',
         danger: '#ef4444',
       }
    },
  },
  plugins: [],
}

