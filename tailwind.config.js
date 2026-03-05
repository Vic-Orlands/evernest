/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require("nativewind/preset")],
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: {
          light: "#F4F2ED",
          dark: "#0B0E14"
        },
        ink: {
          light: "#1F2328",
          dark: "#E9ECF3"
        },
        amber: "#E8B15D",
        moss: "#8FA77A"
      },
      fontFamily: {
        display: ["PlayfairDisplay_700Bold"],
        body: ["Manrope_500Medium"],
        bodybold: ["Manrope_700Bold"]
      }
    }
  },
  plugins: []
};
