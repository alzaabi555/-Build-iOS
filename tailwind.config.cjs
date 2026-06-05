/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./App.{js,ts,jsx,tsx}",
    "./main.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./Components/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./Pages/**/*.{js,ts,jsx,tsx}",
    "./theme/**/*.{js,ts,jsx,tsx}",
    "./Theme/**/*.{js,ts,jsx,tsx}",
    "./context/**/*.{js,ts,jsx,tsx}",
    "./utils/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}"
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
