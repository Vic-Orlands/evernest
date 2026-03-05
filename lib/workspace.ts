import { supabase } from "@/lib/supabase";
import { AuthUser } from "@/lib/auth";
import { ChildProfile, FamilyMember, Milestone, Role, Workspace } from "@/lib/types";

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

async function ensureProfile(user: AuthUser): Promise<void> {
  const { data: existing, error: selectError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (selectError) {
    throw new Error(`Could not load profile: ${selectError.message}`);
  }

  if (!existing) {
    const { error: insertError } = await supabase.from("profiles").insert({
      id: user.id,
      full_name: user.name ?? user.email.split("@")[0],
      email: user.email
    });

    if (insertError) {
      throw new Error(`Could not create profile: ${insertError.message}`);
    }
  }
}

async function ensureDefaultMilestones(childId: string): Promise<void> {
  const { data: existing, error } = await supabase
    .from("milestones")
    .select("id")
    .eq("child_id", childId)
    .limit(1);

  if (error) {
    throw new Error(`Could not load milestones: ${error.message}`);
  }

  if ((existing?.length ?? 0) > 0) return;

  const payload = DEFAULT_MILESTONES.map((item) => ({
    child_id: childId,
    template_key: item.key,
    label: item.label
  }));

  const { error: insertError } = await supabase.from("milestones").insert(payload);
  if (insertError) {
    throw new Error(`Could not seed milestones: ${insertError.message}`);
  }
}

async function ensureChild(familyId: string): Promise<ChildProfile> {
  const { data: children, error } = await supabase
    .from("children")
    .select("id, first_name, birth_date")
    .eq("family_id", familyId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Could not load children: ${error.message}`);
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
    throw new Error(`Could not create child profile: ${insertError?.message ?? "Unknown"}`);
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
    throw new Error(`Could not create family: ${familyError?.message ?? "Unknown"}`);
  }

  const { error: memberError } = await supabase.from("family_members").insert({
    family_id: family.id,
    user_id: user.id,
    role: "owner"
  });

  if (memberError) {
    throw new Error(`Could not add owner membership: ${memberError.message}`);
  }

  return { familyId: family.id, familyName: family.name };
}

async function resolveMembership(userId: string): Promise<{ familyId: string; familyName: string; role: Role } | null> {
  const { data, error } = await supabase
    .from("family_members")
    .select("family_id, role, families!inner(id, name)")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load family membership: ${error.message}`);
  }

  if (!data) return null;

  const familyRecord = Array.isArray(data.families) ? data.families[0] : data.families;

  return {
    familyId: data.family_id,
    familyName: familyRecord?.name ?? "EverNest Family",
    role: data.role as Role
  };
}

export async function bootstrapWorkspace(user: AuthUser): Promise<Workspace> {
  await ensureProfile(user);

  const membership = await resolveMembership(user.id);
  let familyId = membership?.familyId;
  let familyName = membership?.familyName;
  let role: Role = membership?.role ?? "owner";

  if (!membership) {
    const created = await createFamilyForUser(user);
    familyId = created.familyId;
    familyName = created.familyName;
    role = "owner";
  }

  if (!familyId) {
    throw new Error("Family bootstrap failed");
  }

  const activeChild = await ensureChild(familyId);

  const { data: childrenRows, error: childError } = await supabase
    .from("children")
    .select("id, first_name, birth_date")
    .eq("family_id", familyId)
    .order("created_at", { ascending: true });

  if (childError) {
    throw new Error(`Could not load children list: ${childError.message}`);
  }

  const children: ChildProfile[] = (childrenRows ?? []).map((row) => ({
    id: row.id,
    firstName: titleCaseName(row.first_name),
    birthDate: row.birth_date
  }));

  return {
    family: {
      id: familyId,
      name: familyName ?? "EverNest Family"
    },
    role,
    children,
    activeChild
  };
}

export async function listFamilyMembers(familyId: string): Promise<FamilyMember[]> {
  const { data, error } = await supabase
    .from("family_members")
    .select("user_id, role, profiles!inner(full_name, email)")
    .eq("family_id", familyId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Could not load family members: ${error.message}`);
  }

  return (data ?? []).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: row.user_id,
      fullName: profile?.full_name ?? "Guardian",
      email: profile?.email ?? "",
      role: row.role as Role
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
    throw new Error(`Could not load milestones: ${error.message}`);
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
    throw new Error(`Could not create child: ${error?.message ?? "Unknown"}`);
  }

  await ensureDefaultMilestones(data.id);

  return {
    id: data.id,
    firstName: data.first_name,
    birthDate: data.birth_date
  };
}
