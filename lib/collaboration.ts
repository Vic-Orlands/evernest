import { supabase } from "@/lib/supabase";
import { inviteSchema } from "@/lib/validation";
import { Role } from "@/lib/types";

export async function sendFamilyInvite(input: { familyId: string; email: string; role: Role }) {
  const payload = inviteSchema.parse({
    familyId: input.familyId,
    email: input.email,
    role: input.role
  });

  const { data, error } = await supabase.functions.invoke("create-invite", {
    body: payload
  });

  if (error) {
    throw new Error(error.message || "Could not send invite");
  }

  return data as { inviteId: string };
}

export async function acceptFamilyInvite(token: string) {
  const { data, error } = await supabase.functions.invoke("accept-invite", {
    body: { token }
  });

  if (error) {
    throw new Error(error.message || "Could not accept invite");
  }

  return data as { familyId: string };
}
