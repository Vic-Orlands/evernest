import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { supabase } from "@/lib/supabase";
import { requireCurrentUserId } from "@/lib/current-user";
import { getExpoNotifications } from "@/lib/expo-notifications-optional";

export const NOTIFICATION_CHANNELS = {
  reminders: "daily-reminders",
  activity: "family-activity",
  nudges: "nudges"
} as const;

type NotificationEventPayload =
  | { type: "memory_created"; memoryId: string }
  | { type: "memory_commented"; memoryId: string }
  | { type: "memory_reacted"; memoryId: string; emoji: string }
  | { type: "nudge"; familyId: string; targetUserId: string };

function isPermissionGranted(
  notifications: NonNullable<ReturnType<typeof getExpoNotifications>>,
  permissions: Awaited<ReturnType<NonNullable<ReturnType<typeof getExpoNotifications>>["getPermissionsAsync"]>>
) {
  return (
    permissions.granted ||
    permissions.ios?.status === notifications.IosAuthorizationStatus.PROVISIONAL ||
    permissions.ios?.status === notifications.IosAuthorizationStatus.EPHEMERAL
  );
}

function getProjectId() {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

export async function configureNotificationChannels(): Promise<void> {
  const notifications = getExpoNotifications();
  if (!notifications || Platform.OS !== "android") {
    return;
  }

  await notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.reminders, {
    name: "Daily reminders",
    importance: notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 200, 200, 200]
  });
  await notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.activity, {
    name: "Family activity",
    importance: notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 160, 140, 160]
  });
  await notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.nudges, {
    name: "Family nudges",
    importance: notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 120, 250]
  });
}

export async function getNotificationPermissionStatus(): Promise<{
  supported: boolean;
  granted: boolean;
}> {
  const notifications = getExpoNotifications();
  if (!notifications || !Device.isDevice) {
    return {
      supported: Boolean(notifications),
      granted: false
    };
  }

  await configureNotificationChannels();
  const permissions = await notifications.getPermissionsAsync();

  return {
    supported: true,
    granted: isPermissionGranted(notifications, permissions)
  };
}

export async function ensureNotificationPermissions(): Promise<boolean> {
  const notifications = getExpoNotifications();
  if (!notifications || !Device.isDevice) {
    return false;
  }

  await configureNotificationChannels();

  const existingPermissions = await notifications.getPermissionsAsync();
  if (isPermissionGranted(notifications, existingPermissions)) {
    await registerPushToken();
    return true;
  }

  const requestedPermissions = await notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true
    }
  });
  const granted = isPermissionGranted(notifications, requestedPermissions);

  if (granted) {
    await registerPushToken();
  }

  return granted;
}

export async function registerPushToken(): Promise<string | null> {
  const notifications = getExpoNotifications();
  if (!notifications || !Device.isDevice) {
    return null;
  }

  await configureNotificationChannels();

  const permissions = await notifications.getPermissionsAsync();
  if (!isPermissionGranted(notifications, permissions)) {
    return null;
  }

  const projectId = getProjectId();
  if (!projectId) {
    console.warn("Expo projectId is missing; push registration skipped.");
    return null;
  }

  try {
    const token = (
      await notifications.getExpoPushTokenAsync({
        projectId
      })
    ).data;
    const userId = await requireCurrentUserId();

    const { error } = await supabase.from("push_tokens").upsert(
      {
        user_id: userId,
        token,
        platform: Platform.OS
      },
      { onConflict: "user_id,token" }
    );

    if (error) {
      console.warn("Could not register push token:", error.message);
      return null;
    }

    return token;
  } catch (error) {
    console.warn("Push token registration failed:", error);
    return null;
  }
}

export async function unregisterPushToken(): Promise<void> {
  const notifications = getExpoNotifications();
  if (!notifications || !Device.isDevice) {
    return;
  }

  const projectId = getProjectId();
  if (!projectId) {
    return;
  }

  try {
    const token = (
      await notifications.getExpoPushTokenAsync({
        projectId
      })
    ).data;
    const userId = await requireCurrentUserId();

    await supabase
      .from("push_tokens")
      .delete()
      .eq("user_id", userId)
      .eq("token", token);
  } catch {
    return;
  }
}

async function sendNotificationEvent(payload: NotificationEventPayload): Promise<void> {
  const { error } = await supabase.functions.invoke("send-notification-event", {
    body: payload
  });

  if (error) {
    throw new Error(error.message || "Could not send notification");
  }
}

export async function notifyFamilyNewMemory(memoryId: string): Promise<void> {
  await sendNotificationEvent({
    type: "memory_created",
    memoryId
  });
}

export async function notifyFamilyNewComment(memoryId: string): Promise<void> {
  await sendNotificationEvent({
    type: "memory_commented",
    memoryId
  });
}

export async function notifyFamilyNewReaction(memoryId: string, emoji: string): Promise<void> {
  await sendNotificationEvent({
    type: "memory_reacted",
    memoryId,
    emoji
  });
}

export async function sendNudge(targetUserId: string, familyId: string): Promise<void> {
  await sendNotificationEvent({
    type: "nudge",
    targetUserId,
    familyId
  });
}
