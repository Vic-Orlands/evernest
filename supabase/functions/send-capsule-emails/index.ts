// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  insertUserNotifications,
  json,
  listFamilyRecipients,
  sendExpoPushMessages
} from "../_shared/push.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const RESEND_FROM = Deno.env.get("RESEND_FROM") ?? "EverNest <noreply@evernest.app>";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async () => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !RESEND_API_KEY) {
    return json(500, { error: "Missing env" });
  }

  const nowIso = new Date().toISOString();
  const { data: dueCapsules, error } = await supabase
    .from("capsules")
    .select("id,title,recipient_email,release_at,status,family_id")
    .eq("status", "scheduled")
    .lte("release_at", nowIso)
    .limit(100);

  if (error) {
    return json(500, { error: "Failed to query capsules" });
  }

  let processed = 0;

  for (const capsule of dueCapsules ?? []) {
    const { data: capsuleMemories, error: memoriesError } = await supabase
      .from("capsule_memories")
      .select("memory_id, memories!inner(id,title,note,captured_at,media_path)")
      .eq("capsule_id", capsule.id);

    if (memoriesError) {
      continue;
    }

    const memoryRecords = (capsuleMemories ?? [])
      .map((row) => (Array.isArray(row.memories) ? row.memories[0] : row.memories))
      .filter(Boolean);

    const mediaPaths = memoryRecords.map((record) => record.media_path).filter(Boolean);
    const { data: signedUrls } = await supabase.storage.from("memory-media").createSignedUrls(mediaPaths, 60 * 60 * 24 * 7);

    const signedMap = new Map<string, string>();
    mediaPaths.forEach((path, index) => {
      const signed = signedUrls?.[index]?.signedUrl;
      if (signed) signedMap.set(path, signed);
    });

    const memoryBlocks = memoryRecords
      .map((memory) => {
        const mediaUrl = signedMap.get(memory.media_path);
        return `<li><strong>${memory.title}</strong> (${new Date(memory.captured_at).toDateString()})<br/>${memory.note}<br/>${
          mediaUrl ? `<a href=\"${mediaUrl}\">Open media</a>` : ""
        }</li>`;
      })
      .join("");

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [capsule.recipient_email],
        subject: `EverNest Capsule: ${capsule.title}`,
        html: `<p>Your scheduled EverNest capsule is ready.</p><p>${capsule.title}</p><ul>${memoryBlocks}</ul>`
      })
    });

    if (response.ok) {
      await supabase.from("capsules").update({ status: "sent" }).eq("id", capsule.id);
      await supabase.from("audit_events").insert({
        family_id: capsule.family_id,
        actor_id: null,
        action: "capsule_sent",
        metadata: { capsuleId: capsule.id }
      });
      const recipients = await listFamilyRecipients(supabase, {
        familyId: capsule.family_id,
        preference: "activity"
      });
      await insertUserNotifications(
        supabase,
        recipients.map((recipient) => ({
          userId: recipient.userId,
          familyId: capsule.family_id,
          childId: null,
          notificationType: "capsule_sent",
          title: "Time capsule delivered",
          body: "A scheduled EverNest capsule has just been delivered.",
          url: "/(tabs)/capsules",
          metadata: {
            capsuleId: capsule.id
          }
        }))
      );
      const pushMessages = recipients
        .filter((recipient) => !recipient.quietHoursActive)
        .flatMap((recipient) =>
          recipient.tokens.map((token) => ({
            to: token,
            title: "Time capsule delivered",
            body: "A scheduled EverNest capsule has just been delivered.",
            categoryId: "inbox_action",
            channelId: "family-activity",
            sound: "default" as const,
            data: {
              type: "capsule_sent",
              familyId: capsule.family_id,
              capsuleId: capsule.id,
              url: "/(tabs)/capsules"
            }
          }))
        );
      if (pushMessages.length > 0) {
        await sendExpoPushMessages(supabase, pushMessages);
      }
      processed += 1;
    }
  }

  return json(200, { success: true, processed });
});
