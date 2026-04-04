/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    // 1. المسارات الإيجابية (أين يبحث Tailwind)
    "./*.{js,ts,jsx,tsx}",              
    "./components/**/*.{js,ts,jsx,tsx}", 
    "./context/**/*.{js,ts,jsx,tsx}",    
    "./theme/**/*.{js,ts,jsx,tsx}",      
    "./utils/**/*.{js,ts,jsx,tsx}",
    
    // 2. حراس الحماية لمنع فشل البناء على GitHub (علامة التعجب ! تعني استثناء)
    "!./node_modules/**/*",
    "!./dist/**/*",
    "!./build/**/*",
    "!./.git/**/*"
  ],
  theme: {
    extend: {
      colors: {
        // الألوان الديناميكية للثيمات
        primary: "var(--primary)",
        bgMain: "var(--bg)",
        bgCard: "var(--card)",
        bgSoft: "var(--glass)",
        textPrimary: "var(--text)",
        textSecondary: "var(--secondary)",
        
        // ألوان الزجاج والتوهج
        glow: "var(--glow)",
        borderColor: "var(--border)",

        // ألوان ثابتة
        primaryLight: "#3B82F6",
        primaryDark: "#1E40AF",
        textMuted: "#6B7280",
        success: "#22C55E",
        danger: "#EF4444",
        warning: "#F59E0B",
        info: "#06B6D4",
      }
    },
  },
  plugins: [],
}
