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
          50:  '#f0f4ff',
          100: '#e0eaff',
          200: '#c7d7fe',
          300: '#a5b8fc',
          400: '#818cf8',
          500: '#4F63D2',
          600: '#3d4fad',
          700: '#2f3c87',
          800: '#1e2760',
          900: '#111540',
        },
        accent: '#F5A623',
        danger: '#E85454',
        success: '#3DBE7A',
      },
    },
  },
  plugins: [],
}
