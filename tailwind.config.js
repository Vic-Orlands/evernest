/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require("nativewind/preset")],
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#F5F0E8",
        warmWhite: "#FAF8F4",
        bark: "#2C1810",
        barkMid: "#4A2E22",
        terracotta: "#C4623A",
        blush: "#E8A090",
        sage: "#7A9E7E",
        sageLight: "#B4CEB6",
        gold: "#D4A843",
        goldLight: "#F0D080",
        night: "#0F0D0B",
        night2: "#1A1612",
        night3: "#241E18",
        night4: "#2E2620",
        moon: "#E8E0D0",
        moonDim: "#8A8070"
      },
      fontFamily: {
        display: ["InstrumentSerif_400Regular"],
        body: ["DMSans_400Regular"],
        bodybold: ["DMSans_500Medium"]
      }
    }
  },
  plugins: []
};
