// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  ensureFamilyMembership,
  getProfileName,
  insertUserNotifications,
  json,
  listFamilyRecipients,
  listUserRecipients,
  sendExpoPushMessages
} from "../_shared/push.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

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
  if (userError || !userData.user?.id) {
    return json(401, { error: "Unauthorized user" });
  }

  try {
    const body = await req.json();
    const type = String(body.type ?? "");
    const actorId = userData.user.id;
    const actorName = await getProfileName(serviceClient, actorId);

    if (type === "memory_created" || type === "memory_commented" || type === "memory_reacted") {
      const memoryId = String(body.memoryId ?? "");
      if (!memoryId) {
        return json(400, { error: "Invalid memory event payload" });
      }

      const { data: memory, error: memoryError } = await serviceClient
        .from("memories")
        .select("id, family_id, created_by")
        .eq("id", memoryId)
        .maybeSingle();

      if (memoryError || !memory) {
        return json(404, { error: "Memory not found" });
      }

      const isMember = await ensureFamilyMembership(serviceClient, memory.family_id, actorId);
      if (!isMember) {
        return json(403, { error: "Not allowed for this family" });
      }

      const recipients = await listFamilyRecipients(serviceClient, {
        familyId: memory.family_id,
        excludeUserId: actorId,
        preference: "activity"
      });

      const reactionEmoji = type === "memory_reacted" ? String(body.emoji ?? "").trim() : "";
      const title =
        type === "memory_created"
          ? "New family memory"
          : type === "memory_commented"
            ? "New family comment"
            : "New memory reaction";
      const bodyCopy =
        type === "memory_created"
          ? `${actorName} added a new memory.`
          : type === "memory_commented"
            ? `${actorName} commented on a memory.`
            : `${actorName} reacted to a memory${reactionEmoji ? ` ${reactionEmoji}` : "."}`;
      const url = `/memory/${memory.id}`;

      await insertUserNotifications(
        serviceClient,
        recipients.map((recipient) => ({
          userId: recipient.userId,
          familyId: memory.family_id,
          notificationType: type,
          title,
          body: bodyCopy,
          url,
          metadata: {
            memoryId: memory.id,
            actorId
          }
        }))
      );

      const pushMessages = recipients
        .filter((recipient) => !recipient.quietHoursActive)
        .flatMap((recipient) =>
          recipient.tokens.map((token) => ({
            to: token,
            title,
            body: bodyCopy,
            categoryId: "family_activity_action",
            channelId: "family-activity",
            sound: "default" as const,
            data: {
              type,
              familyId: memory.family_id,
              memoryId: memory.id,
              url
            }
          }))
        );

      await sendExpoPushMessages(serviceClient, pushMessages);

      return json(200, { sent: pushMessages.length, inbox: recipients.length });
    }

    if (type === "nudge") {
      const familyId = String(body.familyId ?? "");
      const targetUserId = String(body.targetUserId ?? "");

      if (!familyId || !targetUserId || targetUserId === actorId) {
        return json(400, { error: "Invalid nudge payload" });
      }

      const senderAllowed = await ensureFamilyMembership(serviceClient, familyId, actorId);
      const targetAllowed = await ensureFamilyMembership(serviceClient, familyId, targetUserId);
      if (!senderAllowed || !targetAllowed) {
        return json(403, { error: "Not allowed for this family" });
      }

      const recipients = await listUserRecipients(serviceClient, {
        familyId,
        userId: targetUserId,
        preference: "nudge"
      });

      await insertUserNotifications(
        serviceClient,
        recipients.map((recipient) => ({
          userId: recipient.userId,
          familyId,
          notificationType: "nudge",
          title: "You've been nudged",
          body: `${actorName} nudged you to capture today's memory.`,
          url: "/(tabs)/capture",
          metadata: {
            actorId
          }
        }))
      );

      const pushMessages = recipients
        .filter((recipient) => !recipient.quietHoursActive)
        .flatMap((recipient) =>
          recipient.tokens.map((token) => ({
            to: token,
            title: "You've been nudged",
            body: `${actorName} nudged you to capture today's memory.`,
            categoryId: "reminder_action",
            channelId: "nudges",
            sound: "default" as const,
            data: {
              type: "nudge",
              familyId,
              actorId,
              url: "/(tabs)/capture"
            }
          }))
        );

      await sendExpoPushMessages(serviceClient, pushMessages);

      return json(200, { sent: pushMessages.length, inbox: recipients.length });
    }

    return json(400, { error: "Unsupported notification event" });
  } catch (error) {
    return json(500, {
      error: error instanceof Error ? error.message : "Unexpected server error"
    });
  }
});
