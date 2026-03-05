import { supabase } from "@/lib/supabase";
import { createCapsuleSchema, createMemorySchema, commentSchema, reactionSchema, reminderRuleSchema } from "@/lib/validation";
import { Capsule, ExportJob, MemoryComment, MemoryDetails, MemoryItem, MemoryReaction, ReminderRule } from "@/lib/types";

type CreateMemoryInput = {
  familyId: string;
  childId: string;
  title: string;
  note: string;
  mediaType: "image" | "video" | "voice";
  mediaUri: string;
  mediaMimeType?: string;
  voiceNoteUri?: string;
  tags: string[];
  capturedAt: string;
};

type CreateCapsuleInput = {
  familyId: string;
  childId: string;
  title: string;
  recipientEmail: string;
  releaseAt: string;
  memoryIds: string[];
};

function extensionFromUri(uri: string, fallback: string): string {
  const maybeExt = uri.split("?")[0].split(".").pop();
  if (!maybeExt) return fallback;
  const cleaned = maybeExt.toLowerCase();
  if (cleaned.length > 6) return fallback;
  return cleaned;
}

async function uploadPrivateFile(path: string, uri: string, mimeType?: string): Promise<void> {
  const response = await fetch(uri);
  const blob = await response.blob();

  const { error } = await supabase.storage.from("memory-media").upload(path, blob, {
    upsert: false,
    contentType: mimeType
  });

  if (error) {
    throw new Error(`Could not upload media: ${error.message}`);
  }
}

async function createSignedUrlMap(paths: string[]): Promise<Map<string, string>> {
  const uniquePaths = Array.from(new Set(paths.filter(Boolean)));
  if (uniquePaths.length === 0) return new Map();

  const { data, error } = await supabase.storage.from("memory-media").createSignedUrls(uniquePaths, 60 * 60);
  if (error) {
    throw new Error(`Could not create media URLs: ${error.message}`);
  }

  const out = new Map<string, string>();
  uniquePaths.forEach((path, index) => {
    const signed = data?.[index]?.signedUrl;
    if (signed) {
      out.set(path, signed);
    }
  });

  return out;
}

async function getProfileNameMap(userIds: string[]): Promise<Map<string, string>> {
  const unique = Array.from(new Set(userIds));
  if (unique.length === 0) return new Map();

  const { data, error } = await supabase.from("profiles").select("id, full_name").in("id", unique);
  if (error) {
    throw new Error(`Could not load profile names: ${error.message}`);
  }

  return new Map((data ?? []).map((row) => [row.id, row.full_name ?? "Parent"]));
}

function mapMemoryRows(
  rows: any[],
  signedUrlMap: Map<string, string>,
  profileNameMap: Map<string, string>
): MemoryItem[] {
  return rows.map((row) => {
    const tags = (row.memory_tags ?? []).map((tagRow: { tag: string }) => tagRow.tag);
    const commentsCount = (row.memory_comments ?? []).length;
    const reactionsCount = (row.memory_reactions ?? []).length;

    return {
      id: row.id,
      childId: row.child_id,
      title: row.title,
      note: row.note,
      mediaType: row.media_type,
      mediaUrl: signedUrlMap.get(row.media_path) ?? "",
      voiceNoteUrl: row.voice_note_path ? signedUrlMap.get(row.voice_note_path) ?? null : null,
      capturedAt: row.captured_at,
      createdById: row.created_by,
      createdByName: profileNameMap.get(row.created_by) ?? "Parent",
      tags,
      reactionsCount,
      commentsCount
    };
  });
}

export async function listMemories(familyId: string, childId: string): Promise<MemoryItem[]> {
  const { data, error } = await supabase
    .from("memories")
    .select(
      "id, child_id, title, note, media_type, media_path, voice_note_path, captured_at, created_by, memory_tags(tag), memory_comments(id), memory_reactions(user_id)"
    )
    .eq("family_id", familyId)
    .eq("child_id", childId)
    .order("captured_at", { ascending: false })
    .limit(300);

  if (error) throw new Error(`Could not list memories: ${error.message}`);

  const rows = data ?? [];
  const signedUrlMap = await createSignedUrlMap(rows.flatMap((row) => [row.media_path, row.voice_note_path]));
  const profileNameMap = await getProfileNameMap(rows.map((row) => row.created_by));

  return mapMemoryRows(rows, signedUrlMap, profileNameMap);
}

export async function getMemoryDetails(memoryId: string): Promise<MemoryDetails> {
  const { data: memoryRows, error: memoryError } = await supabase
    .from("memories")
    .select(
      "id, child_id, title, note, media_type, media_path, voice_note_path, captured_at, created_by, family_id, memory_tags(tag), memory_comments(id), memory_reactions(user_id)"
    )
    .eq("id", memoryId)
    .limit(1);

  if (memoryError) throw new Error(`Could not fetch memory: ${memoryError.message}`);

  const row = memoryRows?.[0];
  if (!row) throw new Error("Memory not found");

  const signedUrlMap = await createSignedUrlMap([row.media_path, row.voice_note_path]);
  const profileNameMap = await getProfileNameMap([row.created_by]);

  const memory = mapMemoryRows([row], signedUrlMap, profileNameMap)[0];

  const { data: commentsRows, error: commentsError } = await supabase
    .from("memory_comments")
    .select("id, user_id, body, created_at")
    .eq("memory_id", memoryId)
    .order("created_at", { ascending: true });

  if (commentsError) throw new Error(`Could not list comments: ${commentsError.message}`);

  const { data: reactionRows, error: reactionsError } = await supabase
    .from("memory_reactions")
    .select("user_id, emoji")
    .eq("memory_id", memoryId)
    .order("created_at", { ascending: true });

  if (reactionsError) throw new Error(`Could not list reactions: ${reactionsError.message}`);

  const involvedUserIds = Array.from(
    new Set([...(commentsRows ?? []).map((row) => row.user_id), ...(reactionRows ?? []).map((row) => row.user_id)])
  );
  const names = await getProfileNameMap(involvedUserIds);

  const comments: MemoryComment[] = (commentsRows ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    userName: names.get(row.user_id) ?? "Parent",
    body: row.body,
    createdAt: row.created_at
  }));

  const reactions: MemoryReaction[] = (reactionRows ?? []).map((row) => ({
    userId: row.user_id,
    userName: names.get(row.user_id) ?? "Parent",
    emoji: row.emoji
  }));

  return { memory, comments, reactions };
}

export async function createMemory(input: CreateMemoryInput): Promise<string> {
  const validated = createMemorySchema.parse({
    familyId: input.familyId,
    childId: input.childId,
    title: input.title,
    note: input.note,
    tags: input.tags,
    mediaType: input.mediaType,
    capturedAt: input.capturedAt
  });

  const { data: authUser, error: authError } = await supabase.auth.getUser();
  if (authError || !authUser.user) {
    throw new Error("Must be signed in");
  }

  const memoryId = crypto.randomUUID();
  const mediaExt = extensionFromUri(input.mediaUri, input.mediaType === "video" ? "mp4" : "jpg");
  const mediaPath = `${validated.familyId}/${validated.childId}/${memoryId}-main.${mediaExt}`;

  await uploadPrivateFile(mediaPath, input.mediaUri, input.mediaMimeType);

  let voicePath: string | null = null;
  if (input.voiceNoteUri) {
    const voiceExt = extensionFromUri(input.voiceNoteUri, "m4a");
    voicePath = `${validated.familyId}/${validated.childId}/${memoryId}-voice.${voiceExt}`;
    await uploadPrivateFile(voicePath, input.voiceNoteUri, "audio/m4a");
  }

  const { error: insertError } = await supabase.from("memories").insert({
    id: memoryId,
    family_id: validated.familyId,
    child_id: validated.childId,
    title: validated.title,
    note: validated.note,
    media_type: validated.mediaType,
    media_path: mediaPath,
    voice_note_path: voicePath,
    captured_at: validated.capturedAt,
    created_by: authUser.user.id
  });

  if (insertError) {
    throw new Error(`Could not create memory: ${insertError.message}`);
  }

  const cleanedTags = Array.from(new Set(validated.tags.map((tag) => tag.toLowerCase())));
  if (cleanedTags.length > 0) {
    const tagRows = cleanedTags.map((tag) => ({ memory_id: memoryId, tag }));
    const { error: tagsError } = await supabase.from("memory_tags").insert(tagRows);
    if (tagsError) {
      throw new Error(`Could not save tags: ${tagsError.message}`);
    }
  }

  return memoryId;
}

export async function addComment(memoryId: string, body: string): Promise<void> {
  const payload = commentSchema.parse({ memoryId, body });
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) throw new Error("Must be signed in");

  const { error: insertError } = await supabase.from("memory_comments").insert({
    memory_id: payload.memoryId,
    user_id: data.user.id,
    body: payload.body
  });

  if (insertError) {
    throw new Error(`Could not add comment: ${insertError.message}`);
  }
}

export async function setReaction(memoryId: string, emoji: string): Promise<void> {
  const payload = reactionSchema.parse({ memoryId, emoji });
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) throw new Error("Must be signed in");

  const { error: upsertError } = await supabase.from("memory_reactions").upsert(
    {
      memory_id: payload.memoryId,
      user_id: data.user.id,
      emoji: payload.emoji
    },
    { onConflict: "memory_id,user_id" }
  );

  if (upsertError) {
    throw new Error(`Could not set reaction: ${upsertError.message}`);
  }
}

export async function listOnThisDay(familyId: string, childId: string): Promise<MemoryItem[]> {
  const all = await listMemories(familyId, childId);
  const now = new Date();
  const month = now.getMonth();
  const day = now.getDate();
  const currentYear = now.getFullYear();

  return all
    .filter((item) => {
      const date = new Date(item.capturedAt);
      return date.getMonth() === month && date.getDate() === day && date.getFullYear() < currentYear;
    })
    .slice(0, 12);
}

export async function listCapsules(familyId: string, childId: string): Promise<Capsule[]> {
  const { data, error } = await supabase
    .from("capsules")
    .select("id, child_id, recipient_email, release_at, title, status")
    .eq("family_id", familyId)
    .eq("child_id", childId)
    .order("release_at", { ascending: true });

  if (error) {
    throw new Error(`Could not load capsules: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    childId: row.child_id,
    recipientEmail: row.recipient_email,
    releaseAt: row.release_at,
    title: row.title,
    status: row.status
  }));
}

export async function createCapsule(input: CreateCapsuleInput): Promise<void> {
  const payload = createCapsuleSchema.parse(input);
  const { data: authUser, error: authError } = await supabase.auth.getUser();

  if (authError || !authUser.user) throw new Error("Must be signed in");

  const { data: capsule, error } = await supabase
    .from("capsules")
    .insert({
      family_id: payload.familyId,
      child_id: payload.childId,
      title: payload.title,
      recipient_email: payload.recipientEmail,
      release_at: payload.releaseAt,
      created_by: authUser.user.id
    })
    .select("id")
    .single();

  if (error || !capsule) {
    throw new Error(`Could not create capsule: ${error?.message ?? "Unknown"}`);
  }

  const links = payload.memoryIds.map((memoryId) => ({
    capsule_id: capsule.id,
    memory_id: memoryId
  }));

  const { error: linkError } = await supabase.from("capsule_memories").insert(links);
  if (linkError) {
    throw new Error(`Could not attach memories: ${linkError.message}`);
  }
}

export async function getReminderRule(familyId: string): Promise<ReminderRule | null> {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return null;

  const { data, error } = await supabase
    .from("reminder_rules")
    .select("id, user_id, family_id, timezone, hour, minute, enabled")
    .eq("family_id", familyId)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load reminder rule: ${error.message}`);
  }

  if (!data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    familyId: data.family_id,
    timezone: data.timezone,
    hour: data.hour,
    minute: data.minute,
    enabled: data.enabled
  };
}

export async function saveReminderRule(params: {
  familyId: string;
  hour: number;
  minute: number;
  timezone: string;
  enabled: boolean;
}): Promise<void> {
  const payload = reminderRuleSchema.parse(params);
  const { data: auth, error: authError } = await supabase.auth.getUser();

  if (authError || !auth.user) throw new Error("Must be signed in");

  const { error } = await supabase.from("reminder_rules").upsert(
    {
      user_id: auth.user.id,
      family_id: payload.familyId,
      timezone: payload.timezone,
      hour: payload.hour,
      minute: payload.minute,
      enabled: payload.enabled
    },
    { onConflict: "user_id,family_id" }
  );

  if (error) {
    throw new Error(`Could not save reminder rule: ${error.message}`);
  }
}

export async function completeMilestone(milestoneId: string, memoryId: string): Promise<void> {
  const { error } = await supabase
    .from("milestones")
    .update({ completed_memory_id: memoryId })
    .eq("id", milestoneId);

  if (error) {
    throw new Error(`Could not complete milestone: ${error.message}`);
  }
}

export async function queueExportJob(familyId: string, target: "google_drive" | "icloud" | "download", format = "zip"): Promise<void> {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error("Must be signed in");

  const { error } = await supabase.from("exports").insert({
    family_id: familyId,
    requested_by: auth.user.id,
    target,
    format,
    status: "queued"
  });

  if (error) {
    throw new Error(`Could not queue export: ${error.message}`);
  }
}

export async function listExportJobs(familyId: string): Promise<ExportJob[]> {
  const { data, error } = await supabase
    .from("exports")
    .select("id, target, format, status, created_at, result_url, error_message")
    .eq("family_id", familyId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    throw new Error(`Could not load exports: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    target: row.target,
    format: row.format,
    status: row.status,
    createdAt: row.created_at,
    resultUrl: row.result_url,
    errorMessage: row.error_message
  }));
}
