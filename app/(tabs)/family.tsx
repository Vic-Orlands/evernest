import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/hooks/use-workspace";
import { sendFamilyInvite } from "@/lib/collaboration";
import { queryKeys } from "@/lib/query-keys";
import { createChild, listFamilyMembers } from "@/lib/workspace";
import { Role } from "@/lib/types";

export default function FamilyScreen() {
  const queryClient = useQueryClient();
  const { workspace, workspaceLoading, refetchWorkspace } = useWorkspace();

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

  if (workspaceLoading || !workspace) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas-dark">
        <Text className="font-body text-zinc-300">Loading workspace...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-canvas-dark px-4 pt-14" contentContainerStyle={{ paddingBottom: 120 }}>
      <Text className="font-display text-4xl text-ink-dark">Family Collaboration</Text>
      <Text className="mt-1 font-body text-zinc-400">Invite guardians and manage your growing family profile.</Text>

      <View className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
        <Text className="font-bodybold text-zinc-100">Invite guardian</Text>
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="guardian@email.com"
          placeholderTextColor="#7B8598"
          value={email}
          onChangeText={setEmail}
          className="mt-3 rounded-xl border border-zinc-700 px-4 py-3 font-body text-zinc-100"
        />

        <View className="mt-3 flex-row gap-2">
          {(["editor", "viewer"] as const).map((option) => (
            <Pressable
              key={option}
              onPress={() => setRole(option)}
              className={`rounded-full px-3 py-2 ${role === option ? "bg-amber" : "border border-zinc-700"}`}
            >
              <Text className={`${role === option ? "text-zinc-900" : "text-zinc-300"} font-body text-xs uppercase`}>{option}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={() => inviteMutation.mutate()}
          disabled={inviteMutation.isPending}
          className="mt-4 rounded-xl bg-amber px-4 py-3"
        >
          <Text className="text-center font-bodybold text-zinc-900">{inviteMutation.isPending ? "Sending..." : "Send invite"}</Text>
        </Pressable>
      </View>

      <View className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
        <Text className="font-bodybold text-zinc-100">Children</Text>
        <View className="mt-3 gap-2">
          {workspace.children.map((child) => (
            <View key={child.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
              <Text className="font-body text-zinc-200">{child.firstName}</Text>
            </View>
          ))}
        </View>

        <TextInput
          placeholder="Add child name"
          placeholderTextColor="#7B8598"
          value={childName}
          onChangeText={setChildName}
          className="mt-4 rounded-xl border border-zinc-700 px-4 py-3 font-body text-zinc-100"
        />

        <Pressable
          onPress={() => childMutation.mutate()}
          disabled={childMutation.isPending}
          className="mt-3 rounded-xl border border-zinc-700 px-4 py-3"
        >
          <Text className="text-center font-body text-zinc-200">{childMutation.isPending ? "Adding..." : "Add child"}</Text>
        </Pressable>
      </View>

      <View className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
        <Text className="font-bodybold text-zinc-100">Members</Text>
        <View className="mt-3 gap-2">
          {(membersQuery.data ?? []).map((member) => (
            <View key={member.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
              <Text className="font-body text-zinc-200">{member.fullName || member.email}</Text>
              <Text className="mt-1 font-body text-xs uppercase tracking-wide text-zinc-500">{member.role}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
