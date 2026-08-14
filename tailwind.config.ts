import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "'SF Pro Text'",
          "'Inter'",
          "system-ui",
          "sans-serif",
        ],
      },
      colors: {
        accent: {
          DEFAULT: "#6366F1",
          50: "#EEF0FF",
          100: "#E0E3FF",
          200: "#C6CAFF",
          300: "#A5A9FF",
          400: "#8285FA",
          500: "#6366F1",
          600: "#4F46E5",
          700: "#4338CA",
          800: "#372FA0",
          900: "#2D2870",
        },
        positive: { DEFAULT: "#16A34A", light: "#DCFCE7", dark: "#4ADE80" },
        negative: { DEFAULT: "#E11D48", light: "#FFE4E6", dark: "#FB7185" },
        surface: {
          light: "#FFFFFF",
          "light-subtle": "#F4F5F8",
          dark: "#12141C",
          "dark-subtle": "#1A1D27",
        },
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 8px -2px rgb(0 0 0 / 0.06)",
        sheet: "0 -4px 24px -4px rgb(0 0 0 / 0.15)",
      },
      spacing: {
        "safe-top": "env(safe-area-inset-top)",
        "safe-bottom": "env(safe-area-inset-bottom)",
      },
      animation: {
        "slide-up": "slide-up 0.22s cubic-bezier(0.32, 0.72, 0, 1)",
        "fade-in": "fade-in 0.15s ease-out",
        "scale-in": "scale-in 0.15s cubic-bezier(0.32, 0.72, 0, 1)",
      },
      keyframes: {
        "slide-up": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
