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

function buildInviteEmail(inviterEmail: string, role: string, inviteLink: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>You're invited to EverNest</title>
</head>
<body style="margin:0;padding:0;background-color:#0F0D0B;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0F0D0B;padding:40px 20px">
<tr><td align="center">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#1A1612;border-radius:24px;border:1px solid rgba(255,255,255,0.06);overflow:hidden;max-width:480px;width:100%">

<!-- Header gradient bar -->
<tr><td style="height:4px;background:linear-gradient(90deg,#C4623A,#D4A843,#7A9E7E)"></td></tr>

<!-- Logo area -->
<tr><td style="padding:36px 36px 0;text-align:center">
  <div style="display:inline-block;background:rgba(196,98,58,0.12);border:1px solid rgba(196,98,58,0.25);border-radius:16px;padding:12px 20px;margin-bottom:8px">
    <span style="font-size:24px">🌿</span>
  </div>
  <h1 style="margin:16px 0 0;font-size:28px;font-weight:300;color:#F5F0E8;letter-spacing:-0.5px;line-height:1.2">
    You're invited to <span style="color:#C4623A;font-weight:500">EverNest</span>
  </h1>
</td></tr>

<!-- Body -->
<tr><td style="padding:24px 36px 0">
  <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#A89A88">
    <strong style="color:#E8E0D0">${inviterEmail}</strong> has invited you to join their family timeline on EverNest as ${role === "editor" ? "an <strong style='color:#E8A090'>Editor</strong>" : "a <strong style='color:#B4CEB6'>Viewer</strong>"}.
  </p>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(196,98,58,0.08);border:1px solid rgba(196,98,58,0.15);border-radius:16px;margin-bottom:24px">
  <tr><td style="padding:16px 20px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="width:40px;vertical-align:top">
        <div style="width:36px;height:36px;background:rgba(196,98,58,0.15);border-radius:10px;text-align:center;line-height:36px;font-size:16px">📸</div>
      </td>
      <td style="padding-left:12px;vertical-align:top">
        <p style="margin:0 0 4px;font-size:13px;font-weight:500;color:#E8E0D0">What you'll get access to</p>
        <p style="margin:0;font-size:12px;line-height:1.6;color:#8A8070">
          ${role === "editor"
      ? "Capture photos &amp; videos, leave comments, react to memories, and help build the family archive."
      : "Browse the family archive, view memories, and leave reactions on special moments."}
        </p>
      </td>
    </tr>
    </table>
  </td></tr>
  </table>
</td></tr>

<!-- CTA Button -->
<tr><td style="padding:0 36px 12px;text-align:center">
  <a href="${inviteLink}" style="display:inline-block;background:#C4623A;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 40px;border-radius:14px;letter-spacing:0.3px;box-shadow:0 6px 20px rgba(196,98,58,0.35)">
    ✦ Accept Invitation
  </a>
</td></tr>

<!-- Secondary link -->
<tr><td style="padding:8px 36px 0;text-align:center">
  <p style="margin:0;font-size:11px;color:#8A8070;line-height:1.6">
    Or copy this link into your browser:<br>
    <a href="${inviteLink}" style="color:#C4623A;text-decoration:none;word-break:break-all;font-size:11px">${inviteLink}</a>
  </p>
</td></tr>

<!-- Divider -->
<tr><td style="padding:28px 36px 0">
  <div style="height:1px;background:rgba(255,255,255,0.06)"></div>
</td></tr>

<!-- Footer -->
<tr><td style="padding:20px 36px 32px;text-align:center">
  <p style="margin:0 0 6px;font-size:11px;color:#8A8070">
    This invite expires in 7 days. If you didn't expect this, you can safely ignore it.
  </p>
  <p style="margin:0;font-size:10px;color:#5A5040">
    EverNest — A living archive for families, built with ❤️
  </p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
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
        html: buildInviteEmail(userData.user.email, role, inviteLink)
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
