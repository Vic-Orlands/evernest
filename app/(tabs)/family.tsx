import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MotiView } from "moti";
import { useWorkspace } from "@/hooks/use-workspace";
import { sendFamilyInvite } from "@/lib/collaboration";
import { queryKeys } from "@/lib/query-keys";
import { createChild, listFamilyMembers } from "../../lib/workspace";
import { Role } from "@/lib/types";

export default function FamilyScreen() {
  const queryClient = useQueryClient();
  const { workspace, workspaceLoading, workspaceError, refetchWorkspace } = useWorkspace();

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("editor");
  const [childName, setChildName] = useState("");

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
              onPress={() => {
                void membersQuery.refetch();
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
          <Text className="font-display text-4xl text-cream">Family Circle</Text>
          <Text className="mt-1 font-body text-xs text-moonDim">Shared access to your child’s memories.</Text>

          <View className="mt-5 rounded-2xl bg-night3 p-4">
            <Text className="font-bodybold text-sm text-cream">Invite guardian</Text>
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="guardian@email.com"
              placeholderTextColor="#8A8070"
              value={email}
              onChangeText={setEmail}
              className="mt-3 rounded-xl border border-night4 px-4 py-3 font-body text-moon"
            />

            <View className="mt-3 flex-row gap-2">
              {(["editor", "viewer"] as const).map((option) => (
                <Pressable
                  key={option}
                  onPress={() => setRole(option)}
                  className={`rounded-full px-3 py-2 ${role === option ? "bg-terracotta/20" : "border border-night4 bg-night4/40"}`}
                >
                  <Text className={`${role === option ? "text-blush" : "text-moonDim"} font-body text-[10px] uppercase`}>{option}</Text>
                </Pressable>
              ))}
            </View>

            <Pressable onPress={() => inviteMutation.mutate()} disabled={inviteMutation.isPending} className="mt-4 rounded-xl bg-terracotta px-4 py-3">
              <Text className="text-center font-bodybold text-sm text-cream">{inviteMutation.isPending ? "Sending..." : "Send invite link"}</Text>
            </Pressable>
          </View>

          <View className="mt-5 rounded-2xl bg-night3 p-4">
            <Text className="font-bodybold text-sm text-cream">Children</Text>
            <View className="mt-3 gap-2">
              {workspace.children.map((child) => (
                <View key={child.id} className="rounded-xl border border-night4 bg-night4/40 p-3">
                  <Text className="font-body text-sm text-moon">{child.firstName}</Text>
                </View>
              ))}
            </View>

            <TextInput
              placeholder="Add child name"
              placeholderTextColor="#8A8070"
              value={childName}
              onChangeText={setChildName}
              className="mt-4 rounded-xl border border-night4 px-4 py-3 font-body text-moon"
            />

            <Pressable onPress={() => childMutation.mutate()} disabled={childMutation.isPending} className="mt-3 rounded-xl border border-night4 px-4 py-3">
              <Text className="text-center font-body text-sm text-moon">{childMutation.isPending ? "Adding..." : "Add child"}</Text>
            </Pressable>
          </View>

          <View className="mt-5 rounded-2xl bg-night3 p-4">
            <Text className="font-bodybold text-sm text-cream">Recent activity</Text>
            <View className="mt-3 gap-2">
              {(membersQuery.data ?? []).map((member, index) => (
                <MotiView
                  key={member.id}
                  from={{ opacity: 0, translateY: 8 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ duration: 280, delay: index * 35 }}
                  className="rounded-xl border border-night4 bg-night4/40 p-3"
                >
                  <Text className="font-body text-sm text-moon">{member.fullName || member.email}</Text>
                  <Text className="mt-1 font-body text-[10px] uppercase tracking-[1px] text-moonDim">{member.role}</Text>
                </MotiView>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
