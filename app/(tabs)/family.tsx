import { useMemo, useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MotiView } from "moti";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useWorkspace } from "@/hooks/use-workspace";
import { sendFamilyInvite } from "@/lib/collaboration";
import { sendNudge } from "@/lib/notifications";
import { queryKeys } from "@/lib/query-keys";
import { createChild, listFamilyMembers } from "../../lib/workspace";
import { Role } from "@/lib/types";
import { T } from "@/lib/theme";

const roleMeta: Record<Role, { label: string; color: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }> = {
  owner: { label: "Owner", color: T.terracotta, icon: "crown-outline" },
  editor: { label: "Editor", color: T.sage, icon: "pencil-outline" },
  viewer: { label: "Viewer", color: T.moonDim, icon: "eye-outline" }
};

const avatarColors = [T.terracotta, T.sage, T.gold, "#8B9CF7", T.blush, T.sageLight];

export default function FamilyScreen() {
  const queryClient = useQueryClient();
  const { workspace, workspaceLoading, workspaceError, refetchWorkspace, user } = useWorkspace();

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("editor");
  const [childName, setChildName] = useState("");

  const canManageFamily = workspace?.role === "owner" || workspace?.role === "editor";

  const membersQuery = useQuery({
    queryKey: workspace ? queryKeys.familyMembers(workspace.family.id) : ["family-members", "guest"],
    enabled: Boolean(workspace),
    queryFn: async () => listFamilyMembers(workspace!.family.id)
  });

  const inviteMutation = useMutation({
    mutationFn: async () => {
      if (!workspace) throw new Error("Workspace unavailable");
      await sendFamilyInvite({ familyId: workspace.family.id, email, role });
    },
    onSuccess: async () => {
      Alert.alert("Invite sent", "A secure invite email has been sent.");
      setEmail("");
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

  const handleNudge = async (targetUserId: string) => {
    try {
      const senderName = user?.name?.split(" ")[0] ?? "Someone";
      await sendNudge(targetUserId, senderName);
      Alert.alert("Nudge sent 💛", "They'll get a reminder to capture a memory today.");
    } catch {
      Alert.alert("Could not send nudge", "Please try again later.");
    }
  };

  const refreshAll = async () => {
    await refetchWorkspace();
    await membersQuery.refetch();
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
              onPress={() => { void refetchWorkspace(); }}
              style={{ marginTop: 16, borderWidth: 1, borderColor: T.night4, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14 }}
            >
              <Text className="text-center font-body text-sm text-moon">Retry workspace sync</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (membersQuery.error) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-night2">
        <ScrollView contentInsetAdjustmentBehavior="automatic" className="flex-1 bg-night2">
          <View className="px-5 pt-5">
            <Text className="font-display text-3xl text-cream">Could not load family</Text>
            <Text className="mt-2 font-body text-sm text-moonDim">
              {membersQuery.error instanceof Error ? membersQuery.error.message : "Unknown error"}
            </Text>
            <Pressable
              onPress={() => { void membersQuery.refetch(); }}
              style={{ marginTop: 16, borderWidth: 1, borderColor: T.night4, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14 }}
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
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        className="flex-1 bg-night2"
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={membersQuery.isRefetching} onRefresh={() => void refreshAll()} tintColor={T.terracotta} />}
      >
        <View className="px-5 pt-4">
          <Text className="font-display text-4xl text-cream">Family Circle</Text>
          <Text className="mt-1 font-body text-xs text-moonDim">
            Invite parents, guardians, and grandparents into the same living archive.
          </Text>

          {/* Stats */}
          <View style={{ marginTop: 16, flexDirection: "row", gap: 12 }}>
            <View
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: T.night4,
                backgroundColor: T.night3,
                paddingHorizontal: 16,
                paddingVertical: 16,
                borderRadius: 16
              }}
            >
              <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 10, color: T.moonDim, textTransform: "uppercase", letterSpacing: 2 }}>
                Your role
              </Text>
              <Text className="mt-2 font-display text-3xl text-cream">{roleMeta[workspace.role].label}</Text>
            </View>
            <View
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: T.night4,
                backgroundColor: T.night3,
                paddingHorizontal: 16,
                paddingVertical: 16,
                borderRadius: 16
              }}
            >
              <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 10, color: T.moonDim, textTransform: "uppercase", letterSpacing: 2 }}>
                Members
              </Text>
              <Text className="mt-2 font-display text-3xl text-cream">{counts.total}</Text>
            </View>
          </View>

          {/* Invite section */}
          <View
            style={{
              marginTop: 20,
              borderWidth: 1,
              borderColor: T.night4,
              backgroundColor: T.night3,
              paddingHorizontal: 16,
              paddingVertical: 16,
              borderRadius: 16
            }}
          >
            <Text className="font-bodybold text-sm text-cream">Invite guardian</Text>
            <Text className="mt-1 font-body text-xs text-moonDim">
              {canManageFamily ? "Send a role-based invite link by email." : "Only owners and editors can send invites."}
            </Text>
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="guardian@email.com"
              placeholderTextColor={T.moonDim}
              value={email}
              onChangeText={setEmail}
              editable={canManageFamily}
              style={{
                marginTop: 12,
                borderWidth: 1,
                borderColor: T.night4,
                paddingHorizontal: 16,
                paddingVertical: 12,
                fontFamily: "DMSans_400Regular",
                fontSize: 14,
                color: T.moon,
                borderRadius: 14,
                backgroundColor: "rgba(46,38,32,0.25)"
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
                    paddingVertical: 8,
                    borderRadius: 20,
                    borderColor: role === option ? "rgba(196,98,58,0.45)" : T.night4,
                    backgroundColor: role === option ? "rgba(196,98,58,0.20)" : "rgba(46,38,32,0.40)"
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "DMSans_400Regular",
                      fontSize: 10,
                      textTransform: "uppercase",
                      color: role === option ? T.blush : T.moonDim
                    }}
                  >
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
                backgroundColor: T.terracotta,
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderRadius: 14,
                opacity: !canManageFamily ? 0.5 : 1
              }}
            >
              <Text style={{ textAlign: "center", fontFamily: "DMSans_500Medium", fontSize: 14, color: T.cream }}>
                {inviteMutation.isPending ? "Sending..." : "Send invite link"}
              </Text>
            </Pressable>
          </View>

          {/* Children */}
          <View
            style={{
              marginTop: 20,
              borderWidth: 1,
              borderColor: T.night4,
              backgroundColor: T.night3,
              paddingHorizontal: 16,
              paddingVertical: 16,
              borderRadius: 16
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text className="font-bodybold text-sm text-cream">Children</Text>
              <Text className="font-body text-xs text-moonDim">{workspace.children.length} profiles</Text>
            </View>

            <View style={{ marginTop: 12, gap: 8 }}>
              {workspace.children.map((child, idx) => (
                <View
                  key={child.id}
                  style={{
                    borderWidth: 1,
                    borderColor: T.night4,
                    backgroundColor: "rgba(46,38,32,0.40)",
                    padding: 12,
                    borderRadius: 12,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: `${avatarColors[idx % avatarColors.length]}30`,
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    <Text style={{ fontFamily: "DMSans_500Medium", fontSize: 14, color: avatarColors[idx % avatarColors.length] }}>
                      {child.firstName.slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <Text className="font-body text-sm text-moon">{child.firstName}</Text>
                    <Text className="mt-1 font-body text-moonDim" style={{ fontSize: 10 }}>
                      {child.birthDate ? new Date(child.birthDate).toDateString() : "Birth date not set"}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            <TextInput
              placeholder="Add child name"
              placeholderTextColor={T.moonDim}
              value={childName}
              onChangeText={setChildName}
              editable={canManageFamily}
              style={{
                marginTop: 14,
                borderWidth: 1,
                borderColor: T.night4,
                paddingHorizontal: 16,
                paddingVertical: 12,
                fontFamily: "DMSans_400Regular",
                fontSize: 14,
                color: T.moon,
                borderRadius: 14,
                backgroundColor: "rgba(46,38,32,0.25)"
              }}
            />

            <Pressable
              onPress={() => childMutation.mutate()}
              disabled={childMutation.isPending || !canManageFamily}
              style={{
                marginTop: 12,
                borderWidth: 1,
                borderColor: T.night4,
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderRadius: 14,
                opacity: !canManageFamily ? 0.5 : 1
              }}
            >
              <Text style={{ textAlign: "center", fontFamily: "DMSans_400Regular", fontSize: 14, color: T.moon }}>
                {childMutation.isPending ? "Adding..." : "Add child"}
              </Text>
            </Pressable>
          </View>

          {/* Family members with nudge */}
          <View
            style={{
              marginTop: 20,
              borderWidth: 1,
              borderColor: T.night4,
              backgroundColor: T.night3,
              paddingHorizontal: 16,
              paddingVertical: 16,
              borderRadius: 16
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text className="font-bodybold text-sm text-cream">Family members</Text>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 10, color: T.moonDim }}>Editors {counts.editors}</Text>
                <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 10, color: T.moonDim }}>Viewers {counts.viewers}</Text>
              </View>
            </View>
            <View style={{ marginTop: 12, gap: 8 }}>
              {(membersQuery.data ?? []).map((member, index) => {
                const meta = roleMeta[member.role];
                const color = avatarColors[index % avatarColors.length];
                const isCurrentUser = member.id === user?.id;

                return (
                  <MotiView
                    key={member.id}
                    from={{ opacity: 0, translateY: 8 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ duration: 280, delay: index * 35 }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      borderWidth: 1,
                      borderColor: T.night4,
                      backgroundColor: "rgba(46,38,32,0.40)",
                      padding: 12,
                      borderRadius: 14
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                      {/* Colored avatar circle */}
                      <View
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 21,
                          backgroundColor: `${color}25`,
                          borderWidth: 2,
                          borderColor: `${color}40`,
                          alignItems: "center",
                          justifyContent: "center"
                        }}
                      >
                        <Text style={{ fontFamily: "DMSans_500Medium", fontSize: 16, color }}>
                          {(member.fullName || member.email || "G").slice(0, 1).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text className="font-body text-sm text-moon">
                          {member.fullName || member.email}
                          {isCurrentUser ? " (you)" : ""}
                        </Text>
                        <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 10, color: T.moonDim, marginTop: 2 }}>
                          {member.email}
                        </Text>
                      </View>
                    </View>

                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      {/* Nudge button — only show for other members */}
                      {!isCurrentUser && canManageFamily ? (
                        <Pressable
                          onPress={() => void handleNudge(member.id)}
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 17,
                            backgroundColor: "rgba(212,168,67,0.15)",
                            borderWidth: 1,
                            borderColor: "rgba(212,168,67,0.30)",
                            alignItems: "center",
                            justifyContent: "center"
                          }}
                        >
                          <MaterialCommunityIcons name="hand-wave-outline" size={16} color={T.gold} />
                        </Pressable>
                      ) : null}

                      {/* Role pill */}
                      <View
                        style={{
                          borderWidth: 1,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 20,
                          borderColor: `${meta.color}40`,
                          backgroundColor: `${meta.color}18`
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: "DMSans_400Regular",
                            fontSize: 10,
                            textTransform: "uppercase",
                            color: meta.color
                          }}
                        >
                          {meta.label}
                        </Text>
                      </View>
                    </View>
                  </MotiView>
                );
              })}
            </View>
          </View>

          {/* Permissions guide */}
          <View
            style={{
              marginTop: 20,
              borderWidth: 1,
              borderColor: T.night4,
              backgroundColor: T.night3,
              paddingHorizontal: 16,
              paddingVertical: 16,
              borderRadius: 16
            }}
          >
            <Text className="font-bodybold text-sm text-cream">Permissions guide</Text>
            <View style={{ marginTop: 12, gap: 10 }}>
              {(["owner", "editor", "viewer"] as const).map((r) => {
                const m = roleMeta[r];
                const descriptions: Record<Role, string> = {
                  owner: "Manage billing, invite members, add children, and delete the account.",
                  editor: "Capture memories, comment, react, create capsules, and invite viewers.",
                  viewer: "Browse the archive and leave reactions or comments where allowed."
                };
                return (
                  <View key={r} style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
                    <MaterialCommunityIcons name={m.icon} size={16} color={m.color} style={{ marginTop: 2 }} />
                    <Text style={{ flex: 1, fontFamily: "DMSans_400Regular", fontSize: 12, lineHeight: 20, color: T.moonDim }}>
                      <Text style={{ color: T.moon }}>{m.label} — </Text>
                      {descriptions[r]}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
