import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CapsuleCard } from "@/components/capsule-card";
import { ChildSwitcher } from "@/components/child-switcher";
import { useWorkspace } from "@/hooks/use-workspace";
import { createCapsule, listCapsules, listMemories } from "@/lib/repositories";
import { queryKeys } from "@/lib/query-keys";

export default function CapsulesScreen() {
  const queryClient = useQueryClient();
  const { workspace, workspaceLoading, activeChild, setActiveChildId } = useWorkspace();

  const [title, setTitle] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [selectedMemoryIds, setSelectedMemoryIds] = useState<string[]>([]);

  const capsulesQuery = useQuery({
    queryKey: workspace && activeChild ? queryKeys.capsules(workspace.family.id, activeChild.id) : ["capsules", "guest"],
    enabled: Boolean(workspace && activeChild),
    queryFn: async () => listCapsules(workspace!.family.id, activeChild!.id)
  });

  const memoriesQuery = useQuery({
    queryKey: workspace && activeChild ? queryKeys.memories(workspace.family.id, activeChild.id) : ["memories", "guest"],
    enabled: Boolean(workspace && activeChild),
    queryFn: async () => listMemories(workspace!.family.id, activeChild!.id)
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!workspace || !activeChild) throw new Error("Workspace unavailable");
      if (!releaseDate) throw new Error("Enter release date in YYYY-MM-DD format");

      const parsedRelease = new Date(`${releaseDate}T09:00:00.000Z`);
      if (Number.isNaN(parsedRelease.getTime())) throw new Error("Invalid release date");

      await createCapsule({
        familyId: workspace.family.id,
        childId: activeChild.id,
        title,
        recipientEmail,
        releaseAt: parsedRelease.toISOString(),
        memoryIds: selectedMemoryIds
      });
    },
    onSuccess: async () => {
      Alert.alert("Capsule scheduled", "EverNest will deliver this on the release date.");
      setTitle("");
      setRecipientEmail("");
      setReleaseDate("");
      setSelectedMemoryIds([]);

      if (!workspace || !activeChild) return;
      await queryClient.invalidateQueries({ queryKey: queryKeys.capsules(workspace.family.id, activeChild.id) });
    },
    onError: (error) => {
      Alert.alert("Could not schedule", error instanceof Error ? error.message : "Unknown error");
    }
  });

  const memoryOptions = useMemo(() => (memoriesQuery.data ?? []).slice(0, 20), [memoriesQuery.data]);

  const toggleMemory = (id: string) => {
    setSelectedMemoryIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  if (workspaceLoading || !workspace || !activeChild) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas-dark">
        <Text className="font-body text-zinc-300">Loading workspace...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-canvas-dark px-4 pt-14" contentContainerStyle={{ paddingBottom: 120 }}>
      <Text className="font-display text-4xl text-ink-dark">Time Capsules</Text>
      <Text className="mt-1 font-body text-zinc-400">Send memory bundles in the future, like their 18th birthday.</Text>

      <ChildSwitcher childProfiles={workspace.children} activeChildId={activeChild.id} onSelect={setActiveChildId} />

      <View className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
        <Text className="font-bodybold text-zinc-100">Create capsule</Text>

        <TextInput
          placeholder="Capsule title"
          placeholderTextColor="#7B8598"
          value={title}
          onChangeText={setTitle}
          className="mt-3 rounded-xl border border-zinc-700 px-4 py-3 font-body text-zinc-100"
        />
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="Recipient email"
          placeholderTextColor="#7B8598"
          value={recipientEmail}
          onChangeText={setRecipientEmail}
          className="mt-3 rounded-xl border border-zinc-700 px-4 py-3 font-body text-zinc-100"
        />
        <TextInput
          placeholder="Release date (YYYY-MM-DD)"
          placeholderTextColor="#7B8598"
          value={releaseDate}
          onChangeText={setReleaseDate}
          className="mt-3 rounded-xl border border-zinc-700 px-4 py-3 font-body text-zinc-100"
        />

        <Text className="mt-4 font-bodybold text-zinc-100">Select memories</Text>
        <View className="mt-2 gap-2">
          {memoryOptions.map((memory) => {
            const active = selectedMemoryIds.includes(memory.id);
            return (
              <Pressable
                key={memory.id}
                onPress={() => toggleMemory(memory.id)}
                className={`rounded-xl border px-3 py-3 ${active ? "border-amber bg-amber/10" : "border-zinc-800 bg-zinc-900"}`}
              >
                <Text className="font-body text-zinc-200">{memory.title}</Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="mt-4 rounded-xl bg-amber px-4 py-3"
        >
          <Text className="text-center font-bodybold text-zinc-900">{saveMutation.isPending ? "Scheduling..." : "Schedule capsule"}</Text>
        </Pressable>
      </View>

      <View className="mt-5">
        {(capsulesQuery.data ?? []).map((capsule) => (
          <CapsuleCard key={capsule.id} capsule={capsule} />
        ))}
      </View>
    </ScrollView>
  );
}
