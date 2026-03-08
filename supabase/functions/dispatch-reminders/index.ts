// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  getLocalTimeParts,
  insertUserNotifications,
  isWithinLocalWindow,
  json,
  listUserRecipients,
  previousDateKey,
  recordNotificationDelivery,
  sendExpoPushMessages
} from "../_shared/push.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CATCH_UP_HOUR = 9;
const CATCH_UP_MINUTE = 0;
const ON_THIS_DAY_HOUR = 8;
const ON_THIS_DAY_MINUTE = 0;
const REMINDER_WINDOW_MINUTES = 15;
const RECENT_MEMORY_LOOKBACK_HOURS = 120;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function listRecentMemoryDateKeys(
  userId: string,
  familyId: string,
  timeZone: string,
  childId?: string | null
): Promise<Set<string>> {
  const sinceIso = new Date(Date.now() - RECENT_MEMORY_LOOKBACK_HOURS * 60 * 60 * 1000).toISOString();
  let query = supabase
    .from("memories")
    .select("captured_at")
    .eq("family_id", familyId)
    .eq("created_by", userId)
    .gte("captured_at", sinceIso);

  if (childId) {
    query = query.eq("child_id", childId);
  }

  const { data, error } = await query.order("captured_at", { ascending: false }).limit(50);

  if (error || !data?.length) {
    return new Set();
  }

  return new Set(
    data.map((row) => getLocalTimeParts(new Date(row.captured_at), timeZone).dateKey)
  );
}

async function listOnThisDayMemories(
  familyId: string,
  timeZone: string,
  dateKey: string,
  childId?: string | null
): Promise<Array<{ id: string; title: string; capturedAt: string }>> {
  const [year, month, day] = dateKey.split("-").map((value) => Number.parseInt(value, 10));
  let query = supabase
    .from("memories")
    .select("id, title, captured_at, child_id")
    .eq("family_id", familyId)
    .order("captured_at", { ascending: false })
    .limit(400);

  if (childId) {
    query = query.eq("child_id", childId);
  }

  const { data, error } = await query;
  if (error || !data?.length) {
    return [];
  }

  return data
    .filter((row) => {
      const parts = getLocalTimeParts(new Date(row.captured_at), timeZone);
      return parts.month === month && parts.day === day && parts.year < year;
    })
    .slice(0, 6)
    .map((row) => ({
      id: row.id,
      title: row.title,
      capturedAt: row.captured_at
    }));
}

serve(async () => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json(500, { error: "Missing env" });
  }

  const now = new Date();
  const { data: rules, error } = await supabase
    .from("reminder_rules")
    .select("user_id, family_id, child_id, timezone, hour, minute, enabled, on_this_day_enabled")
    .eq("enabled", true)
    .limit(500);

  if (error) {
    return json(500, { error: "Failed to query reminder rules" });
  }

  let dailySent = 0;
  let catchUpSent = 0;

  for (const rule of rules ?? []) {
    const timeZone = rule.timezone || "UTC";
    const localNow = getLocalTimeParts(now, timeZone);
    const recentMemoryDateKeys = await listRecentMemoryDateKeys(rule.user_id, rule.family_id, timeZone, rule.child_id);
    const hasMemoryToday = recentMemoryDateKeys.has(localNow.dateKey);
    const hasMemoryYesterday = recentMemoryDateKeys.has(previousDateKey(localNow.dateKey));
    const recipients = await listUserRecipients(supabase, {
      familyId: rule.family_id,
      userId: rule.user_id
    });

    if (recipients.length === 0) {
      continue;
    }

    const activeRecipient = recipients[0];

    if (!hasMemoryToday && isWithinLocalWindow(now, timeZone, rule.hour, rule.minute, REMINDER_WINDOW_MINUTES)) {
      const shouldSendDaily = await recordNotificationDelivery(supabase, {
        userId: rule.user_id,
        familyId: rule.family_id,
        notificationType: "daily_reminder",
        deliveryKey: localNow.dateKey,
        metadata: {
          childId: rule.child_id ?? null
        }
      });

      if (shouldSendDaily) {
        await insertUserNotifications(supabase, [
          {
            userId: rule.user_id,
            familyId: rule.family_id,
            childId: rule.child_id ?? null,
            notificationType: "daily_reminder",
            title: "Daily memory reminder",
            body: "Capture today's memory before the day slips away.",
            url: "/(tabs)/capture"
          }
        ]);
        if (!activeRecipient.quietHoursActive && activeRecipient.tokens.length > 0) {
          const messages = activeRecipient.tokens.map((token) => ({
            to: token,
            title: "Daily memory reminder",
            body: "Capture today's memory before the day slips away.",
            categoryId: "reminder_action",
            channelId: "daily-reminders",
            sound: "default" as const,
            data: {
              type: "daily_reminder",
              familyId: rule.family_id,
              childId: rule.child_id ?? null,
              url: "/(tabs)/capture"
            }
          }));
          await sendExpoPushMessages(supabase, messages);
          dailySent += messages.length;
        }
      }
    }

    const catchUpMatchesWindow = isWithinLocalWindow(
      now,
      timeZone,
      CATCH_UP_HOUR,
      CATCH_UP_MINUTE,
      REMINDER_WINDOW_MINUTES
    );
    const collidesWithDailyWindow = rule.hour === CATCH_UP_HOUR && rule.minute === CATCH_UP_MINUTE;

    if (!hasMemoryToday && !hasMemoryYesterday && catchUpMatchesWindow && !collidesWithDailyWindow) {
      const shouldSendCatchUp = await recordNotificationDelivery(supabase, {
        userId: rule.user_id,
        familyId: rule.family_id,
        notificationType: "catch_up_reminder",
        deliveryKey: localNow.dateKey,
        metadata: {
          childId: rule.child_id ?? null
        }
      });

      if (shouldSendCatchUp) {
        await insertUserNotifications(supabase, [
          {
            userId: rule.user_id,
            familyId: rule.family_id,
            childId: rule.child_id ?? null,
            notificationType: "catch_up_reminder",
            title: "Catch up on yesterday",
            body: "You missed yesterday. Add a quick memory while it's still fresh.",
            url: "/(tabs)/capture"
          }
        ]);
        if (!activeRecipient.quietHoursActive && activeRecipient.tokens.length > 0) {
          const messages = activeRecipient.tokens.map((token) => ({
            to: token,
            title: "Catch up on yesterday",
            body: "You missed yesterday. Add a quick memory while it's still fresh.",
            categoryId: "reminder_action",
            channelId: "daily-reminders",
            sound: "default" as const,
            data: {
              type: "catch_up_reminder",
              familyId: rule.family_id,
              childId: rule.child_id ?? null,
              url: "/(tabs)/capture"
            }
          }));
          await sendExpoPushMessages(supabase, messages);
          catchUpSent += messages.length;
        }
      }
    }

    if (rule.on_this_day_enabled && isWithinLocalWindow(now, timeZone, ON_THIS_DAY_HOUR, ON_THIS_DAY_MINUTE, REMINDER_WINDOW_MINUTES)) {
      const resurfacedMemories = await listOnThisDayMemories(rule.family_id, timeZone, localNow.dateKey, rule.child_id);
      if (resurfacedMemories.length > 0) {
        const shouldSendOnThisDay = await recordNotificationDelivery(supabase, {
          userId: rule.user_id,
          familyId: rule.family_id,
          notificationType: "on_this_day",
          deliveryKey: localNow.dateKey,
          metadata: {
            childId: rule.child_id ?? null,
            memoryIds: resurfacedMemories.map((memory) => memory.id)
          }
        });

        if (shouldSendOnThisDay) {
          const summary =
            resurfacedMemories.length === 1
              ? `Relive ${resurfacedMemories[0].title || "a family memory"} from this day.`
              : `You have ${resurfacedMemories.length} memories to revisit from this day.`;
          await insertUserNotifications(supabase, [
            {
              userId: rule.user_id,
              familyId: rule.family_id,
              childId: rule.child_id ?? null,
              notificationType: "on_this_day",
              title: "On this day",
              body: summary,
              url: "/(tabs)",
              metadata: {
                memoryIds: resurfacedMemories.map((memory) => memory.id)
              }
            }
          ]);
          if (!activeRecipient.quietHoursActive && activeRecipient.tokens.length > 0) {
            const messages = activeRecipient.tokens.map((token) => ({
              to: token,
              title: "On this day",
              body: summary,
              categoryId: "inbox_action",
              channelId: "family-activity",
              sound: "default" as const,
              data: {
                type: "on_this_day",
                familyId: rule.family_id,
                childId: rule.child_id ?? null,
                url: "/(tabs)"
              }
            }));
            await sendExpoPushMessages(supabase, messages);
          }
        }
      }
    }
  }

  return json(200, {
    success: true,
    dailySent,
    catchUpSent
  });
});
