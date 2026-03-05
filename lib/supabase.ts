import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import * as SecureStore from "expo-secure-store";

if (!env.EXPO_PUBLIC_SUPABASE_URL || !env.EXPO_PUBLIC_SUPABASE_KEY) {
  console.warn("Supabase env vars are missing. Auth and data calls will fail until configured.");
}

export const supabase = createClient(
  env.EXPO_PUBLIC_SUPABASE_URL ?? "https://invalid.local",
  env.EXPO_PUBLIC_SUPABASE_KEY ?? "invalid-anon-key",
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      storage: {
        getItem: (key) => SecureStore.getItemAsync(key),
        setItem: (key, value) => SecureStore.setItemAsync(key, value),
        removeItem: (key) => SecureStore.deleteItemAsync(key)
      }
    },
    global: {
      headers: {
        "X-Client-Info": "evernest-mobile"
      }
    }
  }
);
