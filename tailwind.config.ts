/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './node_modules/@haaremy/hmydesign/**/*.{js,ts,jsx,tsx}', // <- Paketinhalt
  ],
  theme: {
    extend: {},
  },
};
