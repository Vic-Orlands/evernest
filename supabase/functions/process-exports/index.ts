// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const RESEND_FROM = Deno.env.get("RESEND_FROM") ?? "EverNest <noreply@evernest.app>";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

serve(async () => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json(500, { error: "Missing env" });
  }

  const { data: queuedExports, error } = await supabase
    .from("exports")
    .select("id, family_id, requested_by, target, format")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(25);

  if (error) {
    return json(500, { error: "Failed to load exports" });
  }

  let processed = 0;

  for (const job of queuedExports ?? []) {
    await supabase.from("exports").update({ status: "processing" }).eq("id", job.id);

    try {
      const { data: memories } = await supabase
        .from("memories")
        .select("id,title,note,captured_at,media_path,media_type")
        .eq("family_id", job.family_id)
        .order("captured_at", { ascending: false })
        .limit(1000);

      const payload = {
        generatedAt: new Date().toISOString(),
        familyId: job.family_id,
        target: job.target,
        format: job.format,
        memories: memories ?? []
      };

      const exportPath = `${job.family_id}/${job.requested_by}/${job.id}.json`;
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });

      const { error: uploadError } = await supabase.storage.from("export-packages").upload(exportPath, blob, {
        upsert: true,
        contentType: "application/json"
      });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { data: signed } = await supabase.storage.from("export-packages").createSignedUrl(exportPath, 60 * 60 * 24 * 7);

      const { data: requester } = await supabase.from("profiles").select("email").eq("id", job.requested_by).single();

      if (requester?.email && RESEND_API_KEY) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            from: RESEND_FROM,
            to: [requester.email],
            subject: "Your EverNest export is ready",
            html: `<p>Your export job is complete.</p><p><a href=\"${signed?.signedUrl ?? ""}\">Download export package</a></p>`
          })
        });
      }

      await supabase
        .from("exports")
        .update({ status: "done", result_url: signed?.signedUrl ?? null, error_message: null })
        .eq("id", job.id);
      await supabase.from("audit_events").insert({
        family_id: job.family_id,
        actor_id: job.requested_by,
        action: "export_completed",
        metadata: { exportId: job.id, target: job.target }
      });

      processed += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown export error";
      await supabase.from("exports").update({ status: "failed", error_message: message }).eq("id", job.id);
    }
  }

  return json(200, { success: true, processed });
});
