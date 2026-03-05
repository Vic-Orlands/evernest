import { isSupabaseAuth } from "@/lib/env";
import { supabase } from "@/lib/supabase";
import { betterAuthClient } from "@/lib/better-auth-client";
import { buildAuthRedirectUrl } from "@/lib/auth-redirect";

export type AuthUser = {
  id: string;
  email: string;
  name?: string;
};

export async function signIn(email: string, password: string): Promise<void> {
  if (isSupabaseAuth) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return;
  }

  await betterAuthClient.signIn(email, password);
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
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user?.email) return null;
    return {
      id: data.user.id,
      email: data.user.email,
      name: (data.user.user_metadata?.name as string | undefined) ?? undefined
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
