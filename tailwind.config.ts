import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#0B6E6B",
          purple: "#A14A1A",
          indigo: "#1F3A5F",
          green: "#0E9F6E",
        },
        surface: {
          DEFAULT: "#F6F1E8",
          card: "#FFFFFF",
          muted: "#ECE4D8",
        },
      },
      fontFamily: {
        sans: ["'Sora'", "sans-serif"],
        display: ["'Fraunces'", "serif"],
      },
      backgroundImage: {
        "hero-gradient": "linear-gradient(150deg,#f6f1e8 0%,#ebe6de 52%,#dce9e6 100%)",
        "banner-gradient": "linear-gradient(120deg,#1f3a5f 0%,#0b6e6b 55%,#a14a1a 100%)",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp: { "0%": { opacity: "0", transform: "translateY(12px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        orbPulse: {
          "0%, 100%": { transform: "scale(1)", opacity: "0.7" },
          "50%": { transform: "scale(1.08)", opacity: "1" },
        },
        orbSpeak: {
          "0%": { transform: "scale(1)", boxShadow: "0 0 0 0 rgba(161,74,26,0.45)" },
          "50%": { transform: "scale(1.12)", boxShadow: "0 0 0 12px rgba(161,74,26,0)" },
          "100%": { transform: "scale(1)", boxShadow: "0 0 0 0 rgba(161,74,26,0)" },
        },
        orbListen: {
          "0%": { transform: "scale(1)", boxShadow: "0 0 0 0 rgba(14,159,110,0.4)" },
          "50%": { transform: "scale(1.06)", boxShadow: "0 0 0 10px rgba(14,159,110,0)" },
          "100%": { transform: "scale(1)", boxShadow: "0 0 0 0 rgba(14,159,110,0)" },
        },
        slideInLeft: {
          "0%": { opacity: "0", transform: "translateX(-16px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(16px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        fieldFlash: {
          "0%": { boxShadow: "0 0 0 0 rgba(11,110,107,0.5)" },
          "50%": { boxShadow: "0 0 0 4px rgba(11,110,107,0.25)" },
          "100%": { boxShadow: "0 0 0 0 rgba(11,110,107,0)" },
        },
        thinkingBounce: {
          "0%, 80%, 100%": { transform: "translateY(0)" },
          "40%": { transform: "translateY(-6px)" },
        },
        confettiBurst: {
          "0%": { transform: "scale(0)", opacity: "1" },
          "50%": { transform: "scale(1.2)", opacity: "0.8" },
          "100%": { transform: "scale(1.5)", opacity: "0" },
        },
        typewriterCursor: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        celebrateCheck: {
          "0%": { transform: "scale(0) rotate(-45deg)", opacity: "0" },
          "60%": { transform: "scale(1.2) rotate(0deg)", opacity: "1" },
          "100%": { transform: "scale(1) rotate(0deg)", opacity: "1" },
        },
        calmDrift: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-4px)" },
        },
        softShimmer: {
          "0%": { backgroundPosition: "-120% 0" },
          "100%": { backgroundPosition: "120% 0" },
        },
        calmRipple: {
          "0%": { transform: "scale(0.95)", opacity: "0.6" },
          "70%": { transform: "scale(1.1)", opacity: "0.15" },
          "100%": { transform: "scale(1.2)", opacity: "0" },
        },
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.35s ease-out",
        "orb-pulse": "orbPulse 2.5s ease-in-out infinite",
        "orb-speak": "orbSpeak 1.2s ease-in-out infinite",
        "orb-listen": "orbListen 1.5s ease-in-out infinite",
        "slide-in-left": "slideInLeft 0.35s ease-out",
        "slide-in-right": "slideInRight 0.35s ease-out",
        "field-flash": "fieldFlash 0.8s ease-out",
        "thinking-bounce": "thinkingBounce 1.4s ease-in-out infinite",
        "confetti-burst": "confettiBurst 0.6s ease-out forwards",
        "typewriter-cursor": "typewriterCursor 0.8s step-end infinite",
        "celebrate-check": "celebrateCheck 0.5s ease-out forwards",
        "calm-drift": "calmDrift 3.6s ease-in-out infinite",
        "soft-shimmer": "softShimmer 2s linear infinite",
        "calm-ripple": "calmRipple 1.6s ease-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
