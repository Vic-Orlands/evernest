type ExpoAVModule = typeof import("expo-av");

let cached: ExpoAVModule | null | undefined;

export function getExpoAV(): ExpoAVModule | null {
  if (cached !== undefined) {
    return cached;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require("expo-av") as ExpoAVModule;
  } catch {
    cached = null;
  }

  return cached;
}

export function isExpoAVAvailable(): boolean {
  return getExpoAV() !== null;
}
