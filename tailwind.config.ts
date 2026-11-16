import type { Config } from "tailwindcss";

// The accent color is user-choosable at runtime (see lib/accentColors.ts +
// ThemeContext), so its shades resolve through CSS variables set on
// :root/`document.documentElement.style` instead of fixed hex — this is
// Tailwind's documented pattern for that (variable holds a space-separated
// "R G B" triplet, e.g. "99 102 241", so the alpha modifier in classes like
// `bg-accent-900/30` still works).
function accentShade(cssVar: string) {
  return ({ opacityValue }: { opacityValue?: string }) =>
    opacityValue === undefined ? `rgb(var(${cssVar}))` : `rgb(var(${cssVar}) / ${opacityValue})`;
}

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        // Inter first — a deliberately-chosen, consistent typeface across
        // every platform, rather than whatever system font each OS
        // defaults to. Falls back to the native system stack if the
        // Google Fonts request is ever blocked (offline first load, etc.).
        sans: [
          "'Inter'",
          "-apple-system",
          "BlinkMacSystemFont",
          "'SF Pro Text'",
          "system-ui",
          "sans-serif",
        ],
      },
      colors: {
        accent: {
          DEFAULT: accentShade("--accent-500"),
          50: accentShade("--accent-50"),
          100: accentShade("--accent-100"),
          200: accentShade("--accent-200"),
          300: accentShade("--accent-300"),
          400: accentShade("--accent-400"),
          500: accentShade("--accent-500"),
          600: accentShade("--accent-600"),
          700: accentShade("--accent-700"),
          800: accentShade("--accent-800"),
          900: accentShade("--accent-900"),
        },
        positive: { DEFAULT: "#16A34A", light: "#DCFCE7", dark: "#4ADE80" },
        negative: { DEFAULT: "#E11D48", light: "#FFE4E6", dark: "#FB7185" },
        surface: {
          light: "#FFFFFF",
          "light-subtle": "#F3F4F8",
          dark: "#0D0E14",
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
        "slide-up": "slide-up 0.34s cubic-bezier(0.22, 1, 0.36, 1)",
        "fade-in": "fade-in 0.2s ease-out",
        "scale-in": "scale-in 0.24s cubic-bezier(0.22, 1, 0.36, 1)",
        rise: "rise 0.42s cubic-bezier(0.22, 1, 0.36, 1) both",
        // Exits — `forwards` so the element holds its final frame until
        // React unmounts it a tick later instead of flashing back.
        "fade-out": "fade-out 0.24s ease-out forwards",
        "sheet-out": "sheet-out 0.24s cubic-bezier(0.4, 0, 1, 1) forwards",
        "scale-out": "scale-out 0.2s ease-in forwards",
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
        "fade-out": {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
        "sheet-out": {
          from: { transform: "translateY(0)" },
          to: { transform: "translateY(100%)" },
        },
        "scale-out": {
          from: { opacity: "1", transform: "scale(1)" },
          to: { opacity: "0", transform: "scale(0.96)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.94)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
