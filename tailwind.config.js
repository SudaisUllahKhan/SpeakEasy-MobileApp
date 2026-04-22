/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./lib/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#7C3AED",
        "primary-light": "#A78BFA",
        "primary-dark": "#5B21B6",
        accent: "#F97316",
        success: "#22C55E",
        danger: "#EF4444",
        warning: "#F59E0B",
        bg: "#FAF8FF",
        surface: "#FFFFFF",
        border: "#E9D5FF",
        text: "#1A0533",
        "text-secondary": "#6B7280",
        muted: "#9CA3AF",
      },
      fontFamily: {
        sans: ["System"],
      },
    },
  },
  plugins: [],
};
