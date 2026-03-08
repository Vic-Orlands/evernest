// deno-lint-ignore-file no-explicit-any
import { type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send";
const MAX_EXPO_BATCH_SIZE = 100;

export type PushPreference = "activity" | "nudge" | "on_this_day";

export type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  categoryId?: string;
  channelId?: string;
  sound?: "default";
};

export type NotificationInboxItem = {
  userId: string;
  familyId: string;
  childId?: string | null;
  notificationType: string;
  title: string;
  body: string;
  url?: string | null;
  metadata?: Record<string, unknown>;
};

type UserPreferenceRecord = {
  timeZone: string;
  activityEnabled: boolean;
  nudgesEnabled: boolean;
  onThisDayEnabled: boolean;
  quietHoursStartHour: number | null;
  quietHoursEndHour: number | null;
  childId: string | null;
};

export type NotificationRecipient = {
  userId: string;
  tokens: string[];
  preferences: UserPreferenceRecord;
  quietHoursActive: boolean;
};

export function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function chunkMessages<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    out.push(items.slice(index, index + size));
  }
  return out;
}

function readBoolean(value: unknown, fallback = true): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function getPart(parts: Intl.DateTimeFormatPart[], type: string): number {
  const value = parts.find((part) => part.type === type)?.value ?? "0";
  return Number.parseInt(value, 10);
}

function normalizeHour(value: unknown): number | null {
  return typeof value === "number" && value >= 0 && value <= 23 ? value : null;
}

export function getLocalTimeParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
  const parts = formatter.formatToParts(date);
  const year = getPart(parts, "year");
  const month = getPart(parts, "month");
  const day = getPart(parts, "day");
  const hour = getPart(parts, "hour");
  const minute = getPart(parts, "minute");

  return {
    year,
    month,
    day,
    hour,
    minute,
    dateKey: `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
  };
}

export function previousDateKey(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map((value) => Number.parseInt(value, 10));
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

export function isWithinLocalWindow(
  date: Date,
  timeZone: string,
  hour: number,
  minute: number,
  windowMinutes = 15
) {
  const local = getLocalTimeParts(date, timeZone);
  const scheduledMinuteOfDay = hour * 60 + minute;
  const currentMinuteOfDay = local.hour * 60 + local.minute;
  return currentMinuteOfDay >= scheduledMinuteOfDay && currentMinuteOfDay < scheduledMinuteOfDay + windowMinutes;
}

export function isWithinQuietHours(
  date: Date,
  timeZone: string,
  startHour: number | null,
  endHour: number | null
) {
  if (startHour === null || endHour === null || startHour === endHour) {
    return false;
  }

  const { hour } = getLocalTimeParts(date, timeZone);
  if (startHour < endHour) {
    return hour >= startHour && hour < endHour;
  }

  return hour >= startHour || hour < endHour;
}

export async function getProfileName(serviceClient: SupabaseClient, userId: string): Promise<string> {
  const { data } = await serviceClient
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle();

  const fullName = data?.full_name?.trim();
  if (!fullName) {
    return "Someone";
  }

  return fullName.split(" ")[0] ?? fullName;
}

export async function ensureFamilyMembership(
  serviceClient: SupabaseClient,
  familyId: string,
  userId: string
): Promise<boolean> {
  const { data, error } = await serviceClient
    .from("family_members")
    .select("user_id")
    .eq("family_id", familyId)
    .eq("user_id", userId)
    .maybeSingle();

  return !error && Boolean(data?.user_id);
}

async function getUserPreferenceMap(
  serviceClient: SupabaseClient,
  familyId: string,
  userIds: string[]
): Promise<Map<string, UserPreferenceRecord>> {
  if (userIds.length === 0) {
    return new Map();
  }

  const { data } = await serviceClient
    .from("reminder_rules")
    .select(
      "user_id, timezone, activity_enabled, nudges_enabled, on_this_day_enabled, quiet_hours_start_hour, quiet_hours_end_hour, child_id"
    )
    .eq("family_id", familyId)
    .in("user_id", userIds);

  return new Map(
    (data ?? []).map((row) => [
      row.user_id,
      {
        timeZone: typeof row.timezone === "string" && row.timezone.length > 0 ? row.timezone : "UTC",
        activityEnabled: readBoolean(row.activity_enabled, true),
        nudgesEnabled: readBoolean(row.nudges_enabled, true),
        onThisDayEnabled: readBoolean(row.on_this_day_enabled, true),
        quietHoursStartHour: normalizeHour(row.quiet_hours_start_hour),
        quietHoursEndHour: normalizeHour(row.quiet_hours_end_hour),
        childId: typeof row.child_id === "string" ? row.child_id : null
      }
    ])
  );
}

async function listRecipientsByUserIds(
  serviceClient: SupabaseClient,
  params: {
    familyId: string;
    userIds: string[];
    preference?: PushPreference;
    now?: Date;
  }
): Promise<NotificationRecipient[]> {
  if (params.userIds.length === 0) {
    return [];
  }

  const preferenceMap = await getUserPreferenceMap(serviceClient, params.familyId, params.userIds);
  const { data: tokenRows, error: tokenError } = await serviceClient
    .from("push_tokens")
    .select("user_id, token")
    .in("user_id", params.userIds);

  if (tokenError) {
    return [];
  }

  const tokenMap = new Map<string, string[]>();
  (tokenRows ?? []).forEach((row) => {
    const current = tokenMap.get(row.user_id) ?? [];
    current.push(row.token);
    tokenMap.set(row.user_id, current);
  });

  const now = params.now ?? new Date();

  return params.userIds.flatMap((userId) => {
    const preferences = preferenceMap.get(userId) ?? {
      timeZone: "UTC",
      activityEnabled: true,
      nudgesEnabled: true,
      onThisDayEnabled: true,
      quietHoursStartHour: null,
      quietHoursEndHour: null,
      childId: null
    };

    const allowed =
      params.preference === "activity"
        ? preferences.activityEnabled
        : params.preference === "nudge"
          ? preferences.nudgesEnabled
          : params.preference === "on_this_day"
            ? preferences.onThisDayEnabled
            : true;

    if (!allowed) {
      return [];
    }

    return [
      {
        userId,
        tokens: Array.from(new Set(tokenMap.get(userId) ?? [])),
        preferences,
        quietHoursActive: isWithinQuietHours(
          now,
          preferences.timeZone,
          preferences.quietHoursStartHour,
          preferences.quietHoursEndHour
        )
      }
    ];
  });
}

export async function listFamilyRecipients(
  serviceClient: SupabaseClient,
  params: {
    familyId: string;
    excludeUserId?: string | null;
    preference?: PushPreference;
    now?: Date;
  }
): Promise<NotificationRecipient[]> {
  const { data: members, error } = await serviceClient
    .from("family_members")
    .select("user_id")
    .eq("family_id", params.familyId);

  if (error || !members?.length) {
    return [];
  }

  const userIds = members
    .map((member) => member.user_id)
    .filter((userId) => userId && userId !== params.excludeUserId);

  return listRecipientsByUserIds(serviceClient, {
    familyId: params.familyId,
    userIds,
    preference: params.preference,
    now: params.now
  });
}

export async function listUserRecipients(
  serviceClient: SupabaseClient,
  params: {
    familyId: string;
    userId: string;
    preference?: PushPreference;
    now?: Date;
  }
): Promise<NotificationRecipient[]> {
  return listRecipientsByUserIds(serviceClient, {
    familyId: params.familyId,
    userIds: [params.userId],
    preference: params.preference,
    now: params.now
  });
}

export async function insertUserNotifications(
  serviceClient: SupabaseClient,
  items: NotificationInboxItem[]
): Promise<void> {
  if (items.length === 0) {
    return;
  }

  const { error } = await serviceClient.from("user_notifications").insert(
    items.map((item) => ({
      user_id: item.userId,
      family_id: item.familyId,
      child_id: item.childId ?? null,
      notification_type: item.notificationType,
      title: item.title,
      body: item.body,
      url: item.url ?? null,
      metadata: item.metadata ?? {}
    }))
  );

  if (error) {
    throw error;
  }
}

export async function recordNotificationDelivery(
  serviceClient: SupabaseClient,
  params: {
    userId: string;
    familyId: string;
    notificationType: string;
    deliveryKey: string;
    metadata?: Record<string, unknown>;
  }
): Promise<boolean> {
  const { error } = await serviceClient
    .from("notification_deliveries")
    .insert({
      user_id: params.userId,
      family_id: params.familyId,
      notification_type: params.notificationType,
      delivery_key: params.deliveryKey,
      metadata: params.metadata ?? {}
    });

  if (!error) {
    return true;
  }

  if (error.code === "23505") {
    return false;
  }

  throw error;
}

export async function sendExpoPushMessages(
  serviceClient: SupabaseClient,
  messages: ExpoPushMessage[]
): Promise<void> {
  if (messages.length === 0) {
    return;
  }

  const invalidTokens = new Set<string>();
  const batches = chunkMessages(messages, MAX_EXPO_BATCH_SIZE);

  for (const batch of batches) {
    const response = await fetch(EXPO_PUSH_ENDPOINT, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(batch)
    });

    if (!response.ok) {
      throw new Error(`Expo push send failed with status ${response.status}`);
    }

    const payload = await response.json();
    const tickets = Array.isArray(payload?.data) ? payload.data : [payload?.data];

    tickets.forEach((ticket: any, index: number) => {
      if (ticket?.status !== "error") {
        return;
      }

      if (ticket?.details?.error === "DeviceNotRegistered") {
        invalidTokens.add(batch[index]?.to);
      }
    });
  }

  if (invalidTokens.size > 0) {
    await serviceClient
      .from("push_tokens")
      .delete()
      .in("token", Array.from(invalidTokens));
  }
}
