import Constants from "expo-constants";

type ExpoNotificationsModule = typeof import("expo-notifications");

let cached: ExpoNotificationsModule | null | undefined;

export function getExpoNotifications(): ExpoNotificationsModule | null {
  if (cached !== undefined) {
    return cached;
  }

  // Expo Go prints non-actionable warnings for notifications APIs.
  if (Constants.appOwnership === "expo") {
    cached = null;
    return cached;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require("expo-notifications") as ExpoNotificationsModule;
  } catch {
    cached = null;
  }

  return cached;
}

export function isExpoNotificationsAvailable(): boolean {
  return getExpoNotifications() !== null;
}
