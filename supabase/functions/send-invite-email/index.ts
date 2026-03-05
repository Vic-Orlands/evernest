// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM = Deno.env.get("RESEND_FROM") ?? "EverNest <noreply@evernest.app>";

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
        html: `<p>You have been invited to collaborate on EverNest.</p><p><a href=\"${inviteLink}\">Accept invite</a></p>`
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
