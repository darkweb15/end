import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
    },
    extend: {
      colors: {
        background: "#0B0F19",
        surface: "#111827",
        "surface-2": "#161F2E",
        border: "#1F2937",
        muted: "#1A2233",
        "muted-foreground": "#94A3B8",
        foreground: "#E6EDF7",
        primary: {
          DEFAULT: "#7C5CFF",
          foreground: "#FFFFFF",
          soft: "rgba(124,92,255,0.12)",
        },
        accent: {
          cyan: "#22D3EE",
          emerald: "#34D399",
          amber: "#F59E0B",
          rose: "#F472B6",
        },
      },
      borderRadius: {
        xl: "14px",
        "2xl": "18px",
      },
      boxShadow: {
        card: "0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 24px rgba(0,0,0,0.35)",
        glow: "0 0 40px rgba(124,92,255,0.25)",
      },
      backgroundImage: {
        "gradient-violet": "linear-gradient(135deg, #7C5CFF 0%, #22D3EE 100%)",
        "gradient-ember": "linear-gradient(135deg, #F472B6 0%, #F59E0B 100%)",
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      keyframes: {
        "pulse-soft": {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
      },
      animation: {
        "pulse-soft": "pulse-soft 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
