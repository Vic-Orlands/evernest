import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Linking from "expo-linking";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useReminders } from "@/hooks/use-reminders";
import { useWorkspace } from "@/hooks/use-workspace";
import { createSubscriptionCheckoutLink } from "@/lib/billing";
import { getReminderRule, listExportJobs, queueExportJob, saveReminderRule } from "@/lib/repositories";
import { queryKeys } from "@/lib/query-keys";
import { signOut } from "@/lib/auth";
import { router } from "expo-router";

export default function SettingsScreen() {
  const queryClient = useQueryClient();
  const { enabled, supported, scheduleDailyReminder, scheduleCatchUpReminder } = useReminders();
  const { workspace, workspaceLoading, workspaceError, refetchWorkspace } = useWorkspace();

  const [hour, setHour] = useState("20");
  const [minute, setMinute] = useState("30");

  const reminderQuery = useQuery({
    queryKey: workspace ? queryKeys.reminderRule(workspace.family.id) : ["reminder-rule", "guest"],
    enabled: Boolean(workspace),
    queryFn: async () => getReminderRule(workspace!.family.id)
  });

  const exportsQuery = useQuery({
    queryKey: workspace ? queryKeys.exports(workspace.family.id) : ["exports", "guest"],
    enabled: Boolean(workspace),
    queryFn: async () => listExportJobs(workspace!.family.id)
  });

  useEffect(() => {
    if (!reminderQuery.data) return;
    setHour(String(reminderQuery.data.hour));
    setMinute(String(reminderQuery.data.minute));
  }, [reminderQuery.data]);

  const reminderMutation = useMutation({
    mutationFn: async () => {
      if (!workspace) throw new Error("Workspace unavailable");
      const parsedHour = Number.parseInt(hour, 10);
      const parsedMinute = Number.parseInt(minute, 10);

      if (Number.isNaN(parsedHour) || Number.isNaN(parsedMinute)) {
        throw new Error("Hour and minute must be numbers");
      }

      await saveReminderRule({
        familyId: workspace.family.id,
        hour: parsedHour,
        minute: parsedMinute,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        enabled: true
      });

      await scheduleDailyReminder(parsedHour, parsedMinute);
      await scheduleCatchUpReminder();
    },
    onSuccess: async () => {
      if (!workspace) return;
      await queryClient.invalidateQueries({ queryKey: queryKeys.reminderRule(workspace.family.id) });
      Alert.alert("Reminder saved", "Daily and catch-up notifications are scheduled.");
    },
    onError: (error) => {
      Alert.alert("Reminder failed", error instanceof Error ? error.message : "Unknown error");
    }
  });

  const billingMutation = useMutation({
    mutationFn: async () => createSubscriptionCheckoutLink("pro_monthly"),
    onSuccess: async (checkoutUrl) => {
      await Linking.openURL(checkoutUrl);
    },
    onError: (error) => {
      Alert.alert("Billing unavailable", error instanceof Error ? error.message : "Unknown error");
    }
  });

  const exportMutation = useMutation({
    mutationFn: async (target: "google_drive" | "icloud" | "download") => {
      if (!workspace) throw new Error("Workspace unavailable");
      await queueExportJob(workspace.family.id, target);
    },
    onSuccess: () => {
      Alert.alert("Export queued", "Your export request has been queued and will process shortly.");
      if (workspace) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.exports(workspace.family.id) });
      }
    },
    onError: (error) => {
      Alert.alert("Export failed", error instanceof Error ? error.message : "Unknown error");
    }
  });

  const logout = async () => {
    try {
      await signOut();
      router.replace("/(auth)/sign-in");
    } catch (error) {
      Alert.alert("Could not sign out", error instanceof Error ? error.message : "Unknown error");
    }
  };

  if (workspaceLoading) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-night2">
        <View className="flex-1 items-center justify-center">
          <Text className="font-body text-moonDim">Loading workspace...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!workspace) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-night2">
        <ScrollView contentInsetAdjustmentBehavior="automatic" className="flex-1 bg-night2">
          <View className="px-5 pt-5">
            <Text className="font-display text-3xl text-cream">Workspace unavailable</Text>
            <Text className="mt-2 font-body text-sm text-moonDim">
              {workspaceError instanceof Error ? workspaceError.message : "Could not load your family workspace."}
            </Text>
            <Pressable
              onPress={() => {
                void refetchWorkspace();
              }}
              className="mt-4 border border-night4 px-4 py-3"
            >
              <Text className="text-center font-body text-sm text-moon">Retry workspace sync</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (reminderQuery.error || exportsQuery.error) {
    const message = reminderQuery.error instanceof Error
      ? reminderQuery.error.message
      : exportsQuery.error instanceof Error
        ? exportsQuery.error.message
        : "Unknown error";

    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-night2">
        <ScrollView contentInsetAdjustmentBehavior="automatic" className="flex-1 bg-night2">
          <View className="px-5 pt-5">
            <Text className="font-display text-3xl text-cream">Could not load settings</Text>
            <Text className="mt-2 font-body text-sm text-moonDim">{message}</Text>
            <Pressable
              onPress={() => {
                void reminderQuery.refetch();
                void exportsQuery.refetch();
              }}
              className="mt-4 border border-night4 px-4 py-3"
            >
              <Text className="text-center font-body text-sm text-moon">Retry</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-night2">
      <ScrollView contentInsetAdjustmentBehavior="automatic" className="flex-1 bg-night2" contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="px-5 pt-4">
          <Text className="font-display text-4xl text-cream">Settings</Text>
          <Text className="mt-1 font-body text-xs text-moonDim">Notifications, exports, billing, and account security.</Text>

          <View className="mt-5 rounded-2xl bg-night3 p-4">
            <Text className="font-bodybold text-sm text-cream">Daily reminder</Text>
            <Text className="mt-1 font-body text-xs text-moonDim">
              {supported ? `Permission: ${enabled ? "Granted" : "Not granted"}` : "Notifications need a development build."}
            </Text>
            <View className="mt-3 flex-row gap-2">
              <TextInput
                keyboardType="number-pad"
                value={hour}
                onChangeText={setHour}
                placeholder="Hour"
                placeholderTextColor="#8A8070"
                className="flex-1 rounded-xl border border-night4 px-3 py-2 font-body text-moon"
              />
              <TextInput
                keyboardType="number-pad"
                value={minute}
                onChangeText={setMinute}
                placeholder="Minute"
                placeholderTextColor="#8A8070"
                className="flex-1 rounded-xl border border-night4 px-3 py-2 font-body text-moon"
              />
            </View>
            <Pressable onPress={() => reminderMutation.mutate()} disabled={reminderMutation.isPending || !supported} className="mt-3 rounded-xl bg-terracotta px-3 py-3">
              <Text className="text-center font-bodybold text-sm text-cream">{reminderMutation.isPending ? "Saving..." : "Save reminder"}</Text>
            </Pressable>
          </View>

          <View className="mt-5 rounded-2xl bg-night3 p-4">
            <Text className="font-bodybold text-sm text-cream">Billing</Text>
            <Pressable onPress={() => billingMutation.mutate()} disabled={billingMutation.isPending} className="mt-3 rounded-xl border border-night4 px-3 py-3">
              <Text className="text-center font-body text-sm text-moon">{billingMutation.isPending ? "Opening checkout..." : "Open checkout"}</Text>
            </Pressable>
          </View>

          <View className="mt-5 rounded-2xl bg-night3 p-4">
            <Text className="font-bodybold text-sm text-cream">Exports</Text>
            <View className="mt-3 gap-2">
              <Pressable onPress={() => exportMutation.mutate("google_drive")} className="rounded-xl border border-night4 px-3 py-3">
                <Text className="text-center font-body text-sm text-moon">Queue Google Drive export</Text>
              </Pressable>
              <Pressable onPress={() => exportMutation.mutate("icloud")} className="rounded-xl border border-night4 px-3 py-3">
                <Text className="text-center font-body text-sm text-moon">Queue iCloud export</Text>
              </Pressable>
            </View>

            <View className="mt-3 gap-2">
              {(exportsQuery.data ?? []).slice(0, 4).map((job) => {
                const resultUrl = job.resultUrl;
                return (
                  <View key={job.id} className="rounded-xl border border-night4 bg-night4/40 p-3">
                    <Text className="font-body text-xs text-moon">{job.target} · {job.status}</Text>
                    <Text className="mt-1 font-body text-[10px] text-moonDim">{new Date(job.createdAt).toLocaleString()}</Text>
                    {resultUrl ? (
                      <Pressable onPress={() => void Linking.openURL(resultUrl)} className="mt-2 self-start rounded-lg border border-night4 px-3 py-2">
                        <Text className="font-body text-[10px] text-moon">Open link</Text>
                      </Pressable>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </View>

          <Pressable onPress={logout} className="mt-6 rounded-xl border border-night4 px-4 py-3">
            <Text className="text-center font-body text-sm text-moon">Sign out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
