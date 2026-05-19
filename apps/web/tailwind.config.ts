import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Space Grotesk", "Inter", "sans-serif"],
      },
      colors: {
        // YUNO palette — cinematic dark, warm accents
        ink: {
          950: "#06060a",
          900: "#0a0a12",
          800: "#11111c",
          700: "#1a1a28",
          600: "#262638",
        },
        cream: {
          50: "#fefdf8",
          100: "#fbf8eb",
          200: "#f6efd0",
        },
        accent: {
          // electric coral — single accent, used sparingly
          400: "#ff6e6e",
          500: "#ff4d4d",
          600: "#e63b3b",
        },
        glow: {
          400: "#9aa8ff",
          500: "#6b7cff",
        },
      },
      backgroundImage: {
        "yuno-radial":
          "radial-gradient(120% 80% at 50% 0%, rgba(107,124,255,0.12) 0%, rgba(255,77,77,0.05) 35%, transparent 70%)",
        grain:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.15'/></svg>\")",
      },
      keyframes: {
        pulse: {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        sweep: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(200%)" },
        },
      },
      animation: {
        "pulse-soft": "pulse 2.4s ease-in-out infinite",
        sweep: "sweep 1.6s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
