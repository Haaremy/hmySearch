/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './node_modules/@haaremy/hmydesign/**/*.{js,ts,jsx,tsx}', // <- Paketinhalt
  ],
  theme: {
    extend: {},
  },
};
