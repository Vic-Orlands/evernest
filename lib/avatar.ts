import {
  AvatarBackgroundId,
  AvatarConfig,
  AvatarHairColorId,
  AvatarHairStyleId,
  AvatarSkinToneId
} from "@/lib/types";

export const SKIN_TONES = [
  { id: "s1", base: "#FDDBB4", shadow: "#E8B87A", highlight: "#FFE8C8" },
  { id: "s2", base: "#F0C08A", shadow: "#D4965A", highlight: "#F8D4A0" },
  { id: "s3", base: "#D4926A", shadow: "#B87040", highlight: "#E4A880" },
  { id: "s4", base: "#A0622A", shadow: "#804010", highlight: "#B87840" },
  { id: "s5", base: "#7A4020", shadow: "#5A2808", highlight: "#8A5030" },
  { id: "s6", base: "#3A1A08", shadow: "#200800", highlight: "#4A2818" }
] as const;

export const HAIR_COLORS = [
  { id: "h1", color: "#1A0A00", label: "Black" },
  { id: "h2", color: "#3A1A00", label: "Dark Brown" },
  { id: "h3", color: "#6A3A10", label: "Brown" },
  { id: "h4", color: "#C4722A", label: "Auburn" },
  { id: "h5", color: "#D4A030", label: "Blonde" },
  { id: "h6", color: "#C8C8C8", label: "Grey" },
  { id: "h7", color: "#E8E0D8", label: "White" },
  { id: "h8", color: "#C4623A", label: "Red" }
] as const;

export const HAIR_STYLES = [
  { id: "short", label: "Short" },
  { id: "medium", label: "Medium" },
  { id: "long", label: "Long" },
  { id: "curly", label: "Curly" },
  { id: "bun", label: "Bun" },
  { id: "buzz", label: "Buzz" }
] as const;

export const BG_PRESETS = [
  { id: "tc", a: "#C4623A", b: "#E8A090" },
  { id: "sage", a: "#7A9E7E", b: "#B4CEB6" },
  { id: "gold", a: "#D4A843", b: "#F0D080" },
  { id: "blue", a: "#4A7AB0", b: "#A0C4FF" },
  { id: "plum", a: "#7A4A8A", b: "#C084FC" },
  { id: "night", a: "#2E2620", b: "#5A4A3A" }
] as const;

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  skinToneId: "s3",
  hairColorId: "h2",
  hairStyleId: "medium",
  backgroundId: "tc"
};

export function getSkinTone(id: AvatarSkinToneId) {
  return SKIN_TONES.find((item) => item.id === id) ?? SKIN_TONES[2];
}

export function getHairColor(id: AvatarHairColorId) {
  return HAIR_COLORS.find((item) => item.id === id) ?? HAIR_COLORS[1];
}

export function getHairStyle(id: AvatarHairStyleId) {
  return HAIR_STYLES.find((item) => item.id === id) ?? HAIR_STYLES[1];
}

export function getBackgroundPreset(id: AvatarBackgroundId) {
  return BG_PRESETS.find((item) => item.id === id) ?? BG_PRESETS[0];
}

export function normalizeAvatarConfig(
  value: Partial<AvatarConfig> | null | undefined
): AvatarConfig {
  return {
    skinToneId: getSkinTone((value?.skinToneId as AvatarSkinToneId) ?? DEFAULT_AVATAR_CONFIG.skinToneId).id,
    hairColorId: getHairColor((value?.hairColorId as AvatarHairColorId) ?? DEFAULT_AVATAR_CONFIG.hairColorId).id,
    hairStyleId: getHairStyle((value?.hairStyleId as AvatarHairStyleId) ?? DEFAULT_AVATAR_CONFIG.hairStyleId).id,
    backgroundId: getBackgroundPreset(
      (value?.backgroundId as AvatarBackgroundId) ?? DEFAULT_AVATAR_CONFIG.backgroundId
    ).id
  };
}
