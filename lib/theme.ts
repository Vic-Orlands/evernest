import { ThemePreference } from "@/lib/types";

export const darkPalette = {
  background: "#0F0D0B",
  backgroundSecondary: "#1A1612",
  backgroundTertiary: "#241E18",
  backgroundElevated: "#2E2620",
  surface: "#241E18",
  surfaceSecondary: "#2E2620",
  surfaceMuted: "rgba(46,38,32,0.40)",
  surfaceSoft: "rgba(46,38,32,0.25)",
  border: "#2E2620",
  borderSoft: "rgba(255,255,255,0.10)",
  text: "#F5F0E8",
  textSecondary: "#E8E0D0",
  textMuted: "#8A8070",
  textSoft: "#B9AE9B",
  brand: "#C4623A",
  brandSecondary: "#E8A090",
  brandBackground: "rgba(196,98,58,0.14)",
  brandGlow: "rgba(196,98,58,0.22)",
  gold: "#D4A843",
  goldLight: "#F0D080",
  goldBackground: "rgba(212,168,67,0.10)",
  sage: "#7A9E7E",
  sageLight: "#B4CEB6",
  sageBackground: "rgba(122,158,126,0.10)",
  blush: "#E8A090",
  navy: "#7CA8D8",
  navyBackground: "rgba(124,168,216,0.14)",
  phoneBackground: "#1A1410",
  phoneBorder: "rgba(255,255,255,0.12)",
  shadow: "0 40px 100px rgba(0,0,0,0.35)",
  danger: "#E85A4F",
  dangerBackground: "rgba(185,64,53,0.14)",
  success: "#7A9E7E",
  overlay: "rgba(0,0,0,0.45)",
  tabBar: "#1A1612",
  tabBarBorder: "rgba(255,255,255,0.08)",
  statusBar: "light" as const,
  grain:
    'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'200\' height=\'200\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'200\' height=\'200\' filter=\'url(%23n)\' opacity=\'0.03\'/%3E%3C/svg%3E")'
} as const;

export const lightPalette = {
  background: "#FAF7F2",
  backgroundSecondary: "#F4F0E8",
  backgroundTertiary: "#EDE8DE",
  backgroundElevated: "#E4DDD2",
  surface: "#FFFFFF",
  surfaceSecondary: "#F7F3EC",
  surfaceMuted: "rgba(255,255,255,0.78)",
  surfaceSoft: "rgba(247,243,236,0.92)",
  border: "rgba(0,0,0,0.07)",
  borderSoft: "rgba(0,0,0,0.12)",
  text: "#1C1610",
  textSecondary: "#3E2F22",
  textMuted: "#7A6A5A",
  textSoft: "#B0A090",
  brand: "#C4622A",
  brandSecondary: "#D07848",
  brandBackground: "rgba(196,98,42,0.09)",
  brandGlow: "rgba(196,98,42,0.2)",
  gold: "#A8882A",
  goldLight: "#C6A54A",
  goldBackground: "rgba(168,136,42,0.09)",
  sage: "#5A8E5A",
  sageLight: "#8FB68F",
  sageBackground: "rgba(90,142,90,0.09)",
  blush: "#C06858",
  navy: "#2A5A8A",
  navyBackground: "rgba(42,90,138,0.09)",
  phoneBackground: "#1A1410",
  phoneBorder: "rgba(0,0,0,0.2)",
  shadow: "0 40px 100px rgba(0,0,0,0.15)",
  danger: "#C4584A",
  dangerBackground: "rgba(196,88,74,0.12)",
  success: "#5A8E5A",
  overlay: "rgba(250,247,242,0.86)",
  tabBar: "#FAF7F2",
  tabBarBorder: "rgba(0,0,0,0.08)",
  statusBar: "dark" as const,
  grain:
    'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'200\' height=\'200\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'200\' height=\'200\' filter=\'url(%23n)\' opacity=\'0.025\'/%3E%3C/svg%3E")'
} as const;

export type AppTheme = {
  [K in keyof typeof darkPalette]: (typeof darkPalette)[K] | (typeof lightPalette)[K];
};

export const gradients = {
  dark: {
    forest: ["#3A2018", "#5A3020"],
    sage: ["#2A3A28", "#3A5035"],
    plum: ["#2C1E38", "#3A2848"],
    amber: ["#3A2810", "#4A3818"],
    ocean: ["#162A3A", "#1E3A50"],
    grape: ["#2A1A30", "#3A2040"]
  },
  light: {
    forest: ["#E6C8B7", "#F5E4DA"],
    sage: ["#D5E2D0", "#EEF5EA"],
    plum: ["#E4D5EA", "#F6EDF9"],
    amber: ["#F1DFC1", "#FAF1DE"],
    ocean: ["#D3E3F2", "#EEF5FB"],
    grape: ["#E7D6E7", "#F7EFF7"]
  }
} as const;

export function resolveTheme(preference: ThemePreference): AppTheme {
  return preference === "light" ? lightPalette : darkPalette;
}

export function resolveGradients(preference: ThemePreference) {
  return preference === "light" ? gradients.light : gradients.dark;
}

export const T = darkPalette;
export const TLight = lightPalette;
