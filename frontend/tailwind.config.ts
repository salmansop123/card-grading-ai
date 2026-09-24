import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        "card-bg": "#FAFAFA",
        "card-surface": "#FFFFFF",
        "card-surface-2": "#F5F3FF",
        "card-gold": "#7C3AED",
        "card-gold-dark": "#6D28D9",
        "card-red": "#FF3B5C",
        "card-blue": "#1A73E8",
        "card-purple": "#6D28D9",
        "card-teal": "#00C9B1",
        "card-green": "#22C55E",
        "card-orange": "#FF6B35",
        "card-yellow": "#FFD600",
        "card-pink": "#FF6EB4",
        "card-text": "#1A1A2E",
        "card-text-muted": "#6B7280",
        "card-text-light": "#9CA3AF",
        "card-border": "#E5E7EB",
        "card-border-gold": "#F5A623",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-20px)" },
        },
        shimmer: {
          "0%": { left: "-100%" },
          "100%": { left: "100%" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(245, 166, 35, 0.3)" },
          "50%": { boxShadow: "0 0 40px rgba(139, 92, 246, 0.4)" },
        },
        "card-spin": {
          "0%": { transform: "rotateY(0deg)" },
          "100%": { transform: "rotateY(360deg)" },
        },
        "slide-up": {
          "0%": { transform: "translateY(40px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "drift-left": {
          "0%, 100%": { transform: "translateX(0)" },
          "50%": { transform: "translateX(-30px)" },
        },
        "drift-right": {
          "0%, 100%": { transform: "translateX(0)" },
          "50%": { transform: "translateX(30px)" },
        },
        sparkle: {
          "0%, 100%": { transform: "scale(0)", opacity: "0" },
          "50%": { transform: "scale(1)", opacity: "1" },
        },
        ticker: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        twinkle: {
          "0%, 100%": { opacity: "0.2" },
          "50%": { opacity: "1" },
        },
        "bounce-slow": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-15px)" },
        },
        wiggle: {
          "0%, 100%": { transform: "rotate(-5deg)" },
          "50%": { transform: "rotate(5deg)" },
        },
        "pokemon-walk": {
          "0%": { transform: "translateX(-120vw)" },
          "100%": { transform: "translateX(120vw)" },
        },
        "pokemon-walk-reverse": {
          "0%": { transform: "translateX(120vw)" },
          "100%": { transform: "translateX(-120vw)" },
        },
        "float-rotate": {
          "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
          "50%": { transform: "translateY(-20px) rotate(10deg)" },
        },
        "pop-in": {
          "0%": { transform: "scale(0)", opacity: "0" },
          "70%": { transform: "scale(1.1)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "energy-pulse": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.05)" },
        },
        "confetti-fall": {
          "0%": { transform: "translateY(-100px) rotate(0deg)", opacity: "1" },
          "100%": { transform: "translateY(100vh) rotate(720deg)", opacity: "0" },
        },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        shimmer: "shimmer 2.5s ease-in-out",
        "glow-pulse": "glow-pulse 3s ease-in-out infinite",
        "card-spin": "card-spin 8s linear infinite",
        "slide-up": "slide-up 0.6s ease-out forwards",
        "drift-left": "drift-left 7s ease-in-out infinite",
        "drift-right": "drift-right 9s ease-in-out infinite",
        sparkle: "sparkle 2s infinite",
        ticker: "ticker 35s linear infinite",
        twinkle: "twinkle 3s ease-in-out infinite",
        "bounce-slow": "bounce-slow 4s ease-in-out infinite",
        wiggle: "wiggle 2s ease-in-out infinite",
        "pokemon-walk": "pokemon-walk 18s linear infinite",
        "pokemon-walk-12": "pokemon-walk 12s linear infinite",
        "pokemon-walk-16": "pokemon-walk-reverse 16s linear infinite",
        "pokemon-walk-20": "pokemon-walk 20s linear infinite",
        "pokemon-walk-reverse": "pokemon-walk-reverse 22s linear infinite",
        "float-rotate": "float-rotate 5s ease-in-out infinite",
        "pop-in": "pop-in 0.4s ease-out forwards",
        "energy-pulse": "energy-pulse 2s ease-in-out infinite",
        "confetti-fall": "confetti-fall 4s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
