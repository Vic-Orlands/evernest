import { useEffect, useMemo } from "react";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { getExpoNotifications } from "@/lib/expo-notifications-optional";
import {
  configureNotificationChannels,
  getNotificationPermissionStatus,
  registerPushToken
} from "@/lib/notifications";

const CATEGORY_IDS = {
  reminder: "reminder_action",
  familyActivity: "family_activity_action",
  inbox: "inbox_action"
} as const;

const ACTION_IDS = {
  openCapture: "open_capture",
  openMemory: "open_memory",
  openInbox: "open_inbox"
} as const;

function resolveNotificationUrl(data: Record<string, unknown> | undefined) {
  const url = data?.url;
  return typeof url === "string" ? url : null;
}

function redirectFromAction(
  actionIdentifier: string,
  data: Record<string, unknown> | undefined
) {
  if (actionIdentifier === ACTION_IDS.openCapture) {
    router.push("/(tabs)/capture");
    return true;
  }

  if (actionIdentifier === ACTION_IDS.openInbox) {
    router.push("/notifications" as never);
    return true;
  }

  if (actionIdentifier === ACTION_IDS.openMemory) {
    const url = resolveNotificationUrl(data);
    if (url) {
      router.push(url as never);
      return true;
    }
  }

  return false;
}

export function useNotificationLifecycle() {
  const notifications = useMemo(() => getExpoNotifications(), []);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!notifications) {
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

    void configureNotificationChannels();
    void notifications.setNotificationCategoryAsync(CATEGORY_IDS.reminder, [
      {
        identifier: ACTION_IDS.openCapture,
        buttonTitle: "Open capture",
        options: {
          opensAppToForeground: true
        }
      },
      {
        identifier: ACTION_IDS.openInbox,
        buttonTitle: "Inbox",
        options: {
          opensAppToForeground: true
        }
      }
    ]);
    void notifications.setNotificationCategoryAsync(CATEGORY_IDS.familyActivity, [
      {
        identifier: ACTION_IDS.openMemory,
        buttonTitle: "Open memory",
        options: {
          opensAppToForeground: true
        }
      },
      {
        identifier: ACTION_IDS.openInbox,
        buttonTitle: "Inbox",
        options: {
          opensAppToForeground: true
        }
      }
    ]);
    void notifications.setNotificationCategoryAsync(CATEGORY_IDS.inbox, [
      {
        identifier: ACTION_IDS.openInbox,
        buttonTitle: "Open inbox",
        options: {
          opensAppToForeground: true
        }
      }
    ]);
  }, [notifications]);

  useEffect(() => {
    if (!notifications) {
      return;
    }

    let mounted = true;

    const syncRegistration = async () => {
      const permissionStatus = await getNotificationPermissionStatus();
      if (!mounted || !permissionStatus.granted) {
        return;
      }

      await registerPushToken();
    };

    void syncRegistration();

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user?.id) {
        return;
      }
      void syncRegistration();
    });
    const tokenSubscription = notifications.addPushTokenListener(() => {
      void syncRegistration();
    });
    const foregroundSubscription = notifications.addNotificationReceivedListener(() => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
      tokenSubscription.remove();
      foregroundSubscription.remove();
    };
  }, [notifications, queryClient]);

  useEffect(() => {
    if (!notifications) {
      return;
    }

    let mounted = true;

    const redirectFromResponse = async () => {
      const response = await notifications.getLastNotificationResponseAsync();
      if (!mounted || !response?.notification) {
        return;
      }

      const notificationData =
        response.notification.request.content.data as Record<string, unknown> | undefined;
      if (redirectFromAction(response.actionIdentifier, notificationData)) {
        await notifications.clearLastNotificationResponseAsync();
        return;
      }

      const url = resolveNotificationUrl(
        notificationData
      );
      if (url) {
        router.push(url as never);
        await notifications.clearLastNotificationResponseAsync();
      }
    };

    void redirectFromResponse();

    const subscription = notifications.addNotificationResponseReceivedListener((response) => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      const notificationData =
        response.notification.request.content.data as Record<string, unknown> | undefined;
      if (redirectFromAction(response.actionIdentifier, notificationData)) {
        void notifications.clearLastNotificationResponseAsync();
        return;
      }

      const url = resolveNotificationUrl(notificationData);
      if (!url) {
        return;
      }

      router.push(url as never);
      void notifications.clearLastNotificationResponseAsync();
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, [notifications, queryClient]);
}
