import { useMemo, useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MotiView } from "moti";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ChildSwitcher } from "@/components/child-switcher";
import { useWorkspace } from "@/hooks/use-workspace";
import { createCapsule, listCapsules, listMemories } from "@/lib/repositories";
import { queryKeys } from "@/lib/query-keys";
import { T } from "@/lib/theme";

function daysUntil(dateIso: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateIso);
  target.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

function deriveEighteenthBirthday(birthDate: string | null): string {
  if (!birthDate) return "";
  const date = new Date(birthDate);
  date.setFullYear(date.getFullYear() + 18);
  return date.toISOString().slice(0, 10);
}

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
      if (selectedMemoryIds.length === 0) throw new Error("Select at least one memory");

      const parsedRelease = new Date(`${releaseDate}T09:00:00.000Z`);
      if (Number.isNaN(parsedRelease.getTime())) throw new Error("Invalid release date");

      await createCapsule({
        familyId: workspace.family.id,
        childId: activeChild.id,
        title: title.trim() || `${activeChild.firstName}'s time capsule`,
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

  const memoryOptions = useMemo(() => (memoriesQuery.data ?? []).slice(0, 18), [memoriesQuery.data]);
  const suggested18th = useMemo(() => deriveEighteenthBirthday(activeChild?.birthDate ?? null), [activeChild?.birthDate]);

  const toggleMemory = (id: string) => {
    setSelectedMemoryIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const refreshAll = async () => {
    await refetchWorkspace();
    await Promise.all([capsulesQuery.refetch(), memoriesQuery.refetch()]);
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
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        className="flex-1 bg-night2"
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={capsulesQuery.isRefetching || memoriesQuery.isRefetching} onRefresh={() => void refreshAll()} tintColor={T.gold} />}
      >
        <View className="px-5 pt-4">
          <Text className="text-center text-6xl">🏺</Text>
          <Text className="text-center font-display text-4xl text-cream">Time Capsules</Text>
          <Text className="mt-1 text-center font-body text-xs text-moonDim">Seal memories now and deliver them years later with intent.</Text>

          <ChildSwitcher childProfiles={workspace.children} activeChildId={activeChild.id} onSelect={setActiveChildId} />

          <View className="mt-4 flex-row gap-3">
            <View className="flex-1 border border-gold/25 bg-gold/10 px-4 py-4">
              <Text className="font-body text-[10px] uppercase tracking-[2px] text-gold">Scheduled</Text>
              <Text className="mt-2 font-display text-3xl text-cream">{(capsulesQuery.data ?? []).length}</Text>
            </View>
            <View className="flex-1 border border-night4 bg-night3 px-4 py-4">
              <Text className="font-body text-[10px] uppercase tracking-[2px] text-moonDim">Memories ready</Text>
              <Text className="mt-2 font-display text-3xl text-cream">{memoryOptions.length}</Text>
            </View>
          </View>

          <Pressable
            onPress={() => {
              setShowCreate((prev) => !prev);
              if (!showCreate && suggested18th && !releaseDate) {
                setReleaseDate(suggested18th);
              }
            }}
            className="mt-4 border border-gold/45 bg-gold/10 px-4 py-4"
          >
            <Text className="text-center font-bodybold text-sm text-gold">✦ Create new time capsule</Text>
          </Pressable>

          {showCreate ? (
            <MotiView from={{ opacity: 0, translateY: -6 }} animate={{ opacity: 1, translateY: 0 }} className="mt-3 border border-gold/30 bg-night3 p-4">
              <TextInput
                placeholder="Capsule title"
                placeholderTextColor="#8A8070"
                value={title}
                onChangeText={setTitle}
                className="mb-2 border border-night4 px-3 py-2 font-body text-moon"
              />
              <TextInput
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="Recipient email"
                placeholderTextColor="#8A8070"
                value={recipientEmail}
                onChangeText={setRecipientEmail}
                className="mb-2 border border-night4 px-3 py-2 font-body text-moon"
              />
              <TextInput
                placeholder="Unlock date (YYYY-MM-DD)"
                placeholderTextColor="#8A8070"
                value={releaseDate}
                onChangeText={setReleaseDate}
                className="mb-3 border border-night4 px-3 py-2 font-body text-moon"
              />

              {suggested18th ? (
                <View className="mb-3 flex-row flex-wrap gap-2">
                  <Pressable onPress={() => setReleaseDate(suggested18th)} className="border border-gold/30 bg-gold/10 px-3 py-2">
                    <Text className="font-body text-[11px] text-gold">18th birthday</Text>
                  </Pressable>
                  <Pressable onPress={() => setReleaseDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))} className="border border-night4 bg-night4/35 px-3 py-2">
                    <Text className="font-body text-[11px] text-moon">In one year</Text>
                  </Pressable>
                </View>
              ) : null}

              <Text className="mb-2 font-body text-[10px] uppercase tracking-[2px] text-moonDim">Select memories</Text>
              <View className="gap-2">
                {memoryOptions.map((memory) => {
                  const active = selectedMemoryIds.includes(memory.id);
                  return (
                    <Pressable
                      key={memory.id}
                      onPress={() => toggleMemory(memory.id)}
                      className={`border px-3 py-3 ${active ? "border-gold bg-gold/15" : "border-night4 bg-night4/40"}`}
                    >
                      <Text className="font-body text-xs text-moon">{memory.title}</Text>
                      <Text className="mt-1 font-body text-[10px] text-moonDim">{new Date(memory.capturedAt).toDateString()}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text className="mt-3 font-body text-xs text-moonDim">{selectedMemoryIds.length} memories selected</Text>

              <Pressable
                onPress={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="mt-3 bg-terracotta px-4 py-3"
              >
                <Text className="text-center font-bodybold text-sm text-cream">{saveMutation.isPending ? "Sealing..." : "Seal capsule"}</Text>
              </Pressable>
            </MotiView>
          ) : null}

          <View className="mt-5 gap-3">
            {(capsulesQuery.data ?? []).map((capsule, index) => {
              const days = daysUntil(capsule.releaseAt);
              const isPast = days === 0;
              return (
                <MotiView
                  key={capsule.id}
                  from={{ opacity: 0, translateY: 10 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ duration: 320, delay: index * 40 }}
                  style={{
                    borderWidth: 1,
                    borderColor: "rgba(212,168,67,0.25)",
                    backgroundColor: T.night3,
                    paddingHorizontal: 16,
                    paddingVertical: 16,
                    borderRadius: 16
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text className="font-bodybold text-sm text-goldLight">{capsule.title}</Text>
                      <Text className="mt-1 font-body text-xs text-moonDim">To {capsule.recipientEmail}</Text>
                    </View>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        borderWidth: 1,
                        borderColor: "rgba(212,168,67,0.25)",
                        backgroundColor: "rgba(212,168,67,0.10)",
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 20
                      }}
                    >
                      <MaterialCommunityIcons
                        name={capsule.status === "scheduled" ? "lock-outline" : capsule.status === "sent" ? "lock-open-variant-outline" : "close-circle-outline"}
                        size={12}
                        color={T.gold}
                      />
                      <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 10, textTransform: "uppercase", color: T.gold }}>
                        {capsule.status}
                      </Text>
                    </View>
                  </View>
                  <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text className="font-body text-xs text-moon">Unlocks {new Date(capsule.releaseAt).toDateString()}</Text>
                    <Text style={{ fontFamily: "DMSans_500Medium", fontSize: 11, color: isPast ? T.sage : T.gold }}>
                      {isPast ? "Ready to open" : `${days} days to go`}
                    </Text>
                  </View>
                </MotiView>
              );
            })}

            {(capsulesQuery.data ?? []).length === 0 ? (
              <View
                style={{
                  borderWidth: 1,
                  borderColor: T.night4,
                  backgroundColor: T.night3,
                  paddingHorizontal: 16,
                  paddingVertical: 20,
                  borderRadius: 16
                }}
              >
                <Text className="font-body text-sm text-moon">No capsules yet.</Text>
                <Text className="mt-1 font-body text-xs text-moonDim">Create one for a birthday, graduation, or a future letter.</Text>
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
