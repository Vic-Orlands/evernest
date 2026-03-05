// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

async function hashToken(token: string): Promise<string> {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return json(500, { error: "Server env is incomplete" });
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json(401, { error: "Unauthorized" });
  }

  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: authHeader
      }
    }
  });

  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: userData, error: userError } = await authClient.auth.getUser();
  if (userError || !userData.user?.email) {
    return json(401, { error: "Unauthorized user" });
  }

  try {
    const body = await req.json();
    const token = String(body.token ?? "");
    if (!token || token.length < 20) {
      return json(400, { error: "Invalid token" });
    }

    const tokenHash = await hashToken(token);

    const { data: invite, error: inviteError } = await serviceClient
      .from("collaboration_invites")
      .select("id, family_id, invited_email, invited_role, expires_at, accepted_at")
      .eq("token_hash", tokenHash)
      .limit(1)
      .maybeSingle();

    if (inviteError || !invite) {
      return json(404, { error: "Invite not found" });
    }

    if (invite.accepted_at) {
      return json(409, { error: "Invite already used" });
    }

    if (new Date(invite.expires_at).getTime() <= Date.now()) {
      return json(410, { error: "Invite expired" });
    }

    if (invite.invited_email.toLowerCase() !== userData.user.email.toLowerCase()) {
      return json(403, { error: "Invite email does not match signed-in account" });
    }

    const { error: memberUpsertError } = await serviceClient.from("family_members").upsert(
      {
        family_id: invite.family_id,
        user_id: userData.user.id,
        role: invite.invited_role
      },
      { onConflict: "family_id,user_id" }
    );

    if (memberUpsertError) {
      return json(500, { error: `Could not create membership: ${memberUpsertError.message}` });
    }

    const nowIso = new Date().toISOString();

    const { error: inviteUpdateError } = await serviceClient
      .from("collaboration_invites")
      .update({ accepted_at: nowIso, accepted_by: userData.user.id })
      .eq("id", invite.id);

    if (inviteUpdateError) {
      return json(500, { error: `Could not finalize invite: ${inviteUpdateError.message}` });
    }

    await serviceClient.from("audit_events").insert({
      family_id: invite.family_id,
      actor_id: userData.user.id,
      action: "invite_accepted",
      metadata: { inviteId: invite.id }
    });

    return json(200, { familyId: invite.family_id });
  } catch {
    return json(500, { error: "Unexpected server error" });
  }
});
