/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: {
          50: "#fdfbf7",
          100: "#faf5ec",
          200: "#f3e9d8",
          300: "#ead8bd",
        },
        espresso: {
          50: "#f6f1ed",
          100: "#eadfd6",
          300: "#b99b85",
          500: "#76513b",
          700: "#4a2f22",
          900: "#231710",
        },
        terracotta: {
          50: "#fdf3ef",
          100: "#fbe4da",
          400: "#df7d58",
          500: "#c95d35",
          600: "#a94827",
          700: "#88391f",
        },
        sage: {
          50: "#f2f7f2",
          100: "#e2eee2",
          400: "#6d9a6d",
          500: "#4f7d51",
          600: "#3f6542",
        },
        gold: {
          100: "#fbf0cf",
          400: "#d9ad48",
          500: "#bf8f2f",
        },
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        sans: ["DM Sans", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 18px 50px -24px rgba(35, 23, 16, 0.28)",
        lift: "0 24px 70px -30px rgba(35, 23, 16, 0.42)",
        inset: "inset 0 1px 0 rgba(255,255,255,0.6)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.9)", opacity: "0.6" },
          "80%, 100%": { transform: "scale(1.5)", opacity: "0" },
        },
        steam: {
          "0%": {
            opacity: "0",
            transform: "translateY(8px) scaleY(0.7)",
          },
          "35%": { opacity: "0.9" },
          "100%": {
            opacity: "0",
            transform: "translateY(-18px) scaleY(1.15)",
          },
        },
        "cup-bob": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
        "loader-slide": {
          "0%": { transform: "translateX(-120%)" },
          "100%": { transform: "translateX(320%)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.45s cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-in": "fade-in 0.3s ease-out both",
        "slide-up": "slide-up 0.35s cubic-bezier(0.22, 1, 0.36, 1) both",
        "pulse-ring": "pulse-ring 1.8s ease-out infinite",
        steam: "steam 2.8s ease-in-out infinite",
        "cup-bob": "cup-bob 3.8s ease-in-out infinite",
        "loader-slide":
          "loader-slide 1.5s cubic-bezier(0.45, 0, 0.55, 1) infinite",
      },
    },
  },
  plugins: [],
};
