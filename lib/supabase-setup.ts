export function isSupabaseSchemaMissingError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();

  return (
    message.includes("schema cache") ||
    message.includes("could not find the table") ||
    (message.includes("relation") && message.includes("does not exist")) ||
    message.includes("public.profiles") ||
    message.includes("public.families") ||
    message.includes("public.family_members") ||
    message.includes("public.children") ||
    message.includes("public.memories") ||
    message.includes("public.milestones")
  );
}

export function isSupabaseProfilesPolicyError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();

  return (
    message.includes("permission denied") && message.includes("profiles")
  );
}

export function toSupabaseSetupError(error: unknown): Error {
  if (isSupabaseSchemaMissingError(error)) {
    return new Error(
      "Supabase schema is missing. Apply supabase/sql/001_init.sql, 002_security_and_collab.sql, 003_exports_storage.sql, 004_profiles_family_read.sql, and 005_families_owner_read.sql to your Supabase project."
        + " Then apply supabase/sql/006_profile_appearance.sql for avatars and personalization."
    );
  }

  if (isSupabaseProfilesPolicyError(error)) {
    return new Error(
      "Supabase profile read policy is too restrictive. Apply the latest SQL migration to allow family members to read collaborator profile names."
    );
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error("Supabase setup is incomplete.");
}
