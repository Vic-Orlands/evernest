import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MotiView } from "moti";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ProfileAvatar } from "@/components/profile-avatar";
import { useWorkspace } from "@/hooks/use-workspace";
import { useAppTheme } from "@/hooks/use-app-theme";
import { sendFamilyInvite } from "@/lib/collaboration";
import { sendNudge } from "@/lib/notifications";
import { queryKeys } from "@/lib/query-keys";
import { createChild, deleteChild, listFamilyMembers, listRecentFamilyActivity, updateChild } from "@/lib/workspace";
import { ChildProfile, Role } from "@/lib/types";

const BUTTON_PADDING_Y = 11;

function roleTone(role: Role, colors: ReturnType<typeof useAppTheme>["colors"]) {
  if (role === "owner") return { label: "Owner", color: colors.brand, icon: "crown-outline" as const };
  if (role === "editor") return { label: "Editor", color: colors.sage, icon: "pencil-outline" as const };
  return { label: "Viewer", color: colors.textMuted, icon: "eye-outline" as const };
}

function ChildCard({
  child,
  canManage,
  colors,
  onUpdate,
  onDelete
}: {
  child: ChildProfile;
  canManage: boolean;
  colors: ReturnType<typeof useAppTheme>["colors"];
  onUpdate: (childId: string, firstName: string, birthDate: string | null) => void;
  onDelete: (childId: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(child.firstName);
  const [editBirthDate, setEditBirthDate] = useState(child.birthDate ?? "");

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceSecondary,
        overflow: "hidden"
      }}
    >
      <View style={{ padding: 14, flexDirection: "row", alignItems: "center", gap: 12 }}>
        <ProfileAvatar
          avatarConfig={{
            skinToneId: "s2",
            hairColorId: "h4",
            hairStyleId: "curly",
            backgroundId: "gold"
          }}
          name={child.firstName}
          size={42}
        />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: "DMSans_500Medium", fontSize: 14, color: colors.text }}>{child.firstName}</Text>
          <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
            {child.birthDate ? new Date(child.birthDate).toDateString() : "Birth date not set"}
          </Text>
        </View>
        {canManage ? (
          <View style={{ flexDirection: "row", gap: 6 }}>
            <Pressable
              onPress={() => {
                setEditing((value) => !value);
                setEditName(child.firstName);
                setEditBirthDate(child.birthDate ?? "");
              }}
              style={{
                width: 34,
                height: 34,
                backgroundColor: editing ? colors.brandBackground : colors.surface,
                borderWidth: 1,
                borderColor: editing ? colors.brand : colors.border,
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <MaterialCommunityIcons name={editing ? "close" : "pencil-outline"} size={14} color={editing ? colors.brand : colors.textMuted} />
            </Pressable>
            <Pressable
              onPress={() => {
                Alert.alert(
                  "Remove child",
                  `Are you sure you want to remove ${child.firstName}? This will also remove all associated memories.`,
                  [
                    { text: "Cancel", style: "cancel" },
                    { text: "Remove", style: "destructive", onPress: () => onDelete(child.id) }
                  ]
                );
              }}
              style={{
                width: 34,
                height: 34,
                backgroundColor: colors.dangerBackground,
                borderWidth: 1,
                borderColor: colors.danger,
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <MaterialCommunityIcons name="trash-can-outline" size={14} color={colors.danger} />
            </Pressable>
          </View>
        ) : null}
      </View>

      {editing && canManage ? (
        <MotiView
          from={{ opacity: 0, translateY: -6 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 250 }}
          style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 8 }}
        >
          <TextInput
            value={editName}
            onChangeText={setEditName}
            placeholder="Child name"
            placeholderTextColor={colors.textMuted}
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              paddingHorizontal: 14,
              paddingVertical: BUTTON_PADDING_Y,
              fontFamily: "DMSans_400Regular",
              fontSize: 13,
              color: colors.text,
              backgroundColor: colors.surface
            }}
          />
          <TextInput
            value={editBirthDate}
            onChangeText={setEditBirthDate}
            placeholder="Birth date (YYYY-MM-DD)"
            placeholderTextColor={colors.textMuted}
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              paddingHorizontal: 14,
              paddingVertical: BUTTON_PADDING_Y,
              fontFamily: "DMSans_400Regular",
              fontSize: 13,
              color: colors.text,
              backgroundColor: colors.surface
            }}
          />
          <Pressable
            onPress={() => {
              onUpdate(child.id, editName, editBirthDate || null);
              setEditing(false);
            }}
            style={{
              backgroundColor: colors.brand,
              paddingHorizontal: 14,
              paddingVertical: BUTTON_PADDING_Y
            }}
          >
            <Text style={{ textAlign: "center", fontFamily: "DMSans_500Medium", fontSize: 13, color: "#FFFFFF" }}>
              Save changes
            </Text>
          </Pressable>
        </MotiView>
      ) : null}
    </View>
  );
}

export default function FamilyScreen() {
  const queryClient = useQueryClient();
  const { colors } = useAppTheme();
  const { workspace, workspaceLoading, workspaceError, refetchWorkspace, user } = useWorkspace();
  const [showInviteSheet, setShowInviteSheet] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("editor");
  const [childName, setChildName] = useState("");

  const canManageFamily = workspace?.role === "owner" || workspace?.role === "editor";

  const membersQuery = useQuery({
    queryKey: workspace ? queryKeys.familyMembers(workspace.family.id) : ["family-members", "guest"],
    enabled: Boolean(workspace),
    queryFn: async () => listFamilyMembers(workspace!.family.id)
  });

  const activityQuery = useQuery({
    queryKey: workspace ? queryKeys.familyActivity(workspace.family.id) : ["family-activity", "guest"],
    enabled: Boolean(workspace),
    queryFn: async () => listRecentFamilyActivity(workspace!.family.id)
  });

  const inviteMutation = useMutation({
    mutationFn: async () => {
      if (!workspace) throw new Error("Workspace unavailable");
      if (!email.trim() || !email.includes("@")) throw new Error("Enter a valid email address.");
      await sendFamilyInvite({ familyId: workspace.family.id, email, role });
    },
    onSuccess: async () => {
      Alert.alert("Invite sent", "A family invite email has been sent.");
      setEmail("");
      setShowInviteSheet(false);
      await queryClient.invalidateQueries({ queryKey: queryKeys.familyMembers(workspace!.family.id) });
    },
    onError: (error) => {
      Alert.alert("Invite failed", error instanceof Error ? error.message : "Unknown error");
    }
  });

  const childMutation = useMutation({
    mutationFn: async () => {
      if (!workspace) throw new Error("Workspace unavailable");
      if (!childName.trim()) throw new Error("Enter child name");
      await createChild(workspace.family.id, childName.trim());
    },
    onSuccess: async () => {
      setChildName("");
      await refetchWorkspace();
    },
    onError: (error) => {
      Alert.alert("Could not add child", error instanceof Error ? error.message : "Unknown error");
    }
  });

  const updateChildMutation = useMutation({
    mutationFn: async ({ childId, firstName, birthDate }: { childId: string; firstName: string; birthDate: string | null }) => {
      await updateChild(childId, { firstName, birthDate });
    },
    onSuccess: async () => {
      await refetchWorkspace();
      Alert.alert("Child updated", "Profile has been saved.");
    }
  });

  const deleteChildMutation = useMutation({
    mutationFn: async (childId: string) => {
      await deleteChild(childId);
    },
    onSuccess: async () => {
      await refetchWorkspace();
      Alert.alert("Child removed", "The child profile has been removed.");
    }
  });

  const handleNudge = async (targetUserId: string) => {
    if (!workspace) {
      return;
    }

    try {
      await sendNudge(targetUserId, workspace.family.id);
      Alert.alert("Nudge sent", "They’ll get a reminder to capture a memory today.");
    } catch {
      Alert.alert("Could not send nudge", "Please try again later.");
    }
  };

  const refreshAll = async () => {
    await refetchWorkspace();
    await Promise.all([membersQuery.refetch(), activityQuery.refetch()]);
  };

  const counts = useMemo(() => {
    const members = membersQuery.data ?? [];
    return {
      total: members.length,
      editors: members.filter((member) => member.role === "owner" || member.role === "editor").length,
      viewers: members.filter((member) => member.role === "viewer").length
    };
  }, [membersQuery.data]);

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
            <Text style={{ fontFamily: "InstrumentSerif_400Regular", fontSize: 30, color: colors.text }}>
              Workspace unavailable
            </Text>
            <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 13, color: colors.textMuted, marginTop: 8 }}>
              {workspaceError instanceof Error ? workspaceError.message : "Could not load your family workspace."}
            </Text>
            <Pressable
              onPress={() => {
                void refetchWorkspace();
              }}
              style={{
                marginTop: 16,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                paddingHorizontal: 16,
                paddingVertical: BUTTON_PADDING_Y
              }}
            >
              <Text style={{ textAlign: "center", fontFamily: "DMSans_400Regular", fontSize: 13, color: colors.text }}>
                Retry workspace sync
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (membersQuery.error) {
    return (
      <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.backgroundSecondary }}>
        <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ flex: 1 }}>
          <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
            <Text style={{ fontFamily: "InstrumentSerif_400Regular", fontSize: 30, color: colors.text }}>
              Could not load family
            </Text>
            <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 13, color: colors.textMuted, marginTop: 8 }}>
              {membersQuery.error instanceof Error ? membersQuery.error.message : "Unknown error"}
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.backgroundSecondary }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={membersQuery.isRefetching || activityQuery.isRefetching} onRefresh={() => void refreshAll()} tintColor={colors.brand} />}
      >
        <Text style={{ fontFamily: "InstrumentSerif_400Regular", fontSize: 38, color: colors.text }}>Family Circle</Text>
        <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 12, color: colors.textMuted, marginTop: 4 }}>
          Invite parents, guardians, and grandparents into the same living archive.
        </Text>

        <View style={{ marginTop: 16, flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 16 }}>
            <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 10, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 2 }}>
              Your role
            </Text>
            <Text style={{ fontFamily: "InstrumentSerif_400Regular", fontSize: 30, color: colors.text, marginTop: 8 }}>
              {roleTone(workspace.role, colors).label}
            </Text>
          </View>
          <View style={{ flex: 1, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 16 }}>
            <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 10, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 2 }}>
              Members
            </Text>
            <Text style={{ fontFamily: "InstrumentSerif_400Regular", fontSize: 30, color: colors.text, marginTop: 8 }}>
              {counts.total}
            </Text>
          </View>
        </View>

        <View style={{ marginTop: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 16 }}>
          <Pressable
            onPress={() => setShowInviteSheet((value) => !value)}
            style={{
              borderWidth: 1,
              borderColor: colors.brand,
              backgroundColor: colors.brandBackground,
              paddingHorizontal: 16,
              paddingVertical: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between"
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ width: 38, height: 38, backgroundColor: `${colors.brand}18`, alignItems: "center", justifyContent: "center" }}>
                <MaterialCommunityIcons name="email-plus-outline" size={18} color={colors.brand} />
              </View>
              <View>
                <Text style={{ fontFamily: "DMSans_500Medium", fontSize: 14, color: colors.text }}>Invite family</Text>
                <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                  {canManageFamily ? "Open the invite form" : "Only owners and editors can send invites"}
                </Text>
              </View>
            </View>
            <MaterialCommunityIcons
              name={showInviteSheet ? "chevron-up" : "chevron-down"}
              size={20}
              color={colors.brand}
            />
          </Pressable>

          {showInviteSheet ? (
            <MotiView
              from={{ opacity: 0, translateY: -8 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 260 }}
              style={{ marginTop: 14 }}
            >
              <TextInput
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="guardian@email.com"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                editable={canManageFamily}
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  paddingHorizontal: 16,
                  paddingVertical: BUTTON_PADDING_Y,
                  fontFamily: "DMSans_400Regular",
                  fontSize: 14,
                  color: colors.text,
                  backgroundColor: colors.surfaceSecondary
                }}
              />

              <View style={{ marginTop: 12, flexDirection: "row", gap: 8 }}>
                {(["editor", "viewer"] as const).map((option) => (
                  <Pressable
                    key={option}
                    onPress={() => setRole(option)}
                    disabled={!canManageFamily}
                    style={{
                      borderWidth: 1,
                      paddingHorizontal: 14,
                      paddingVertical: 7,
                      borderColor: role === option ? colors.brand : colors.border,
                      backgroundColor: role === option ? colors.brandBackground : colors.surfaceSecondary
                    }}
                  >
                    <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 11, textTransform: "uppercase", color: role === option ? colors.brand : colors.textMuted }}>
                      {option}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Pressable
                onPress={() => inviteMutation.mutate()}
                disabled={inviteMutation.isPending || !canManageFamily}
                style={{
                  marginTop: 14,
                  backgroundColor: colors.brand,
                  paddingHorizontal: 16,
                  paddingVertical: BUTTON_PADDING_Y,
                  opacity: !canManageFamily ? 0.5 : 1
                }}
              >
                <Text style={{ textAlign: "center", fontFamily: "DMSans_500Medium", fontSize: 14, color: "#FFFFFF" }}>
                  {inviteMutation.isPending ? "Sending..." : "Send invite link"}
                </Text>
              </Pressable>
            </MotiView>
          ) : null}
        </View>

        <View style={{ marginTop: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <Text style={{ fontFamily: "DMSans_500Medium", fontSize: 14, color: colors.text }}>Children</Text>
            <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 11, color: colors.textMuted }}>
              {workspace.children.length} profiles
            </Text>
          </View>

          <View style={{ gap: 10 }}>
            {workspace.children.map((child) => (
              <ChildCard
                key={child.id}
                child={child}
                canManage={canManageFamily}
                colors={colors}
                onUpdate={(childId, firstName, birthDate) => updateChildMutation.mutate({ childId, firstName, birthDate })}
                onDelete={(childId) => deleteChildMutation.mutate(childId)}
              />
            ))}
          </View>

          <TextInput
            placeholder="Add child name"
            placeholderTextColor={colors.textMuted}
            value={childName}
            onChangeText={setChildName}
            editable={canManageFamily}
            style={{
              marginTop: 14,
              borderWidth: 1,
              borderColor: colors.border,
              paddingHorizontal: 16,
              paddingVertical: BUTTON_PADDING_Y,
              fontFamily: "DMSans_400Regular",
              fontSize: 14,
              color: colors.text,
              backgroundColor: colors.surfaceSecondary
            }}
          />

          <Pressable
            onPress={() => childMutation.mutate()}
            disabled={childMutation.isPending || !canManageFamily}
            style={{
              marginTop: 12,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surfaceSecondary,
              paddingHorizontal: 16,
              paddingVertical: BUTTON_PADDING_Y,
              opacity: !canManageFamily ? 0.5 : 1
            }}
          >
            <Text style={{ textAlign: "center", fontFamily: "DMSans_400Regular", fontSize: 14, color: colors.text }}>
              {childMutation.isPending ? "Adding..." : "Add child"}
            </Text>
          </Pressable>
        </View>

        <View style={{ marginTop: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <Text style={{ fontFamily: "DMSans_500Medium", fontSize: 14, color: colors.text }}>Family members</Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 10, color: colors.textMuted }}>Editors {counts.editors}</Text>
              <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 10, color: colors.textMuted }}>Viewers {counts.viewers}</Text>
            </View>
          </View>

          <View style={{ gap: 8 }}>
            {(membersQuery.data ?? []).map((member) => {
              const meta = roleTone(member.role, colors);
              const isCurrentUser = member.id === user?.id;

              return (
                <MotiView
                  key={member.id}
                  from={{ opacity: 0, translateY: 8 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ duration: 280 }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.surfaceSecondary,
                    padding: 12,
                    gap: 10
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                    <ProfileAvatar
                      imageUrl={member.avatarUrl}
                      avatarConfig={member.avatarConfig}
                      name={member.fullName || member.email}
                      size={42}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: "DMSans_500Medium", fontSize: 13, color: colors.text }}>
                        {member.fullName || member.email}
                        {isCurrentUser ? " (you)" : ""}
                      </Text>
                      <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 10, color: colors.textMuted, marginTop: 2 }}>
                        {member.email}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    {!isCurrentUser && canManageFamily ? (
                      <Pressable
                        onPress={() => void handleNudge(member.id)}
                        style={{
                          width: 34,
                          height: 34,
                          backgroundColor: colors.goldBackground,
                          borderWidth: 1,
                          borderColor: colors.gold,
                          alignItems: "center",
                          justifyContent: "center"
                        }}
                      >
                        <MaterialCommunityIcons name="hand-wave-outline" size={16} color={colors.gold} />
                      </Pressable>
                    ) : null}

                    <View
                      style={{
                        borderWidth: 1,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderColor: `${meta.color}50`,
                        backgroundColor: `${meta.color}16`
                      }}
                    >
                      <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 10, textTransform: "uppercase", color: meta.color }}>
                        {meta.label}
                      </Text>
                    </View>
                  </View>
                </MotiView>
              );
            })}
          </View>
        </View>

        <View style={{ marginTop: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 16 }}>
          <Text style={{ fontFamily: "DMSans_500Medium", fontSize: 10, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1.6, marginBottom: 12 }}>
            Recent activity
          </Text>
          <View style={{ gap: 10 }}>
            {(activityQuery.data ?? []).slice(0, 3).map((item) => (
              <View key={item.id} style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                <ProfileAvatar
                  imageUrl={item.actorAvatarUrl}
                  avatarConfig={item.actorAvatarConfig}
                  name={item.actorName}
                  size={24}
                  ring={false}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: "DMSans_500Medium", fontSize: 11, color: colors.text }}>
                    {item.actorName}{" "}
                    <Text style={{ fontFamily: "DMSans_400Regular", color: colors.textMuted }}>
                      {item.action}
                    </Text>
                  </Text>
                </View>
                <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 9, color: colors.textMuted }}>
                  {item.timeLabel}
                </Text>
              </View>
            ))}
            {(activityQuery.data ?? []).length === 0 ? (
              <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 12, color: colors.textMuted }}>
                Activity will appear here as memories and notes are added.
              </Text>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
