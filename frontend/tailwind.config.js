/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        body: ["Source Sans 3", "Segoe UI", "sans-serif"],
      },
      colors: {
        // Bright pastel theme (keep existing class names, remap tokens)
        // - dark.*: light surfaces / borders
        // - surface.*: ink / text colors
        surface: {
          50: "#0b1020",
          100: "#0f172a",
          200: "#1f2937",
          300: "#334155",
        },
        dark: {
          50: "#94a3b8",  // muted text
          100: "#dbe3f2", // subtle border
          200: "#eef2ff", // elevated surface
          300: "#e8edf7", // surface border
          400: "#f5f7ff", // sidebar surface
          500: "#fbfcff", // app canvas
          600: "#ffffff", // header surface
          700: "#ffffff",
        },
        // fresh blue accent like screenshot
        accent: {
          50: "#eff6ff",
          100: "#dbeafe",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
        },
        danger: {
          400: "#f87171",
          500: "#ef4444",
          600: "#dc2626",
        },
      },
      boxShadow: {
        dark: "0 1px 2px rgba(15, 23, 42, 0.06), 0 8px 24px rgba(15, 23, 42, 0.06)",
        "dark-lg": "0 2px 8px rgba(15, 23, 42, 0.08), 0 18px 52px rgba(15, 23, 42, 0.10)",
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "scale-in": "scaleIn 0.15s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [],
};
