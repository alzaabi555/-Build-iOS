/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    
    // ✅ 1. هذا السطر هو المنقذ! يبحث في ملفات الجذر (App.tsx, main.tsx)
    "./*.{js,ts,jsx,tsx}",
    
    // ✅ 2. يبحث في مجلد المكونات (حيث يوجد LoginScreen.tsx وباقي الشاشات)
    "./components/**/*.{js,ts,jsx,tsx}",
    
    // ✅ 3. باقي المجلدات في الجذر
    "./context/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Tajawal', 'sans-serif'],
      },
      colors: {
        // إذا كنت تستخدم ألواناً مخصصة، تأكد من وجودها هنا، أو اتركها كما هي
      }
    },
  },
  plugins: [],
}
