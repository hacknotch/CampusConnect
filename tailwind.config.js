/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./public/index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        campus: {
          green: "#28a745",
          dark: "#18453B",
        },
      },
    },
  },
  plugins: [],
};
