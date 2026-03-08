import { useCallback, useEffect, useMemo, useState } from "react";
import { getExpoNotifications } from "@/lib/expo-notifications-optional";
import {
  ensureNotificationPermissions,
  getNotificationPermissionStatus
} from "@/lib/notifications";

export function useReminders() {
  const notifications = useMemo(() => getExpoNotifications(), []);
  const [enabled, setEnabled] = useState(false);

  const refreshPermissionStatus = useCallback(async () => {
    const status = await getNotificationPermissionStatus();
    setEnabled(status.granted);
    return status;
  }, []);

  useEffect(() => {
    void refreshPermissionStatus();
  }, [refreshPermissionStatus]);

  const requestAccess = async () => {
    const granted = await ensureNotificationPermissions();
    setEnabled(granted);
    return granted;
  };

  return {
    enabled,
    supported: Boolean(notifications),
    requestAccess,
    refreshPermissionStatus
  };
}
