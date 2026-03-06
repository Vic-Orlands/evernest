import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/current-user";

export async function updateAccountProfile(params: {
  fullName: string;
  email?: string;
}): Promise<string> {
  const user = await getCurrentUser();
  if (!user?.id || !user.email) {
    throw new Error("Must be signed in");
  }

  const fullName = params.fullName.trim();
  const email = params.email?.trim().toLowerCase();

  if (fullName.length < 2) {
    throw new Error("Full name must be at least 2 characters.");
  }

  const payload: {
    data: { name: string };
    email?: string;
  } = {
    data: { name: fullName }
  };

  const emailChanged = email && email !== user.email.toLowerCase();
  if (emailChanged) {
    payload.email = email;
  }

  const { error: authError } = await supabase.auth.updateUser(payload);
  if (authError) {
    throw new Error(authError.message);
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      email: emailChanged ? email : user.email
    })
    .eq("id", user.id);

  if (profileError) {
    throw new Error(profileError.message);
  }

  return emailChanged
    ? "Profile saved. Confirm the email change from your inbox to finish updating your email address."
    : "Profile saved.";
}

export async function updateAccountPassword(password: string): Promise<void> {
  const nextPassword = password.trim();
  if (nextPassword.length < 10) {
    throw new Error("Use at least 10 characters for a stronger password.");
  }

  const { error } = await supabase.auth.updateUser({
    password: nextPassword
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function requestDeleteAccount(): Promise<void> {
  const { error } = await supabase.functions.invoke("delete-account", {
    body: {}
  });

  if (error) {
    throw new Error(error.message || "Could not delete account.");
  }
}
