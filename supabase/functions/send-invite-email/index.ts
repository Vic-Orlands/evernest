// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM = Deno.env.get("RESEND_FROM") ?? "EverNest <noreply@evernest.app>";

function buildInviteEmail(inviterName: string, inviteLink: string): string {
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
    <strong style="color:#E8E0D0">${inviterName}</strong> has invited you to join their family timeline on EverNest. Together, you can capture and preserve precious family memories.
  </p>
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
    return new Response("Method not allowed", { status: 405 });
  }

  if (!RESEND_API_KEY) {
    return new Response("Missing RESEND_API_KEY", { status: 500 });
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json();
    const email = typeof body.email === "string" ? body.email : "";
    const inviterName = typeof body.inviterName === "string" ? body.inviterName : "Your family";
    const inviteLink = typeof body.inviteLink === "string" ? body.inviteLink : "";

    if (!email || !inviteLink) {
      return new Response("Invalid payload", { status: 400 });
    }

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [email],
        subject: `${inviterName} invited you to EverNest`,
        html: buildInviteEmail(inviterName, inviteLink)
      })
    });

    if (!resendResponse.ok) {
      return new Response("Failed to send invite", { status: 502 });
    }

    return Response.json({ success: true });
  } catch {
    return new Response("Failed to process request", { status: 500 });
  }
});
