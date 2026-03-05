// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const RESEND_FROM = Deno.env.get("RESEND_FROM") ?? "EverNest <noreply@evernest.app>";
const APP_INVITE_BASE_URL = Deno.env.get("APP_INVITE_BASE_URL") ?? "evernest://accept-invite";

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function lower(email: string): string {
  return email.trim().toLowerCase();
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

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY || !RESEND_API_KEY) {
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
    const familyId = String(body.familyId ?? "");
    const email = lower(String(body.email ?? ""));
    const role = String(body.role ?? "");

    if (!familyId || !email || !email.includes("@")) {
      return json(400, { error: "Invalid payload" });
    }

    if (role !== "editor" && role !== "viewer") {
      return json(400, { error: "Invalid role" });
    }

    const { data: inviterMembership, error: memberError } = await serviceClient
      .from("family_members")
      .select("role")
      .eq("family_id", familyId)
      .eq("user_id", userData.user.id)
      .limit(1)
      .maybeSingle();

    if (memberError || !inviterMembership) {
      return json(403, { error: "Not allowed to invite for this family" });
    }

    if (!["owner", "editor"].includes(inviterMembership.role)) {
      return json(403, { error: "Insufficient permissions" });
    }

    const token = `${crypto.randomUUID()}${crypto.randomUUID()}`;
    const tokenHash = await hashToken(token);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();

    const { data: invite, error: inviteError } = await serviceClient
      .from("collaboration_invites")
      .insert({
        family_id: familyId,
        inviter_id: userData.user.id,
        invited_email: email,
        invited_role: role,
        token_hash: tokenHash,
        expires_at: expiresAt
      })
      .select("id")
      .single();

    if (inviteError || !invite) {
      return json(500, { error: inviteError?.message ?? "Could not create invite" });
    }

    const linkSeparator = APP_INVITE_BASE_URL.includes("?") ? "&" : "?";
    const inviteLink = `${APP_INVITE_BASE_URL}${linkSeparator}token=${encodeURIComponent(token)}`;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [email],
        subject: `${userData.user.email} invited you to EverNest`,
        html: `<p>You were invited to collaborate on a family timeline in EverNest.</p><p><a href=\"${inviteLink}\">Accept invite</a></p>`
      })
    });

    if (!resendResponse.ok) {
      return json(502, { error: "Invite created but email delivery failed" });
    }

    await serviceClient.from("audit_events").insert({
      family_id: familyId,
      actor_id: userData.user.id,
      action: "invite_created",
      metadata: { invitedEmail: email, role }
    });

    return json(200, { inviteId: invite.id });
  } catch {
    return json(500, { error: "Unexpected server error" });
  }
});
