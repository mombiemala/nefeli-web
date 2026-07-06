import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Luminary palette — deep night, gold, warm cream
        night: {
          DEFAULT: "#0D1117",
          plum: "#1A0B2E",
          800: "#161226",
          700: "#211A38",
          600: "#2E2547",
        },
        gold: {
          DEFAULT: "#C9A84C",
          soft: "#D9BE6E",
          deep: "#A8862F",
        },
        cream: {
          DEFAULT: "#F5E6C0",
          muted: "#C9BFA6",
          dim: "#8B8371",
        },
      },
      fontFamily: {
        serif: ["var(--font-playfair)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "night-radial":
          "radial-gradient(ellipse at top, #1A0B2E 0%, #0D1117 60%)",
        "gold-shimmer":
          "linear-gradient(120deg, #A8862F 0%, #C9A84C 40%, #F5E6C0 50%, #C9A84C 60%, #A8862F 100%)",
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
        glow: "0 0 20px rgba(201, 168, 76, 0.25)",
      },
      keyframes: {
        twinkle: {
          "0%, 100%": { opacity: "0.2" },
          "50%": { opacity: "0.9" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "spin-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
      animation: {
        twinkle: "twinkle 4s ease-in-out infinite",
        "fade-up": "fade-up 0.6s ease-out forwards",
        "spin-slow": "spin-slow 120s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
