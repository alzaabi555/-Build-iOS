/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",            // (1) يبحث في الملفات الموجودة في الواجهة فقط
    "./components/**/*.{js,ts,jsx,tsx}", // (2) يبحث داخل مجلد المكونات
    // أضف أي مجلدات أخرى هنا إذا كانت لديك، مثلاً:
    // "./pages/**/*.{js,ts,jsx,tsx}",
    // "./lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Tajawal', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
