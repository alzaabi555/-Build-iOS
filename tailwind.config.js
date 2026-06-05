/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./context/**/*.{js,ts,jsx,tsx}",
    "./theme/**/*.{js,ts,jsx,tsx}",
    "./utils/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
    "!./node_modules/**/*",
    "!./dist/**/*",
    "!./build/**/*",
    "!./.git/**/*"
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