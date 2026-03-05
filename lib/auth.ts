import { isSupabaseAuth } from "@/lib/env";
import { supabase } from "@/lib/supabase";
import { betterAuthClient } from "@/lib/better-auth-client";
import { buildAuthRedirectUrl } from "@/lib/auth-redirect";
import { getCurrentUser } from "@/lib/current-user";
import * as Linking from "expo-linking";

export type AuthUser = {
  id: string;
  email: string;
  name?: string;
};

export type SocialProvider = "google" | "apple";

export async function signIn(email: string, password: string): Promise<void> {
  if (isSupabaseAuth) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return;
  }

  await betterAuthClient.signIn(email, password);
}

export async function signInWithSocial(provider: SocialProvider): Promise<void> {
  if (isSupabaseAuth) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: buildAuthRedirectUrl()
      }
    });

    if (error) throw error;
    if (!data?.url) {
      throw new Error("Could not start social sign-in flow.");
    }

    const canOpen = await Linking.canOpenURL(data.url);
    if (!canOpen) {
      throw new Error("Could not open social sign-in page on this device.");
    }

    await Linking.openURL(data.url);
    return;
  }

  throw new Error("Social sign-in for Better Auth is not configured in this app yet.");
}

export async function signUp(name: string, email: string, password: string): Promise<void> {
  if (isSupabaseAuth) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: buildAuthRedirectUrl()
      }
    });
    if (error) throw error;
    return;
  }

  await betterAuthClient.signUp(name, email, password);
}

export async function signOut(): Promise<void> {
  if (isSupabaseAuth) {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return;
  }

  await betterAuthClient.signOut();
}

export async function getSessionUser(): Promise<AuthUser | null> {
  if (isSupabaseAuth) {
    const user = await getCurrentUser();
    if (!user?.email) return null;
    return {
      id: user.id,
      email: user.email,
      name: user.name
    };
  }

  const session = await betterAuthClient.getSession();
  if (!session?.user?.email) return null;
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name
  };
}
