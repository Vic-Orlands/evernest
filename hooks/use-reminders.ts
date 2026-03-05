import { useEffect, useMemo, useState } from "react";
import * as Device from "expo-device";
import { secureDelete, secureGet, secureSet } from "@/lib/secure-store";
import { getExpoNotifications } from "@/lib/expo-notifications-optional";

const DAILY_KEY = "notifications.daily";
const CATCHUP_KEY = "notifications.catchup";

async function cancelByKey(key: string, notifications: NonNullable<ReturnType<typeof getExpoNotifications>>): Promise<void> {
  const existing = await secureGet(key);
  if (!existing) return;
  try {
    await notifications.cancelScheduledNotificationAsync(existing);
  } finally {
    await secureDelete(key);
  }
}

export function useReminders() {
  const notifications = useMemo(() => getExpoNotifications(), []);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    (async () => {
      if (!notifications || !Device.isDevice) {
        setEnabled(false);
        return;
      }

      notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true
        })
      });

      const { status: existingStatus } = await notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== "granted") {
        const { status } = await notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      setEnabled(finalStatus === "granted");
    })();
  }, [notifications]);

  const scheduleDailyReminder = async (hour: number, minute: number) => {
    if (!enabled || !notifications) return;

    await cancelByKey(DAILY_KEY, notifications);

    const id = await notifications.scheduleNotificationAsync({
      content: {
        title: "EverNest",
        body: "Capture today’s memory before the day slips away.",
        data: { type: "daily_memory" }
      },
      trigger: {
        type: notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute
      }
    });

    await secureSet(DAILY_KEY, id);
  };

  const scheduleCatchUpReminder = async () => {
    if (!enabled || !notifications) return;

    await cancelByKey(CATCHUP_KEY, notifications);

    const id = await notifications.scheduleNotificationAsync({
      content: {
        title: "EverNest Catch-up",
        body: "If you missed yesterday, add a quick note now.",
        data: { type: "catch_up_memory" }
      },
      trigger: {
        type: notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 9,
        minute: 0
      }
    });

    await secureSet(CATCHUP_KEY, id);
  };

  return {
    enabled,
    supported: Boolean(notifications),
    scheduleDailyReminder,
    scheduleCatchUpReminder
  };
}
