/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#F3F6F5",
        ink: "#16232A",
        muted: "#5B6B70",
        line: "#DCE3E1",
        pine: { DEFAULT: "#0E5A54", dark: "#09403C", soft: "#E3EFEC", 50: "#F0F7F5" },
        marigold: { DEFAULT: "#E7A33E", soft: "#FBF0DC", dark: "#9A6413" },
        danger: { DEFAULT: "#B9412F", soft: "#F8E5E1" },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ['"Instrument Sans"', "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      borderRadius: { panel: "14px" },
    },
  },
  plugins: [],
};
