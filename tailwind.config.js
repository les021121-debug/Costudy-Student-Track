/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Pretendard', 'sans-serif'],
      },
      colors: {
        primary: {
          50:  '#fdf0ee',
          100: '#fad9d4',
          200: '#f5b3aa',
          300: '#ee8070',
          400: '#e25040',
          500: '#C0392B',
          600: '#a02f24',
          700: '#7d241b',
          800: '#5a1a13',
          900: '#38100c',
        },
        accent: '#F5A623',
        danger: '#E85454',
        success: '#3DBE7A',
      },
    },
  },
  plugins: [],
}