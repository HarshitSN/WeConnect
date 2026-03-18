import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: { blue: "#2563EB", purple: "#7C3AED", indigo: "#4F46E5", green: "#059669" },
        surface: { DEFAULT: "#F8FAFC", card: "#FFFFFF", muted: "#F1F5F9" },
      },
      fontFamily: {
        sans: ["'DM Sans'", "sans-serif"],
        display: ["'Bricolage Grotesque'", "sans-serif"],
      },
      backgroundImage: {
        "hero-gradient": "linear-gradient(135deg,#EEF2FF 0%,#F0F9FF 50%,#FAF5FF 100%)",
        "banner-gradient": "linear-gradient(135deg,#4F46E5 0%,#7C3AED 50%,#A855F7 100%)",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp: { "0%": { opacity: "0", transform: "translateY(12px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
      },
      animation: { "fade-in": "fadeIn 0.4s ease-out", "slide-up": "slideUp 0.35s ease-out" },
    },
  },
  plugins: [],
};
export default config;
