import { File } from "expo-file-system";
import { AuthUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { AvatarConfig, PersonalizationPreferences, UserProfile } from "@/lib/types";
import { DEFAULT_AVATAR_CONFIG, normalizeAvatarConfig } from "@/lib/avatar";
import { toSupabaseSetupError } from "@/lib/supabase-setup";

const PROFILE_MEDIA_BUCKET = "profile-media";

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_path: string | null;
  avatar_config: AvatarConfig | null;
  personalization: PersonalizationPreferences | null;
  personalization_completed_at: string | null;
};

function displayNameFromUser(user: AuthUser): string {
  const fallbackName = user.name?.trim() || user.email.split("@")[0] || "Parent";
  return fallbackName.length > 0 ? fallbackName : "Parent";
}

function extensionFromUri(uri: string, fallback: string): string {
  const maybeExt = uri.split("?")[0].split(".").pop();
  if (!maybeExt) return fallback;
  const cleaned = maybeExt.toLowerCase();
  if (cleaned.length > 6) return fallback;
  return cleaned;
}

async function createSignedUrlMap(paths: string[]): Promise<Map<string, string>> {
  const uniquePaths = Array.from(new Set(paths.filter(Boolean)));
  if (uniquePaths.length === 0) return new Map();

  const { data, error } = await supabase.storage
    .from(PROFILE_MEDIA_BUCKET)
    .createSignedUrls(uniquePaths, 60 * 60);
  if (error) {
    throw new Error(`Could not create profile image URLs: ${error.message}`);
  }

  const out = new Map<string, string>();
  uniquePaths.forEach((path, index) => {
    const signedUrl = data?.[index]?.signedUrl;
    if (signedUrl) {
      out.set(path, signedUrl);
    }
  });

  return out;
}

function mapProfileRow(row: ProfileRow, signedUrlMap: Map<string, string>): UserProfile {
  return {
    id: row.id,
    fullName: row.full_name ?? "Guardian",
    email: row.email ?? "",
    avatarUrl: row.avatar_path ? signedUrlMap.get(row.avatar_path) ?? null : null,
    avatarConfig: normalizeAvatarConfig(row.avatar_config ?? DEFAULT_AVATAR_CONFIG),
    personalization: row.personalization ?? null,
    personalizationCompletedAt: row.personalization_completed_at
  };
}

export async function ensureProfileRecord(user: AuthUser): Promise<UserProfile> {
  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        full_name: displayNameFromUser(user),
        email: user.email
      },
      { onConflict: "id" }
    )
    .select(
      "id, full_name, email, avatar_path, avatar_config, personalization, personalization_completed_at"
    )
    .single();

  if (error || !data) {
    throw toSupabaseSetupError(
      new Error(`Could not create or update profile: ${error?.message ?? "Unknown error"}`)
    );
  }

  const signedUrlMap = await createSignedUrlMap(data.avatar_path ? [data.avatar_path] : []);
  return mapProfileRow(data, signedUrlMap);
}

export async function getProfile(userId: string): Promise<UserProfile> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, full_name, email, avatar_path, avatar_config, personalization, personalization_completed_at"
    )
    .eq("id", userId)
    .single();

  if (error || !data) {
    throw toSupabaseSetupError(
      new Error(`Could not load profile: ${error?.message ?? "Unknown error"}`)
    );
  }

  const signedUrlMap = await createSignedUrlMap(data.avatar_path ? [data.avatar_path] : []);
  return mapProfileRow(data, signedUrlMap);
}

export async function getProfiles(userIds: string[]): Promise<Map<string, UserProfile>> {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  if (uniqueIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, full_name, email, avatar_path, avatar_config, personalization, personalization_completed_at"
    )
    .in("id", uniqueIds);

  if (error) {
    throw toSupabaseSetupError(new Error(`Could not load profiles: ${error.message}`));
  }

  const signedUrlMap = await createSignedUrlMap((data ?? []).map((row) => row.avatar_path ?? ""));
  return new Map((data ?? []).map((row) => [row.id, mapProfileRow(row, signedUrlMap)]));
}

async function uploadProfileImage(userId: string, uri: string, mimeType?: string): Promise<string> {
  const extension = extensionFromUri(uri, "jpg");
  const path = `${userId}/avatar-${Date.now()}.${extension}`;
  const file = new File(uri);

  const { error } = await supabase.storage.from(PROFILE_MEDIA_BUCKET).upload(path, file, {
    upsert: true,
    contentType: mimeType
  });

  if (error) {
    throw new Error(`Could not upload profile image: ${error.message}`);
  }

  return path;
}

export async function saveProfileAppearance(params: {
  avatarConfig?: AvatarConfig;
  imageUri?: string | null;
  imageMimeType?: string;
  removeImage?: boolean;
}): Promise<UserProfile> {
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user?.id || !user.email) {
    throw new Error("Must be signed in");
  }

  let avatarPath: string | null | undefined;

  if (params.removeImage) {
    avatarPath = null;
  } else if (params.imageUri) {
    avatarPath = await uploadProfileImage(user.id, params.imageUri, params.imageMimeType);
  }

  const updatePayload: Record<string, unknown> = {
    avatar_config: normalizeAvatarConfig(params.avatarConfig ?? DEFAULT_AVATAR_CONFIG)
  };

  if (avatarPath !== undefined) {
    updatePayload.avatar_path = avatarPath;
  }

  const { error } = await supabase.from("profiles").update(updatePayload).eq("id", user.id);
  if (error) {
    throw new Error(`Could not save profile appearance: ${error.message}`);
  }

  return getProfile(user.id);
}

export async function savePersonalization(
  personalization: PersonalizationPreferences
): Promise<void> {
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user?.id) {
    throw new Error("Must be signed in");
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      personalization,
      personalization_completed_at: new Date().toISOString()
    })
    .eq("id", user.id);

  if (error) {
    throw new Error(`Could not save personalization: ${error.message}`);
  }
}
