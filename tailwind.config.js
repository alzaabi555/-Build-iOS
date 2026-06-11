/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./App.{js,ts,jsx,tsx}",
    "./main.{js,ts,jsx,tsx}",
    "./index.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./Components/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./Pages/**/*.{js,ts,jsx,tsx}",
    "./theme/**/*.{js,ts,jsx,tsx}",
    "./Theme/**/*.{js,ts,jsx,tsx}",
    "./context/**/*.{js,ts,jsx,tsx}",
    "./utils/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
    "./voice-agent/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: "rgb(var(--primary) / <alpha-value>)",
        primaryHover: "rgb(var(--primary-hover) / <alpha-value>)",
        primarySoft: "rgb(var(--primary-soft) / <alpha-value>)",

        bgMain: "rgb(var(--bg) / <alpha-value>)",
        bgCard: "rgb(var(--card) / <alpha-value>)",
        bgSoft: "rgb(var(--glass) / <alpha-value>)",

        textPrimary: "rgb(var(--text) / <alpha-value>)",
        textSecondary: "rgb(var(--secondary) / <alpha-value>)",
        textMuted: "rgb(var(--muted) / <alpha-value>)",

        borderColor: "rgb(var(--border) / <alpha-value>)",
        borderSoft: "rgb(var(--border-soft) / <alpha-value>)",

        glow: "rgb(var(--glow) / <alpha-value>)",

        success: "rgb(var(--success) / <alpha-value>)",
        danger: "rgb(var(--danger) / <alpha-value>)",
        warning: "rgb(var(--warning) / <alpha-value>)",
        info: "rgb(var(--info) / <alpha-value>)",

        primaryLight: "#6366F1",
        primaryDark: "#3730A3"
      },
      boxShadow: {
        soft: "0 1px 2px rgba(15, 23, 42, 0.05)",
        card: "0 8px 24px rgba(15, 23, 42, 0.06)",
        elevated: "0 18px 45px rgba(15, 23, 42, 0.10)"
      },
      borderRadius: {
        app: "1.25rem",
        appLg: "1.5rem",
        appXl: "2rem"
      }
    }
  },
  plugins: []
};
