import * as Linking from "expo-linking";

export function buildAuthRedirectUrl(): string {
  // Must match redirect URLs configured in Supabase Auth settings.
  return Linking.createURL("/auth/callback");
}
