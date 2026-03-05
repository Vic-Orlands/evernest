import * as Linking from "expo-linking";
import Constants from "expo-constants";
import { Platform } from "react-native";

export function buildAuthRedirectUrl(): string {
  // Must match redirect URLs configured in Supabase Auth settings.
  // Force app-scheme redirects on native so Supabase never falls back to localhost URLs.
  if (Platform.OS === "web") {
    return Linking.createURL("/auth/callback");
  }

  const configuredScheme = Constants.expoConfig?.scheme;
  const scheme = Array.isArray(configuredScheme) ? configuredScheme[0] : configuredScheme ?? "evernest";
  return Linking.createURL("/auth/callback", { scheme });
}
