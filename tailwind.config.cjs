/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    // 🚨 مسح الملفات الموجودة في الجذر مباشرة (مثل App.tsx و main.tsx)
    "./*.{js,ts,jsx,tsx}",
    
    // 🚨 مسح المجلدات باحتمالي (الحرف الصغير والكبير) لكسر عناد Linux
    "./components/**/*.{js,ts,jsx,tsx}",
    "./Components/**/*.{js,ts,jsx,tsx}",
    
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./Pages/**/*.{js,ts,jsx,tsx}",
    
    "./theme/**/*.{js,ts,jsx,tsx}",
    "./Theme/**/*.{js,ts,jsx,tsx}",
    
    "./context/**/*.{js,ts,jsx,tsx}",
    "./Context/**/*.{js,ts,jsx,tsx}",
    
    "./utils/**/*.{js,ts,jsx,tsx}",
    "./Utils/**/*.{js,ts,jsx,tsx}",
    
    "./hooks/**/*.{js,ts,jsx,tsx}",
    "./Hooks/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: "var(--primary)",
        bgMain: "var(--bg)",
        bgCard: "var(--card)",
        bgSoft: "var(--glass)",
        textPrimary: "var(--text)",
        textSecondary: "var(--secondary)",
        glow: "var(--glow)",
        borderColor: "var(--border)",
        primaryLight: "#3B82F6",
        primaryDark: "#1E40AF",
        textMuted: "#6B7280",
        success: "#22C55E",
        danger: "#EF4444",
        warning: "#F59E0B",
        info: "#06B6D4"
      }
    }
  },
  plugins: []
}
