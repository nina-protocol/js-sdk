/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],  
  theme: {
    extend: {
      transitionProperty: {
        'height': 'height'
      },
      fontFamily: {
        'helvetica': ['Helvetica', 'Arial', 'sans-serif'],
      }
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    darkTheme: 'business',
    lightTheme: 'wireframe',
  }
}
