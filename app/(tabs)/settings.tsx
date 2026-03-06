import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MotiView } from "moti";
import { useReminders } from "@/hooks/use-reminders";
import { useWorkspace } from "@/hooks/use-workspace";
import { useAuth } from "@/hooks/use-auth";
import { requestDeleteAccount, updateAccountPassword, updateAccountProfile } from "@/lib/account";
import { createSubscriptionCheckoutLink } from "@/lib/billing";
import { getReminderRule, listExportJobs, queueExportJob, saveReminderRule } from "@/lib/repositories";
import { queryKeys } from "@/lib/query-keys";
import { signOut } from "@/lib/auth";
import { T } from "@/lib/theme";

/* ------------------------------------------------------------------ */
/* Reusable pieces                                                     */
/* ------------------------------------------------------------------ */

function SectionCard({
  icon,
  iconColor,
  title,
  description,
  index,
  children
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor: string;
  title: string;
  description: string;
  index: number;
  children: React.ReactNode;
}) {
  return (
    <MotiView
      from={{ opacity: 0, translateY: 10 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 320, delay: index * 50 }}
      style={{
        marginTop: 16,
        borderRadius: 20,
        backgroundColor: T.night3,
        padding: 18,
        borderWidth: 1,
        borderColor: T.night4
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            backgroundColor: `${iconColor}18`,
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <MaterialCommunityIcons name={icon} size={20} color={iconColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: "DMSans_500Medium", fontSize: 14, color: T.cream }}>{title}</Text>
          <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 11, color: T.moonDim, marginTop: 2 }}>
            {description}
          </Text>
        </View>
      </View>
      {children}
    </MotiView>
  );
}

function SettingsInput({
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  autoCapitalize,
  keyboardType,
  editable = true,
  rightIcon
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: "default" | "email-address" | "number-pad";
  editable?: boolean;
  rightIcon?: React.ReactNode;
}) {
  return (
    <View style={{ position: "relative", marginTop: 10 }}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={T.moonDim}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        editable={editable}
        style={{
          borderRadius: 14,
          borderWidth: 1,
          borderColor: editable ? T.night4 : "rgba(46,38,32,0.20)",
          paddingHorizontal: 16,
          paddingVertical: 12,
          paddingRight: rightIcon ? 48 : 16,
          fontFamily: "DMSans_400Regular",
          fontSize: 14,
          color: editable ? T.moon : T.moonDim,
          backgroundColor: editable ? "rgba(46,38,32,0.25)" : "rgba(46,38,32,0.12)"
        }}
      />
      {rightIcon ? (
        <View style={{ position: "absolute", right: 14, top: 0, bottom: 0, justifyContent: "center" }}>
          {rightIcon}
        </View>
      ) : null}
    </View>
  );
}

function PrimaryButton({
  label,
  loading,
  onPress,
  disabled,
  variant = "primary"
}: {
  label: string;
  loading?: boolean;
  onPress: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
}) {
  const bg =
    variant === "primary"
      ? T.terracotta
      : variant === "danger"
        ? "#B94035"
        : "transparent";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={{
        marginTop: 12,
        backgroundColor: bg,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 14,
        borderWidth: variant === "secondary" ? 1 : 0,
        borderColor: T.night4,
        opacity: disabled ? 0.5 : 1
      }}
    >
      <Text
        style={{
          textAlign: "center",
          fontFamily: variant === "primary" || variant === "danger" ? "DMSans_500Medium" : "DMSans_400Regular",
          fontSize: 14,
          color: variant === "secondary" ? T.moon : T.cream
        }}
      >
        {loading ? "Working…" : label}
      </Text>
    </Pressable>
  );
}

function ToggleRow({
  label,
  description,
  value,
  onValueChange,
  disabled
}: {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (val: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, gap: 12 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 13, color: T.cream }}>{label}</Text>
        {description ? (
          <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 11, color: T.moonDim, marginTop: 2 }}>{description}</Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: T.night4, true: "rgba(196,98,58,0.50)" }}
        thumbColor={value ? T.terracotta : T.moon}
      />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Main Screen                                                         */
/* ------------------------------------------------------------------ */

export default function SettingsScreen() {
  const queryClient = useQueryClient();
  const { enabled, supported, scheduleDailyReminder, scheduleCatchUpReminder } = useReminders();
  const { user, refresh } = useAuth();
  const { workspace, workspaceLoading, workspaceError, refetchWorkspace } = useWorkspace();

  // Profile edit mode
  const [editingProfile, setEditingProfile] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");

  // Security
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Notifications
  const [hour, setHour] = useState("20");
  const [minute, setMinute] = useState("30");
  const [dailyRemindersOn, setDailyRemindersOn] = useState(true);
  const [familyActivityOn, setFamilyActivityOn] = useState(true);
  const [nudgesOn, setNudgesOn] = useState(true);

  // Appearance
  const [darkModeOn, setDarkModeOn] = useState(true);

  // Delete account
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

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
    if (!user) return;
    setFullName(user.name ?? "");
    setEmail(user.email);
  }, [user]);

  useEffect(() => {
    if (!reminderQuery.data) return;
    setHour(String(reminderQuery.data.hour));
    setMinute(String(reminderQuery.data.minute));
  }, [reminderQuery.data]);

  /* ---- Mutations ---- */

  const profileMutation = useMutation({
    mutationFn: async () => updateAccountProfile({ fullName, email }),
    onSuccess: async (message) => {
      await refresh();
      await refetchWorkspace();
      setEditingProfile(false);
      Alert.alert("Profile updated", message);
    },
    onError: (error) => {
      Alert.alert("Could not update profile", error instanceof Error ? error.message : "Unknown error");
    }
  });

  const passwordMutation = useMutation({
    mutationFn: async () => {
      if (password !== confirmPassword) throw new Error("Password confirmation does not match.");
      await updateAccountPassword(password);
    },
    onSuccess: () => {
      setPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      setShowConfirmPassword(false);
      Alert.alert("Password updated", "Your password was changed successfully.");
    },
    onError: (error) => {
      Alert.alert("Could not update password", error instanceof Error ? error.message : "Unknown error");
    }
  });

  const reminderMutation = useMutation({
    mutationFn: async () => {
      if (!workspace) throw new Error("Workspace unavailable");
      const parsedHour = Number.parseInt(hour, 10);
      const parsedMinute = Number.parseInt(minute, 10);
      if (Number.isNaN(parsedHour) || Number.isNaN(parsedMinute)) throw new Error("Hour and minute must be numbers");
      await saveReminderRule({ familyId: workspace.family.id, hour: parsedHour, minute: parsedMinute, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, enabled: true });
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
    onSuccess: async (checkoutUrl) => { await Linking.openURL(checkoutUrl); },
    onError: (error) => { Alert.alert("Billing unavailable", error instanceof Error ? error.message : "Unknown error"); }
  });

  const exportMutation = useMutation({
    mutationFn: async (target: "google_drive" | "icloud" | "download") => {
      if (!workspace) throw new Error("Workspace unavailable");
      await queueExportJob(workspace.family.id, target);
    },
    onSuccess: () => {
      Alert.alert("Export queued", "Your export request has been queued and will process shortly.");
      if (workspace) void queryClient.invalidateQueries({ queryKey: queryKeys.exports(workspace.family.id) });
    },
    onError: (error) => { Alert.alert("Export failed", error instanceof Error ? error.message : "Unknown error"); }
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      if (deleteConfirmation !== "DELETE") throw new Error("Type DELETE to confirm account deletion.");
      await requestDeleteAccount();
    },
    onSuccess: async () => {
      await signOut().catch(() => undefined);
      router.replace("/(auth)");
    },
    onError: (error) => { Alert.alert("Could not delete account", error instanceof Error ? error.message : "Unknown error"); }
  });

  const logout = async () => {
    try {
      await signOut();
      router.replace("/(auth)");
    } catch (error) {
      Alert.alert("Could not sign out", error instanceof Error ? error.message : "Unknown error");
    }
  };

  /* ---- Early returns ---- */

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
            <Pressable onPress={() => { void refetchWorkspace(); }} style={{ marginTop: 16, borderWidth: 1, borderColor: T.night4, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14 }}>
              <Text className="text-center font-body text-sm text-moon">Retry workspace sync</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  /* ---- Main render ---- */

  const initials = (user?.name ?? "G").slice(0, 2).toUpperCase();

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-night2">
      <ScrollView contentInsetAdjustmentBehavior="automatic" className="flex-1 bg-night2" contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="px-5 pt-4">
          {/* Header */}
          <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 300 }}>
            <Text className="font-display text-4xl text-cream">Settings</Text>
            <Text className="mt-1 font-body text-xs text-moonDim">Manage your account, notifications, and preferences.</Text>
          </MotiView>

          {/* ============ PROFILE CARD (first) ============ */}
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 320, delay: 30 }}
            style={{ marginTop: 20, borderRadius: 20, backgroundColor: T.night3, padding: 18, borderWidth: 1, borderColor: T.night4 }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              {/* Avatar */}
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 20,
                  backgroundColor: "rgba(196,98,58,0.15)",
                  borderWidth: 2,
                  borderColor: "rgba(196,98,58,0.30)",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <Text style={{ fontFamily: "DMSans_500Medium", fontSize: 20, color: T.terracotta }}>{initials}</Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: "DMSans_500Medium", fontSize: 16, color: T.cream }}>{user?.name ?? "Guardian"}</Text>
                <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 12, color: T.moonDim, marginTop: 2 }}>{user?.email ?? ""}</Text>
                <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 10, color: T.moonDim, marginTop: 2 }}>
                  {workspace.role.charAt(0).toUpperCase() + workspace.role.slice(1)} · {workspace.family.name}
                </Text>
              </View>

              <Pressable
                onPress={() => setEditingProfile(!editingProfile)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  backgroundColor: editingProfile ? "rgba(196,98,58,0.20)" : "rgba(46,38,32,0.50)",
                  borderWidth: 1,
                  borderColor: editingProfile ? "rgba(196,98,58,0.40)" : T.night4,
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <MaterialCommunityIcons
                  name={editingProfile ? "close" : "pencil-outline"}
                  size={16}
                  color={editingProfile ? T.terracotta : T.moonDim}
                />
              </Pressable>
            </View>

            {/* Expandable edit form */}
            {editingProfile ? (
              <MotiView
                from={{ opacity: 0, translateY: -8 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: "timing", duration: 250 }}
                style={{ marginTop: 16 }}
              >
                <SettingsInput value={fullName} onChangeText={setFullName} placeholder="Full name" />
                <SettingsInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="Email address" />
                <PrimaryButton label="Save profile" loading={profileMutation.isPending} onPress={() => profileMutation.mutate()} />
              </MotiView>
            ) : null}
          </MotiView>

          {/* ============ SECURITY ============ */}
          <SectionCard icon="shield-lock-outline" iconColor="#8B9CF7" title="Security" description="Change your password." index={1}>
            <SettingsInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              placeholder="New password"
              rightIcon={
                <Pressable onPress={() => setShowPassword(!showPassword)}>
                  <MaterialCommunityIcons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={T.moonDim} />
                </Pressable>
              }
            />
            <SettingsInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              placeholder="Confirm new password"
              rightIcon={
                <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  <MaterialCommunityIcons name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} size={20} color={T.moonDim} />
                </Pressable>
              }
            />
            <PrimaryButton label="Change password" loading={passwordMutation.isPending} onPress={() => passwordMutation.mutate()} variant="secondary" />
          </SectionCard>

          {/* ============ APPEARANCE ============ */}
          <SectionCard icon="palette-outline" iconColor={T.sageLight} title="Appearance" description="Customize how EverNest looks." index={2}>
            <ToggleRow label="Dark mode" description="Use the dark theme throughout the app." value={darkModeOn} onValueChange={setDarkModeOn} />
          </SectionCard>

          {/* ============ NOTIFICATIONS ============ */}
          <SectionCard
            icon="bell-outline"
            iconColor={T.gold}
            title="Notifications"
            description={supported ? `Permission: ${enabled ? "Granted" : "Not granted"}` : "Requires a development build."}
            index={3}
          >
            <ToggleRow label="Daily reminders" description="Get reminded to capture a memory each day." value={dailyRemindersOn} onValueChange={setDailyRemindersOn} disabled={!supported} />
            <ToggleRow label="Family activity" description="Notify when someone captures or comments." value={familyActivityOn} onValueChange={setFamilyActivityOn} disabled={!supported} />
            <ToggleRow label="Nudges" description="Allow family members to nudge you." value={nudgesOn} onValueChange={setNudgesOn} disabled={!supported} />

            <View style={{ marginTop: 12, flexDirection: "row", gap: 8 }}>
              <TextInput keyboardType="number-pad" value={hour} onChangeText={setHour} placeholder="Hour" placeholderTextColor={T.moonDim} style={{ flex: 1, borderRadius: 14, borderWidth: 1, borderColor: T.night4, paddingHorizontal: 12, paddingVertical: 10, fontFamily: "DMSans_400Regular", fontSize: 14, color: T.moon, backgroundColor: "rgba(46,38,32,0.25)" }} />
              <TextInput keyboardType="number-pad" value={minute} onChangeText={setMinute} placeholder="Min" placeholderTextColor={T.moonDim} style={{ flex: 1, borderRadius: 14, borderWidth: 1, borderColor: T.night4, paddingHorizontal: 12, paddingVertical: 10, fontFamily: "DMSans_400Regular", fontSize: 14, color: T.moon, backgroundColor: "rgba(46,38,32,0.25)" }} />
            </View>
            <PrimaryButton label="Save reminder" loading={reminderMutation.isPending} onPress={() => reminderMutation.mutate()} disabled={!supported} />
          </SectionCard>

          {/* ============ BILLING ============ */}
          <SectionCard icon="credit-card-outline" iconColor="#E8A090" title="Billing" description="Manage your EverNest subscription." index={4}>
            <PrimaryButton label="Open checkout" loading={billingMutation.isPending} onPress={() => billingMutation.mutate()} variant="secondary" />
          </SectionCard>

          {/* ============ EXPORTS ============ */}
          <SectionCard icon="download-outline" iconColor={T.sageLight} title="Exports" description="Send an export package to your cloud storage." index={5}>
            <View style={{ gap: 8 }}>
              <PrimaryButton label="Google Drive export" onPress={() => exportMutation.mutate("google_drive")} variant="secondary" />
              <PrimaryButton label="iCloud export" onPress={() => exportMutation.mutate("icloud")} variant="secondary" />
              <PrimaryButton label="Direct download" onPress={() => exportMutation.mutate("download")} variant="secondary" />
            </View>
            {(exportsQuery.data ?? []).length > 0 ? (
              <View style={{ marginTop: 12, gap: 8 }}>
                {(exportsQuery.data ?? []).slice(0, 4).map((job) => {
                  const resultUrl = job.resultUrl;
                  return (
                    <View key={job.id} style={{ borderRadius: 12, borderWidth: 1, borderColor: T.night4, backgroundColor: "rgba(46,38,32,0.40)", padding: 12 }}>
                      <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 12, color: T.moon }}>{job.target} · {job.status}</Text>
                      <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 10, color: T.moonDim, marginTop: 4 }}>{new Date(job.createdAt).toLocaleString()}</Text>
                      {resultUrl ? (
                        <Pressable onPress={() => void Linking.openURL(resultUrl)} style={{ marginTop: 8, alignSelf: "flex-start", borderRadius: 10, borderWidth: 1, borderColor: T.night4, paddingHorizontal: 12, paddingVertical: 8 }}>
                          <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 10, color: T.moon }}>Open link</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            ) : null}
          </SectionCard>

          {/* ============ SESSION ============ */}
          <SectionCard icon="logout" iconColor={T.moonDim} title="Session" description="Sign out of this device." index={6}>
            <PrimaryButton label="Sign out" onPress={logout} variant="secondary" />
          </SectionCard>

          {/* ============ DANGER ZONE ============ */}
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 320, delay: 350 }}
            style={{ marginTop: 16, borderRadius: 20, backgroundColor: "#271514", padding: 18, borderWidth: 1, borderColor: "#7A2E2A" }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(185,64,53,0.18)", alignItems: "center", justifyContent: "center" }}>
                <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#E85A4F" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: "DMSans_500Medium", fontSize: 14, color: T.cream }}>Danger zone</Text>
                <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 11, color: T.moonDim, marginTop: 2 }}>Delete your account and all data. This cannot be undone.</Text>
              </View>
            </View>
            <SettingsInput value={deleteConfirmation} onChangeText={setDeleteConfirmation} autoCapitalize="characters" placeholder="Type DELETE to confirm" />
            <PrimaryButton label="Delete account" loading={deleteAccountMutation.isPending} onPress={() => deleteAccountMutation.mutate()} variant="danger" />
          </MotiView>

          {/* App footer */}
          <View style={{ marginTop: 32, alignItems: "center", paddingBottom: 20 }}>
            <Text style={{ fontFamily: "DMSans_500Medium", fontSize: 13, color: T.moonDim }}>EverNest v0.1.0</Text>
            <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 11, color: T.moonDim, marginTop: 4 }}>Built for families. Made with ❤️</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
