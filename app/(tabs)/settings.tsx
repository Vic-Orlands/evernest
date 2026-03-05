import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
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
  const { workspace, workspaceLoading } = useWorkspace();

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

  if (workspaceLoading || !workspace) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas-dark">
        <Text className="font-body text-zinc-300">Loading workspace...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-canvas-dark px-4 pt-14" contentContainerStyle={{ paddingBottom: 120 }}>
      <Text className="font-display text-4xl text-ink-dark">Settings</Text>
      <Text className="mt-1 font-body text-zinc-400">Notifications, exports, billing, and account security.</Text>

      <View className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
        <Text className="font-bodybold text-zinc-100">Daily reminder time</Text>
        <Text className="mt-2 font-body text-sm text-zinc-300">
          {supported ? `Permission: ${enabled ? "Granted" : "Not granted"}` : "Notifications require a development build."}
        </Text>

        <View className="mt-4 flex-row gap-3">
          <TextInput
            keyboardType="number-pad"
            value={hour}
            onChangeText={setHour}
            placeholder="Hour"
            placeholderTextColor="#7B8598"
            className="flex-1 rounded-xl border border-zinc-700 px-4 py-3 font-body text-zinc-100"
          />
          <TextInput
            keyboardType="number-pad"
            value={minute}
            onChangeText={setMinute}
            placeholder="Minute"
            placeholderTextColor="#7B8598"
            className="flex-1 rounded-xl border border-zinc-700 px-4 py-3 font-body text-zinc-100"
          />
        </View>

        <Pressable
          onPress={() => reminderMutation.mutate()}
          disabled={reminderMutation.isPending || !supported}
          className="mt-4 rounded-xl bg-amber px-4 py-3"
        >
          <Text className="text-center font-bodybold text-zinc-900">{reminderMutation.isPending ? "Saving..." : "Save reminder"}</Text>
        </Pressable>
      </View>

      <View className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
        <Text className="font-bodybold text-zinc-100">Billing</Text>
        <Text className="mt-2 font-body text-sm text-zinc-300">Upgrade storage and capsule limits.</Text>
        <Pressable
          onPress={() => billingMutation.mutate()}
          disabled={billingMutation.isPending}
          className="mt-4 rounded-xl border border-zinc-700 px-4 py-3"
        >
          <Text className="text-center font-body text-zinc-200">{billingMutation.isPending ? "Opening checkout..." : "Open checkout"}</Text>
        </Pressable>
      </View>

      <View className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
        <Text className="font-bodybold text-zinc-100">Exports</Text>
        <Text className="mt-2 font-body text-sm text-zinc-300">Queue memory package exports to external platforms.</Text>
        <View className="mt-4 gap-2">
          <Pressable
            onPress={() => exportMutation.mutate("google_drive")}
            disabled={exportMutation.isPending}
            className="rounded-xl border border-zinc-700 px-4 py-3"
          >
            <Text className="text-center font-body text-zinc-200">Queue Google Drive export</Text>
          </Pressable>
          <Pressable
            onPress={() => exportMutation.mutate("icloud")}
            disabled={exportMutation.isPending}
            className="rounded-xl border border-zinc-700 px-4 py-3"
          >
            <Text className="text-center font-body text-zinc-200">Queue iCloud export</Text>
          </Pressable>
          <Pressable
            onPress={() => exportMutation.mutate("download")}
            disabled={exportMutation.isPending}
            className="rounded-xl border border-zinc-700 px-4 py-3"
          >
            <Text className="text-center font-body text-zinc-200">Queue direct download export</Text>
          </Pressable>
        </View>

        <View className="mt-4 gap-2">
          {(exportsQuery.data ?? []).slice(0, 4).map((job) => {
            const resultUrl = job.resultUrl;
            return (
              <View key={job.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
                <Text className="font-body text-sm text-zinc-200">{job.target} · {job.status}</Text>
                <Text className="mt-1 font-body text-xs text-zinc-500">{new Date(job.createdAt).toLocaleString()}</Text>
                {resultUrl ? (
                  <Pressable onPress={() => void Linking.openURL(resultUrl)} className="mt-2 self-start rounded-lg border border-zinc-700 px-3 py-2">
                    <Text className="font-body text-xs text-zinc-300">Open download link</Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </View>
      </View>

      <Pressable onPress={logout} className="mt-6 rounded-2xl border border-zinc-600 px-4 py-3">
        <Text className="text-center font-body text-zinc-200">Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}
