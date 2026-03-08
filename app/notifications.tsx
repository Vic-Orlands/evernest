import { useMemo } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useWorkspace } from "@/hooks/use-workspace";
import { useAppTheme } from "@/hooks/use-app-theme";
import { markAllNotificationsRead, markNotificationRead, listUserNotifications } from "@/lib/repositories";
import { queryKeys } from "@/lib/query-keys";

function formatTimestamp(input: string) {
  const date = new Date(input);
  const now = Date.now();
  const diffMinutes = Math.max(1, Math.floor((now - date.getTime()) / 60000));
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function NotificationsScreen() {
  const queryClient = useQueryClient();
  const { colors } = useAppTheme();
  const { workspace, workspaceLoading } = useWorkspace();

  const notificationsQuery = useQuery({
    queryKey: workspace ? queryKeys.notifications(workspace.family.id) : ["notifications", "guest"],
    enabled: Boolean(workspace),
    queryFn: async () => listUserNotifications(workspace!.family.id)
  });

  const markAllMutation = useMutation({
    mutationFn: async () => {
      if (!workspace) throw new Error("Workspace unavailable");
      await markAllNotificationsRead(workspace.family.id);
    },
    onSuccess: async () => {
      if (workspace) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.notifications(workspace.family.id) });
      }
    },
    onError: (error) => {
      Alert.alert("Could not update inbox", error instanceof Error ? error.message : "Unknown error");
    }
  });

  const markReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      await markNotificationRead(notificationId);
    }
  });

  const unreadCount = useMemo(
    () => (notificationsQuery.data ?? []).filter((item) => !item.readAt).length,
    [notificationsQuery.data]
  );

  if (workspaceLoading || notificationsQuery.isLoading) {
    return (
      <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.backgroundSecondary }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.brand} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.backgroundSecondary }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120, gap: 16 }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
            <Pressable
              onPress={() => router.back()}
              style={{
                width: 40,
                height: 40,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface
              }}
            >
              <MaterialCommunityIcons name="arrow-left" size={18} color={colors.text} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: "InstrumentSerif_400Regular", fontSize: 34, color: colors.text }}>
                Inbox
              </Text>
              <Text style={{ marginTop: 2, fontFamily: "DMSans_400Regular", fontSize: 12, color: colors.textMuted }}>
                {unreadCount} unread notification{unreadCount === 1 ? "" : "s"}
              </Text>
            </View>
          </View>

          <Pressable
            onPress={() => markAllMutation.mutate()}
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              paddingHorizontal: 12,
              paddingVertical: 10
            }}
          >
            <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 12, color: colors.text }}>
              Mark all read
            </Text>
          </Pressable>
        </View>

        {(notificationsQuery.data ?? []).length === 0 ? (
          <View
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              paddingHorizontal: 18,
              paddingVertical: 22
            }}
          >
            <Text style={{ fontFamily: "DMSans_500Medium", fontSize: 14, color: colors.text }}>
              Nothing here yet
            </Text>
            <Text style={{ marginTop: 6, fontFamily: "DMSans_400Regular", fontSize: 12, lineHeight: 20, color: colors.textMuted }}>
              Reminder misses, family activity, nudges, and capsule deliveries will appear here.
            </Text>
          </View>
        ) : null}

        {(notificationsQuery.data ?? []).map((item) => (
          <Pressable
            key={item.id}
            onPress={async () => {
              if (!item.readAt) {
                await markReadMutation.mutateAsync(item.id).catch(() => undefined);
                if (workspace) {
                  await queryClient.invalidateQueries({ queryKey: queryKeys.notifications(workspace.family.id) });
                }
              }
              if (item.url) {
                router.push(item.url as never);
              }
            }}
            style={{
              borderWidth: 1,
              borderColor: item.readAt ? colors.border : colors.brand,
              backgroundColor: item.readAt ? colors.surface : colors.brandBackground,
              paddingHorizontal: 16,
              paddingVertical: 15,
              gap: 8
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: "DMSans_500Medium", fontSize: 14, color: colors.text }}>
                  {item.title}
                </Text>
                <Text style={{ marginTop: 6, fontFamily: "DMSans_400Regular", fontSize: 12, lineHeight: 20, color: colors.textMuted }}>
                  {item.body}
                </Text>
              </View>
              {!item.readAt ? (
                <View style={{ width: 9, height: 9, borderRadius: 999, backgroundColor: colors.brand, marginTop: 5 }} />
              ) : null}
            </View>
            <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 11, color: colors.textMuted }}>
              {formatTimestamp(item.createdAt)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
