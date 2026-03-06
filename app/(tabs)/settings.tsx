import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import * as Linking from "expo-linking";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MotiView } from "moti";
import { ProfileAvatar } from "@/components/profile-avatar";
import { useReminders } from "@/hooks/use-reminders";
import { useWorkspace } from "@/hooks/use-workspace";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { useAppTheme } from "@/hooks/use-app-theme";
import { requestDeleteAccount, updateAccountPassword, updateAccountProfile } from "@/lib/account";
import { createSubscriptionCheckoutLink } from "@/lib/billing";
import { saveProfileAppearance } from "@/lib/profile";
import { getReminderRule, listExportJobs, queueExportJob, saveReminderRule } from "@/lib/repositories";
import { queryKeys } from "@/lib/query-keys";
import { signOut } from "@/lib/auth";

const BUTTON_PADDING_Y = 11;

function SectionCard({
  icon,
  iconColor,
  title,
  description,
  index,
  backgroundColor,
  borderColor,
  textColor,
  descriptionColor,
  children
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor: string;
  title: string;
  description: string;
  index: number;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  descriptionColor: string;
  children: React.ReactNode;
}) {
  return (
    <MotiView
      from={{ opacity: 0, translateY: 10 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 320, delay: index * 50 }}
      style={{
        marginTop: 16,
        backgroundColor,
        padding: 18,
        borderWidth: 1,
        borderColor
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <View
          style={{
            width: 38,
            height: 38,
            backgroundColor: `${iconColor}18`,
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <MaterialCommunityIcons name={icon} size={20} color={iconColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: "DMSans_500Medium", fontSize: 14, color: textColor }}>{title}</Text>
          <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 11, color: descriptionColor, marginTop: 2 }}>
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
  placeholderTextColor,
  textColor,
  backgroundColor,
  borderColor,
  secureTextEntry,
  autoCapitalize,
  keyboardType,
  editable = true,
  rightIcon
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  placeholderTextColor: string;
  textColor: string;
  backgroundColor: string;
  borderColor: string;
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
        placeholderTextColor={placeholderTextColor}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        editable={editable}
        style={{
          borderWidth: 1,
          borderColor,
          paddingHorizontal: 16,
          paddingVertical: 11,
          paddingRight: rightIcon ? 48 : 16,
          fontFamily: "DMSans_400Regular",
          fontSize: 14,
          color: textColor,
          backgroundColor
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
  variant = "primary",
  backgroundColor,
  borderColor,
  textColor
}: {
  label: string;
  loading?: boolean;
  onPress: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
  backgroundColor: string;
  borderColor: string;
  textColor: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={{
        marginTop: 12,
        backgroundColor,
        paddingHorizontal: 16,
        paddingVertical: BUTTON_PADDING_Y,
        borderWidth: variant === "secondary" ? 1 : 0,
        borderColor,
        opacity: disabled ? 0.5 : 1
      }}
    >
      <Text
        style={{
          textAlign: "center",
          fontFamily: variant === "secondary" ? "DMSans_400Regular" : "DMSans_500Medium",
          fontSize: 14,
          color: textColor
        }}
      >
        {loading ? "Working..." : label}
      </Text>
    </Pressable>
  );
}

function ToggleRow({
  label,
  description,
  value,
  onValueChange,
  disabled,
  textColor,
  descriptionColor,
  trackFalse,
  trackTrue,
  thumbColor
}: {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (val: boolean) => void;
  disabled?: boolean;
  textColor: string;
  descriptionColor: string;
  trackFalse: string;
  trackTrue: string;
  thumbColor: string;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, gap: 12 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 13, color: textColor }}>{label}</Text>
        {description ? (
          <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 11, color: descriptionColor, marginTop: 2 }}>
            {description}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: trackFalse, true: trackTrue }}
        thumbColor={thumbColor}
      />
    </View>
  );
}

export default function SettingsScreen() {
  const queryClient = useQueryClient();
  const { colors, themeName, setThemeName } = useAppTheme();
  const { enabled, supported, scheduleDailyReminder, scheduleCatchUpReminder } = useReminders();
  const { user, refresh } = useAuth();
  const { profile, refetch: refetchProfile } = useProfile();
  const { workspace, workspaceLoading, workspaceError, refetchWorkspace } = useWorkspace();

  const [editingProfile, setEditingProfile] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [hour, setHour] = useState("20");
  const [minute, setMinute] = useState("30");
  const [dailyRemindersOn, setDailyRemindersOn] = useState(true);
  const [familyActivityOn, setFamilyActivityOn] = useState(true);
  const [nudgesOn, setNudgesOn] = useState(true);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [showSignOutModal, setShowSignOutModal] = useState(false);

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

  const syncProfileQueries = async () => {
    if (user) {
      await queryClient.invalidateQueries({ queryKey: queryKeys.profile(user.id) });
    }
    await queryClient.invalidateQueries({ queryKey: ["family-members"] });
    await refetchProfile();
    await refetchWorkspace();
  };

  const profileMutation = useMutation({
    mutationFn: async () => updateAccountProfile({ fullName, email }),
    onSuccess: async (message) => {
      await refresh();
      await syncProfileQueries();
      setEditingProfile(false);
      Alert.alert("Profile updated", message);
    },
    onError: (error) => {
      Alert.alert("Could not update profile", error instanceof Error ? error.message : "Unknown error");
    }
  });

  const profilePhotoMutation = useMutation({
    mutationFn: async () => {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        throw new Error("Allow photo library access to update your profile image.");
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.92
      });

      if (result.canceled || !result.assets[0]) {
        return;
      }

      await saveProfileAppearance({
        avatarConfig: profile?.avatarConfig ?? undefined,
        imageUri: result.assets[0].uri,
        imageMimeType: result.assets[0].mimeType
      });
    },
    onSuccess: async () => {
      await syncProfileQueries();
    },
    onError: (error) => {
      if (error instanceof Error && error.message === "Allow photo library access to update your profile image.") {
        Alert.alert("Permission needed", error.message);
        return;
      }
      Alert.alert("Could not update profile image", error instanceof Error ? error.message : "Unknown error");
    }
  });

  const removePhotoMutation = useMutation({
    mutationFn: async () =>
      saveProfileAppearance({
        avatarConfig: profile?.avatarConfig ?? undefined,
        removeImage: true
      }),
    onSuccess: async () => {
      await syncProfileQueries();
    },
    onError: (error) => {
      Alert.alert("Could not switch to avatar", error instanceof Error ? error.message : "Unknown error");
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

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      if (deleteConfirmation !== "DELETE") throw new Error("Type DELETE to confirm account deletion.");
      await requestDeleteAccount();
    },
    onSuccess: async () => {
      await signOut().catch(() => undefined);
      router.replace("/(auth)");
    },
    onError: (error) => {
      Alert.alert("Could not delete account", error instanceof Error ? error.message : "Unknown error");
    }
  });

  const logout = async () => {
    try {
      await signOut();
      router.replace("/(auth)");
    } catch (error) {
      Alert.alert("Could not sign out", error instanceof Error ? error.message : "Unknown error");
    }
  };

  const secondaryBackground = colors.surfaceSecondary;
  const primaryText = colors.text;
  const mutedText = colors.textMuted;

  if (workspaceLoading) {
    return (
      <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.backgroundSecondary }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.brand} />
        </View>
      </SafeAreaView>
    );
  }

  if (!workspace) {
    return (
      <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.backgroundSecondary }}>
        <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ flex: 1 }}>
          <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
            <Text style={{ fontFamily: "InstrumentSerif_400Regular", fontSize: 30, color: primaryText }}>
              Workspace unavailable
            </Text>
            <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 13, color: mutedText, marginTop: 8 }}>
              {workspaceError instanceof Error ? workspaceError.message : "Could not load your family workspace."}
            </Text>
            <PrimaryButton
              label="Retry workspace sync"
              onPress={() => {
                void refetchWorkspace();
              }}
              backgroundColor={colors.surface}
              borderColor={colors.border}
              textColor={primaryText}
              variant="secondary"
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.backgroundSecondary }}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120 }}>
        <Text style={{ fontFamily: "InstrumentSerif_400Regular", fontSize: 38, color: primaryText }}>Settings</Text>
        <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 12, color: mutedText, marginTop: 4 }}>
          Manage your account, notifications, and appearance.
        </Text>

        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 320, delay: 20 }}
          style={{
            marginTop: 20,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 18
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <ProfileAvatar
              imageUrl={profile?.avatarUrl}
              avatarConfig={profile?.avatarConfig}
              name={profile?.fullName ?? user?.name}
              size={64}
            />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: "DMSans_500Medium", fontSize: 16, color: primaryText }}>
                {profile?.fullName ?? user?.name ?? "Guardian"}
              </Text>
              <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 12, color: mutedText, marginTop: 2 }}>
                {profile?.email ?? user?.email ?? ""}
              </Text>
              <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 10, color: mutedText, marginTop: 2 }}>
                {workspace.role.charAt(0).toUpperCase() + workspace.role.slice(1)} · {workspace.family.name}
              </Text>
            </View>
            <Pressable
              onPress={() => setEditingProfile((value) => !value)}
              style={{
                width: 38,
                height: 38,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: editingProfile ? colors.brand : colors.border,
                backgroundColor: editingProfile ? colors.brandBackground : secondaryBackground
              }}
            >
              <MaterialCommunityIcons
                name={editingProfile ? "close" : "pencil-outline"}
                size={18}
                color={editingProfile ? colors.brand : mutedText}
              />
            </Pressable>
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 16 }}>
            <PrimaryButton
              label={profilePhotoMutation.isPending ? "Updating..." : "Choose photo"}
              loading={false}
              onPress={() => profilePhotoMutation.mutate()}
              backgroundColor={colors.surfaceSecondary}
              borderColor={colors.border}
              textColor={primaryText}
              variant="secondary"
            />
            <PrimaryButton
              label="Build avatar"
              onPress={() => router.push("/avatar")}
              backgroundColor={colors.brand}
              borderColor={colors.brand}
              textColor="#FFFFFF"
            />
            {profile?.avatarUrl ? (
              <PrimaryButton
                label={removePhotoMutation.isPending ? "Removing..." : "Use avatar"}
                onPress={() => removePhotoMutation.mutate()}
                backgroundColor={colors.surfaceSecondary}
                borderColor={colors.border}
                textColor={primaryText}
                variant="secondary"
              />
            ) : null}
          </View>

          {editingProfile ? (
            <MotiView
              from={{ opacity: 0, translateY: -8 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 250 }}
              style={{ marginTop: 12 }}
            >
              <SettingsInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="Full name"
                placeholderTextColor={mutedText}
                textColor={primaryText}
                backgroundColor={secondaryBackground}
                borderColor={colors.border}
              />
              <SettingsInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email address"
                placeholderTextColor={mutedText}
                textColor={primaryText}
                backgroundColor={secondaryBackground}
                borderColor={colors.border}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <PrimaryButton
                label="Save profile"
                loading={profileMutation.isPending}
                onPress={() => profileMutation.mutate()}
                backgroundColor={colors.brand}
                borderColor={colors.brand}
                textColor="#FFFFFF"
              />
            </MotiView>
          ) : null}
        </MotiView>

        <SectionCard
          icon="shield-lock-outline"
          iconColor={colors.navy}
          title="Security"
          description="Change your password."
          index={1}
          backgroundColor={colors.surface}
          borderColor={colors.border}
          textColor={primaryText}
          descriptionColor={mutedText}
        >
          <SettingsInput
            value={password}
            onChangeText={setPassword}
            placeholder="New password"
            placeholderTextColor={mutedText}
            textColor={primaryText}
            backgroundColor={secondaryBackground}
            borderColor={colors.border}
            secureTextEntry={!showPassword}
            rightIcon={
              <Pressable onPress={() => setShowPassword((value) => !value)}>
                <MaterialCommunityIcons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={mutedText} />
              </Pressable>
            }
          />
          <SettingsInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm new password"
            placeholderTextColor={mutedText}
            textColor={primaryText}
            backgroundColor={secondaryBackground}
            borderColor={colors.border}
            secureTextEntry={!showConfirmPassword}
            rightIcon={
              <Pressable onPress={() => setShowConfirmPassword((value) => !value)}>
                <MaterialCommunityIcons name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} size={20} color={mutedText} />
              </Pressable>
            }
          />
          <PrimaryButton
            label="Change password"
            loading={passwordMutation.isPending}
            onPress={() => passwordMutation.mutate()}
            backgroundColor={colors.surfaceSecondary}
            borderColor={colors.border}
            textColor={primaryText}
            variant="secondary"
          />
        </SectionCard>

        <SectionCard
          icon="palette-outline"
          iconColor={colors.sage}
          title="Appearance"
          description="Switch between the dark and light themes."
          index={2}
          backgroundColor={colors.surface}
          borderColor={colors.border}
          textColor={primaryText}
          descriptionColor={mutedText}
        >
          <ToggleRow
            label="Light mode"
            description="Use the soft paper theme throughout the app."
            value={themeName === "light"}
            onValueChange={(value) => {
              void setThemeName(value ? "light" : "dark");
            }}
            textColor={primaryText}
            descriptionColor={mutedText}
            trackFalse={colors.border}
            trackTrue={colors.brandBackground}
            thumbColor={themeName === "light" ? colors.brand : primaryText}
          />
        </SectionCard>

        <SectionCard
          icon="bell-outline"
          iconColor={colors.gold}
          title="Notifications"
          description={supported ? `Permission: ${enabled ? "Granted" : "Not granted"}` : "Requires a development build."}
          index={3}
          backgroundColor={colors.surface}
          borderColor={colors.border}
          textColor={primaryText}
          descriptionColor={mutedText}
        >
          <ToggleRow
            label="Daily reminders"
            description="Get reminded to capture a memory each day."
            value={dailyRemindersOn}
            onValueChange={setDailyRemindersOn}
            disabled={!supported}
            textColor={primaryText}
            descriptionColor={mutedText}
            trackFalse={colors.border}
            trackTrue={colors.goldBackground}
            thumbColor={colors.gold}
          />
          <ToggleRow
            label="Family activity"
            description="Notify when someone captures or comments."
            value={familyActivityOn}
            onValueChange={setFamilyActivityOn}
            disabled={!supported}
            textColor={primaryText}
            descriptionColor={mutedText}
            trackFalse={colors.border}
            trackTrue={colors.goldBackground}
            thumbColor={colors.gold}
          />
          <ToggleRow
            label="Nudges"
            description="Allow family members to nudge you."
            value={nudgesOn}
            onValueChange={setNudgesOn}
            disabled={!supported}
            textColor={primaryText}
            descriptionColor={mutedText}
            trackFalse={colors.border}
            trackTrue={colors.goldBackground}
            thumbColor={colors.gold}
          />

          <View style={{ marginTop: 12, flexDirection: "row", gap: 8 }}>
            <TextInput
              keyboardType="number-pad"
              value={hour}
              onChangeText={setHour}
              placeholder="Hour"
              placeholderTextColor={mutedText}
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: colors.border,
                paddingHorizontal: 12,
                paddingVertical: 10,
                fontFamily: "DMSans_400Regular",
                fontSize: 14,
                color: primaryText,
                backgroundColor: secondaryBackground
              }}
            />
            <TextInput
              keyboardType="number-pad"
              value={minute}
              onChangeText={setMinute}
              placeholder="Min"
              placeholderTextColor={mutedText}
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: colors.border,
                paddingHorizontal: 12,
                paddingVertical: 10,
                fontFamily: "DMSans_400Regular",
                fontSize: 14,
                color: primaryText,
                backgroundColor: secondaryBackground
              }}
            />
          </View>

          <PrimaryButton
            label="Save reminder"
            loading={reminderMutation.isPending}
            onPress={() => reminderMutation.mutate()}
            disabled={!supported}
            backgroundColor={colors.brand}
            borderColor={colors.brand}
            textColor="#FFFFFF"
          />
        </SectionCard>

        <SectionCard
          icon="credit-card-outline"
          iconColor={colors.blush}
          title="Billing"
          description="Manage your EverNest subscription."
          index={4}
          backgroundColor={colors.surface}
          borderColor={colors.border}
          textColor={primaryText}
          descriptionColor={mutedText}
        >
          <PrimaryButton
            label="Open checkout"
            loading={billingMutation.isPending}
            onPress={() => billingMutation.mutate()}
            backgroundColor={colors.surfaceSecondary}
            borderColor={colors.border}
            textColor={primaryText}
            variant="secondary"
          />
        </SectionCard>

        <SectionCard
          icon="download-outline"
          iconColor={colors.sage}
          title="Exports"
          description="Send an export package to your cloud storage."
          index={5}
          backgroundColor={colors.surface}
          borderColor={colors.border}
          textColor={primaryText}
          descriptionColor={mutedText}
        >
          <View style={{ gap: 8 }}>
            <PrimaryButton
              label="Google Drive export"
              onPress={() => exportMutation.mutate("google_drive")}
              backgroundColor={colors.surfaceSecondary}
              borderColor={colors.border}
              textColor={primaryText}
              variant="secondary"
            />
            <PrimaryButton
              label="iCloud export"
              onPress={() => exportMutation.mutate("icloud")}
              backgroundColor={colors.surfaceSecondary}
              borderColor={colors.border}
              textColor={primaryText}
              variant="secondary"
            />
            <PrimaryButton
              label="Direct download"
              onPress={() => exportMutation.mutate("download")}
              backgroundColor={colors.surfaceSecondary}
              borderColor={colors.border}
              textColor={primaryText}
              variant="secondary"
            />
          </View>

          {(exportsQuery.data ?? []).length > 0 ? (
            <View style={{ marginTop: 12, gap: 8 }}>
              {(exportsQuery.data ?? []).slice(0, 4).map((job) => (
                <View
                  key={job.id}
                  style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: secondaryBackground,
                    padding: 12
                  }}
                >
                  <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 12, color: primaryText }}>
                    {job.target} · {job.status}
                  </Text>
                  <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 10, color: mutedText, marginTop: 4 }}>
                    {new Date(job.createdAt).toLocaleString()}
                  </Text>
                  {job.resultUrl ? (
                    <Pressable
                      onPress={() => void Linking.openURL(job.resultUrl!)}
                      style={{
                        marginTop: 8,
                        alignSelf: "flex-start",
                        borderWidth: 1,
                        borderColor: colors.border,
                        paddingHorizontal: 12,
                        paddingVertical: BUTTON_PADDING_Y
                      }}
                    >
                      <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 10, color: primaryText }}>
                        Open link
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}
        </SectionCard>

        <SectionCard
          icon="logout"
          iconColor={mutedText}
          title="Session"
          description="Sign out of this device."
          index={6}
          backgroundColor={colors.surface}
          borderColor={colors.border}
          textColor={primaryText}
          descriptionColor={mutedText}
        >
          <PrimaryButton
            label="Sign out"
            onPress={() => setShowSignOutModal(true)}
            backgroundColor={colors.surfaceSecondary}
            borderColor={colors.border}
            textColor={primaryText}
            variant="secondary"
          />
        </SectionCard>

        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 320, delay: 350 }}
          style={{
            marginTop: 16,
            backgroundColor: colors.dangerBackground,
            padding: 18,
            borderWidth: 1,
            borderColor: colors.danger
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <View style={{ width: 38, height: 38, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center" }}>
              <MaterialCommunityIcons name="alert-circle-outline" size={20} color={colors.danger} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: "DMSans_500Medium", fontSize: 14, color: primaryText }}>Danger zone</Text>
              <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 11, color: mutedText, marginTop: 2 }}>
                Delete your account and all data. This cannot be undone.
              </Text>
            </View>
          </View>

          <SettingsInput
            value={deleteConfirmation}
            onChangeText={setDeleteConfirmation}
            placeholder="Type DELETE to confirm"
            placeholderTextColor={mutedText}
            textColor={primaryText}
            backgroundColor="rgba(255,255,255,0.5)"
            borderColor="rgba(255,255,255,0.55)"
            autoCapitalize="characters"
          />

          <PrimaryButton
            label="Delete account"
            loading={deleteAccountMutation.isPending}
            onPress={() => deleteAccountMutation.mutate()}
            backgroundColor={colors.danger}
            borderColor={colors.danger}
            textColor="#FFFFFF"
            variant="danger"
          />
        </MotiView>

        <View style={{ marginTop: 30, alignItems: "center" }}>
          <Text style={{ fontFamily: "DMSans_500Medium", fontSize: 13, color: mutedText }}>EverNest v0.1.0</Text>
          <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 11, color: mutedText, marginTop: 4 }}>
            Built for families. Made with care.
          </Text>
        </View>
      </ScrollView>

      <Modal
        visible={showSignOutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSignOutModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.45)",
            justifyContent: "center",
            paddingHorizontal: 20
          }}
        >
          <Pressable style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }} onPress={() => setShowSignOutModal(false)} />
          <View
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              padding: 20,
              gap: 14
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.surfaceSecondary,
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <MaterialCommunityIcons name="logout" size={18} color={colors.text} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: "DMSans_500Medium", fontSize: 15, color: colors.text }}>
                  Sign out?
                </Text>
                <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                  You will need to sign back in on this device to continue.
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                onPress={() => setShowSignOutModal(false)}
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.surfaceSecondary,
                  paddingVertical: BUTTON_PADDING_Y,
                  paddingHorizontal: 14
                }}
              >
                <Text style={{ textAlign: "center", fontFamily: "DMSans_400Regular", fontSize: 13, color: colors.text }}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setShowSignOutModal(false);
                  void logout();
                }}
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: colors.brand,
                  backgroundColor: colors.brand,
                  paddingVertical: BUTTON_PADDING_Y,
                  paddingHorizontal: 14
                }}
              >
                <Text style={{ textAlign: "center", fontFamily: "DMSans_500Medium", fontSize: 13, color: "#FFFFFF" }}>
                  Sign out
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
