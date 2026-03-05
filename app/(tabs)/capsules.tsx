import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MotiView } from "moti";
import { ChildSwitcher } from "@/components/child-switcher";
import { useWorkspace } from "@/hooks/use-workspace";
import { createCapsule, listCapsules, listMemories } from "@/lib/repositories";
import { queryKeys } from "@/lib/query-keys";

export default function CapsulesScreen() {
  const queryClient = useQueryClient();
  const { workspace, workspaceLoading, workspaceError, refetchWorkspace, activeChild, setActiveChildId } = useWorkspace();

  const [title, setTitle] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [selectedMemoryIds, setSelectedMemoryIds] = useState<string[]>([]);
  const [showCreate, setShowCreate] = useState(false);

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
      setShowCreate(false);

      if (!workspace || !activeChild) return;
      await queryClient.invalidateQueries({ queryKey: queryKeys.capsules(workspace.family.id, activeChild.id) });
    },
    onError: (error) => {
      Alert.alert("Could not schedule", error instanceof Error ? error.message : "Unknown error");
    }
  });

  const memoryOptions = useMemo(() => (memoriesQuery.data ?? []).slice(0, 16), [memoriesQuery.data]);

  const toggleMemory = (id: string) => {
    setSelectedMemoryIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
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

  if (!workspace || !activeChild) {
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

  if (capsulesQuery.error || memoriesQuery.error) {
    const message = capsulesQuery.error instanceof Error
      ? capsulesQuery.error.message
      : memoriesQuery.error instanceof Error
        ? memoriesQuery.error.message
        : "Unknown error";

    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-night2">
        <ScrollView contentInsetAdjustmentBehavior="automatic" className="flex-1 bg-night2">
          <View className="px-5 pt-5">
            <Text className="font-display text-3xl text-cream">Could not load capsules</Text>
            <Text className="mt-2 font-body text-sm text-moonDim">{message}</Text>
            <Pressable
              onPress={() => {
                void capsulesQuery.refetch();
                void memoriesQuery.refetch();
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
          <Text className="text-center text-6xl">🏺</Text>
          <Text className="text-center font-display text-4xl text-cream">Time Capsules</Text>
          <Text className="mt-1 text-center font-body text-xs text-moonDim">Memories sealed for the perfect future moment.</Text>

          <ChildSwitcher childProfiles={workspace.children} activeChildId={activeChild.id} onSelect={setActiveChildId} />

          <Pressable
            onPress={() => setShowCreate((prev) => !prev)}
            className="mt-4 rounded-2xl border border-gold/45 bg-gold/10 px-4 py-4"
          >
            <Text className="text-center font-bodybold text-sm text-gold">✦ Create new time capsule</Text>
          </Pressable>

          {showCreate ? (
            <MotiView from={{ opacity: 0, translateY: -6 }} animate={{ opacity: 1, translateY: 0 }} className="mt-3 rounded-2xl border border-gold/30 bg-night3 p-4">
              <TextInput
                placeholder="Capsule title"
                placeholderTextColor="#8A8070"
                value={title}
                onChangeText={setTitle}
                className="mb-2 rounded-xl border border-night4 px-3 py-2 font-body text-moon"
              />
              <TextInput
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="Recipient email"
                placeholderTextColor="#8A8070"
                value={recipientEmail}
                onChangeText={setRecipientEmail}
                className="mb-2 rounded-xl border border-night4 px-3 py-2 font-body text-moon"
              />
              <TextInput
                placeholder="Unlock date (YYYY-MM-DD)"
                placeholderTextColor="#8A8070"
                value={releaseDate}
                onChangeText={setReleaseDate}
                className="mb-3 rounded-xl border border-night4 px-3 py-2 font-body text-moon"
              />

              <Text className="mb-2 font-body text-[10px] uppercase tracking-[2px] text-moonDim">Select memories</Text>
              <View className="gap-2">
                {memoryOptions.map((memory) => {
                  const active = selectedMemoryIds.includes(memory.id);
                  return (
                    <Pressable
                      key={memory.id}
                      onPress={() => toggleMemory(memory.id)}
                      className={`rounded-xl border px-3 py-2 ${active ? "border-gold bg-gold/15" : "border-night4 bg-night4/40"}`}
                    >
                      <Text className="font-body text-xs text-moon">{memory.title}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable
                onPress={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="mt-3 rounded-xl bg-terracotta px-4 py-3"
              >
                <Text className="text-center font-bodybold text-sm text-cream">{saveMutation.isPending ? "Sealing..." : "Seal capsule 🔒"}</Text>
              </Pressable>
            </MotiView>
          ) : null}

          <View className="mt-5 gap-3">
            {(capsulesQuery.data ?? []).map((capsule, index) => (
              <MotiView
                key={capsule.id}
                from={{ opacity: 0, translateY: 10 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ duration: 320, delay: index * 40 }}
                className="rounded-2xl border border-gold/25 bg-night3 px-4 py-4"
              >
                <Text className="font-bodybold text-sm text-goldLight">{capsule.title}</Text>
                <Text className="mt-1 font-body text-xs text-moonDim">To {capsule.recipientEmail}</Text>
                <Text className="mt-1 font-body text-xs text-moonDim">{new Date(capsule.releaseAt).toDateString()} · {capsule.status}</Text>
              </MotiView>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
