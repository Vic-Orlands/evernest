import { supabase } from "@/lib/supabase";

type CurrentUser = {
  id: string;
  email?: string;
  name?: string;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

  if (!sessionError && sessionData.session?.user?.id) {
    const user = sessionData.session.user;
    return {
      id: user.id,
      email: user.email,
      name: (user.user_metadata?.name as string | undefined) ?? undefined
    };
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user?.id) {
    return null;
  }

  return {
    id: userData.user.id,
    email: userData.user.email,
    name: (userData.user.user_metadata?.name as string | undefined) ?? undefined
  };
}

export async function requireCurrentUserId(): Promise<string> {
  const user = await getCurrentUser();
  if (!user?.id) {
    throw new Error("Must be signed in");
  }
  return user.id;
}
