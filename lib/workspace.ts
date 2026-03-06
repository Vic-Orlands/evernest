import { supabase } from "@/lib/supabase";
import { AuthUser } from "@/lib/auth";
import { ChildProfile, FamilyActivityItem, FamilyMember, Milestone, Role, Workspace } from "@/lib/types";
import { isSupabaseProfilesPolicyError, isSupabaseSchemaMissingError, toSupabaseSetupError } from "@/lib/supabase-setup";
import { ensureProfileRecord, getProfiles } from "@/lib/profile";

const DEFAULT_MILESTONES = [
  { key: "first_word", label: "First word" },
  { key: "first_steps", label: "First steps" },
  { key: "first_day_school", label: "First day at school" },
  { key: "favorite_song", label: "Favorite song phase" },
  { key: "birthday_highlight", label: "Birthday highlight" }
] as const;

function titleCaseName(raw: string | undefined): string {
  if (!raw) return "My Child";
  const cleaned = raw.trim();
  return cleaned.length > 0 ? cleaned : "My Child";
}

function isRecoverableWorkspaceError(error: unknown): boolean {
  if (isSupabaseSchemaMissingError(error) || isSupabaseProfilesPolicyError(error)) {
    return false;
  }

  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("could not load children") ||
    message.includes("could not create child profile") ||
    message.includes("could not load family membership") ||
    message.includes("could not load family details") ||
    message.includes("could not load owned family") ||
    message.includes("foreign key") ||
    message.includes("violates row-level security")
  );
}

async function ensureDefaultMilestones(childId: string): Promise<void> {
  const { data: existing, error } = await supabase
    .from("milestones")
    .select("id")
    .eq("child_id", childId)
    .limit(1);

  if (error) {
    throw toSupabaseSetupError(new Error(`Could not load milestones: ${error.message}`));
  }

  if ((existing?.length ?? 0) > 0) return;

  const payload = DEFAULT_MILESTONES.map((item) => ({
    child_id: childId,
    template_key: item.key,
    label: item.label
  }));

  const { error: insertError } = await supabase.from("milestones").insert(payload);
  if (insertError) {
    throw toSupabaseSetupError(new Error(`Could not seed milestones: ${insertError.message}`));
  }
}

async function ensureChild(familyId: string): Promise<ChildProfile> {
  const { data: children, error } = await supabase
    .from("children")
    .select("id, first_name, birth_date")
    .eq("family_id", familyId)
    .order("created_at", { ascending: true });

  if (error) {
    throw toSupabaseSetupError(new Error(`Could not load children: ${error.message}`));
  }

  if (children && children.length > 0) {
    await ensureDefaultMilestones(children[0].id);
    return {
      id: children[0].id,
      firstName: children[0].first_name,
      birthDate: children[0].birth_date
    };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("children")
    .insert({
      family_id: familyId,
      first_name: "My Child"
    })
    .select("id, first_name, birth_date")
    .single();

  if (insertError || !inserted) {
    throw toSupabaseSetupError(new Error(`Could not create child profile: ${insertError?.message ?? "Unknown"}`));
  }

  await ensureDefaultMilestones(inserted.id);

  return {
    id: inserted.id,
    firstName: inserted.first_name,
    birthDate: inserted.birth_date
  };
}

async function createFamilyForUser(user: AuthUser): Promise<{ familyId: string; familyName: string }> {
  const displayName = user.name?.split(" ")[0] ?? "Family";
  const familyName = `${displayName}'s EverNest`;

  const { data: family, error: familyError } = await supabase
    .from("families")
    .insert({ name: familyName, owner_id: user.id })
    .select("id, name")
    .single();

  if (familyError || !family) {
    throw toSupabaseSetupError(new Error(`Could not create family: ${familyError?.message ?? "Unknown"}`));
  }

  const { error: memberError } = await supabase.from("family_members").upsert(
    {
      family_id: family.id,
      user_id: user.id,
      role: "owner"
    },
    { onConflict: "family_id,user_id" }
  );

  if (memberError) {
    throw toSupabaseSetupError(new Error(`Could not add owner membership: ${memberError.message}`));
  }

  return { familyId: family.id, familyName: family.name };
}

async function getMembership(userId: string): Promise<{ familyId: string; role: Role } | null> {
  const { data, error } = await supabase
    .from("family_members")
    .select("family_id, role")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw toSupabaseSetupError(new Error(`Could not load family membership: ${error.message}`));
  }

  if (!data) return null;

  return {
    familyId: data.family_id,
    role: data.role as Role
  };
}

async function getOwnedFamily(userId: string): Promise<{ id: string; name: string } | null> {
  const { data, error } = await supabase
    .from("families")
    .select("id, name")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw toSupabaseSetupError(new Error(`Could not load owned family: ${error.message}`));
  }

  return data;
}

async function getFamilyName(familyId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("families")
    .select("id, name")
    .eq("id", familyId)
    .maybeSingle();

  if (error) {
    throw toSupabaseSetupError(new Error(`Could not load family details: ${error.message}`));
  }

  return data?.name ?? null;
}

async function ensureOwnerMembership(familyId: string, userId: string): Promise<void> {
  const { error } = await supabase.from("family_members").upsert(
    {
      family_id: familyId,
      user_id: userId,
      role: "owner"
    },
    { onConflict: "family_id,user_id" }
  );

  if (error) {
    throw toSupabaseSetupError(new Error(`Could not ensure owner membership: ${error.message}`));
  }
}

async function ensureFamilyContext(user: AuthUser): Promise<{ familyId: string; familyName: string; role: Role }> {
  const membership = await getMembership(user.id);
  if (membership) {
    const familyName = (await getFamilyName(membership.familyId)) ?? "EverNest Family";
    return {
      familyId: membership.familyId,
      familyName,
      role: membership.role
    };
  }

  const ownedFamily = await getOwnedFamily(user.id);
  if (ownedFamily) {
    await ensureOwnerMembership(ownedFamily.id, user.id);
    return {
      familyId: ownedFamily.id,
      familyName: ownedFamily.name,
      role: "owner"
    };
  }

  const created = await createFamilyForUser(user);
  return {
    familyId: created.familyId,
    familyName: created.familyName,
    role: "owner"
  };
}

export async function bootstrapWorkspace(user: AuthUser): Promise<Workspace> {
  await ensureProfileRecord(user);

  let familyContext = await ensureFamilyContext(user);
  let activeChild: ChildProfile;

  try {
    activeChild = await ensureChild(familyContext.familyId);
  } catch (error) {
    if (!isRecoverableWorkspaceError(error)) {
      throw error;
    }

    // Self-heal for broken membership/family states by creating a fresh family workspace.
    const created = await createFamilyForUser(user);
    familyContext = {
      familyId: created.familyId,
      familyName: created.familyName,
      role: "owner"
    };
    activeChild = await ensureChild(familyContext.familyId);

    if (error instanceof Error) {
      console.warn("Workspace self-heal triggered:", error.message);
    }
  }

  const { data: childrenRows, error: childError } = await supabase
    .from("children")
    .select("id, first_name, birth_date")
    .eq("family_id", familyContext.familyId)
    .order("created_at", { ascending: true });

  if (childError) {
    throw toSupabaseSetupError(new Error(`Could not load children list: ${childError.message}`));
  }

  const children: ChildProfile[] =
    (childrenRows ?? []).map((row) => ({
      id: row.id,
      firstName: titleCaseName(row.first_name),
      birthDate: row.birth_date
    })) ?? [];

  return {
    family: {
      id: familyContext.familyId,
      name: familyContext.familyName
    },
    role: familyContext.role,
    children: children.length > 0 ? children : [activeChild],
    activeChild
  };
}

export async function listFamilyMembers(familyId: string): Promise<FamilyMember[]> {
  const { data: memberRows, error: memberError } = await supabase
    .from("family_members")
    .select("user_id, role")
    .eq("family_id", familyId)
    .order("created_at", { ascending: true });

  if (memberError) {
    throw toSupabaseSetupError(new Error(`Could not load family members: ${memberError.message}`));
  }

  const userIds = Array.from(new Set((memberRows ?? []).map((row) => row.user_id)));
  if (userIds.length === 0) return [];

  const profileMap = await getProfiles(userIds);

  return (memberRows ?? []).map((row) => {
    const profile = profileMap.get(row.user_id);
    return {
      id: row.user_id,
      fullName: profile?.fullName ?? "Guardian",
      email: profile?.email ?? "",
      role: row.role as Role,
      avatarUrl: profile?.avatarUrl ?? null,
      avatarConfig: profile?.avatarConfig ?? null
    };
  });
}

function formatRelativeTime(input: string): string {
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(input).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(input).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export async function listRecentFamilyActivity(
  familyId: string,
  limit = 6
): Promise<FamilyActivityItem[]> {
  const [memoriesResult, commentsResult] = await Promise.all([
    supabase
      .from("memories")
      .select("id, title, media_type, created_at, created_by")
      .eq("family_id", familyId)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("memory_comments")
      .select("id, user_id, body, created_at, memories!inner(family_id, title)")
      .eq("memories.family_id", familyId)
      .order("created_at", { ascending: false })
      .limit(limit)
  ]);

  if (memoriesResult.error) {
    throw toSupabaseSetupError(new Error(`Could not load recent memory activity: ${memoriesResult.error.message}`));
  }

  if (commentsResult.error) {
    throw toSupabaseSetupError(new Error(`Could not load recent comment activity: ${commentsResult.error.message}`));
  }

  const baseActivities = [
    ...(memoriesResult.data ?? []).map((row) => ({
      id: `memory-${row.id}`,
      actorId: row.created_by,
      createdAt: row.created_at,
      action:
        row.media_type === "video"
          ? `added a video${row.title ? `: ${row.title}` : ""}`
          : row.media_type === "voice"
            ? `saved a voice note${row.title ? `: ${row.title}` : ""}`
            : `added a photo${row.title ? `: ${row.title}` : ""}`
    })),
    ...(commentsResult.data ?? []).map((row) => {
      const memory = Array.isArray(row.memories) ? row.memories[0] : row.memories;
      return {
        id: `comment-${row.id}`,
        actorId: row.user_id,
        createdAt: row.created_at,
        action: `left a note on ${memory?.title ?? "a memory"}`
      };
    })
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);

  const profileMap = await getProfiles(baseActivities.map((item) => item.actorId));

  return baseActivities.map((item) => {
    const profile = profileMap.get(item.actorId);
    return {
      id: item.id,
      actorId: item.actorId,
      actorName: profile?.fullName ?? "Someone",
      actorAvatarUrl: profile?.avatarUrl ?? null,
      actorAvatarConfig: profile?.avatarConfig ?? null,
      action: item.action,
      createdAt: item.createdAt,
      timeLabel: formatRelativeTime(item.createdAt)
    };
  });
}

export async function listMilestones(childId: string): Promise<Milestone[]> {
  const { data, error } = await supabase
    .from("milestones")
    .select("id, child_id, template_key, label, due_at, completed_memory_id")
    .eq("child_id", childId)
    .order("label", { ascending: true });

  if (error) {
    throw toSupabaseSetupError(new Error(`Could not load milestones: ${error.message}`));
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    childId: row.child_id,
    templateKey: row.template_key,
    label: row.label,
    dueAt: row.due_at,
    completedMemoryId: row.completed_memory_id
  }));
}

export async function createChild(familyId: string, firstName: string, birthDate?: string): Promise<ChildProfile> {
  const trimmed = firstName.trim();
  const { data, error } = await supabase
    .from("children")
    .insert({ family_id: familyId, first_name: trimmed, birth_date: birthDate ?? null })
    .select("id, first_name, birth_date")
    .single();

  if (error || !data) {
    throw toSupabaseSetupError(new Error(`Could not create child: ${error?.message ?? "Unknown"}`));
  }

  await ensureDefaultMilestones(data.id);

  return {
    id: data.id,
    firstName: data.first_name,
    birthDate: data.birth_date
  };
}

export async function updateChild(
  childId: string,
  updates: { firstName?: string; birthDate?: string | null }
): Promise<ChildProfile> {
  const payload: Record<string, unknown> = {};
  if (updates.firstName !== undefined) payload.first_name = updates.firstName.trim();
  if (updates.birthDate !== undefined) payload.birth_date = updates.birthDate;

  const { data, error } = await supabase
    .from("children")
    .update(payload)
    .eq("id", childId)
    .select("id, first_name, birth_date")
    .single();

  if (error || !data) {
    throw toSupabaseSetupError(new Error(`Could not update child: ${error?.message ?? "Unknown"}`));
  }

  return {
    id: data.id,
    firstName: data.first_name,
    birthDate: data.birth_date
  };
}

export async function deleteChild(childId: string): Promise<void> {
  const { error } = await supabase.from("children").delete().eq("id", childId);

  if (error) {
    throw toSupabaseSetupError(new Error(`Could not remove child: ${error.message}`));
  }
}
