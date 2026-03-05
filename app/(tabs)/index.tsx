import { useMemo } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { MotiView } from "moti";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { ChildSwitcher } from "@/components/child-switcher";
import { EmptyState } from "@/components/empty-state";
import { useWorkspace } from "@/hooks/use-workspace";
import { useMemoryRealtime } from "@/hooks/use-memory-realtime";
import { queryKeys } from "@/lib/query-keys";
import { listMemories, listOnThisDay } from "@/lib/repositories";
import { gradients, T } from "@/lib/theme";
import { MemoryItem } from "@/lib/types";

const gradientSet = Object.values(gradients);

function calculateStreak(memories: MemoryItem[]): number {
  const uniqueDays = Array.from(
    new Set(memories.map((memory) => new Date(memory.capturedAt).toDateString()))
  ).map((day) => new Date(day));

  uniqueDays.sort((a, b) => b.getTime() - a.getTime());

  if (uniqueDays.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  let pointer = new Date(today);

  for (const day of uniqueDays) {
    day.setHours(0, 0, 0, 0);

    if (day.getTime() === pointer.getTime()) {
      streak += 1;
      pointer.setDate(pointer.getDate() - 1);
      continue;
    }

    if (day.getTime() < pointer.getTime()) {
      break;
    }
  }

  return streak;
}

function monthLabel(dateIso: string): string {
  return new Date(dateIso).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric"
  });
}

function MemoryTile({
  memory,
  big,
  index
}: {
  memory: MemoryItem;
  big?: boolean;
  index: number;
}) {
  const gradient = gradientSet[index % gradientSet.length];

  return (
    <MotiView
      from={{ opacity: 0, translateY: 10 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 340, delay: index * 35 }}
      style={{ flex: big ? undefined : 1 }}
    >
      <Pressable onPress={() => router.push(`/memory/${memory.id}`)}>
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            height: big ? 142 : 92,
            borderRadius: 16,
            padding: 12,
            justifyContent: "space-between",
            overflow: "hidden"
          }}
        >
          <Text style={{ fontSize: big ? 22 : 16 }}>{memory.tags[0] ? "🌳" : "✨"}</Text>
          <View>
            <Text numberOfLines={1} style={{ color: "rgba(255,255,255,0.95)", fontFamily: "DMSans_500Medium", fontSize: big ? 12 : 10 }}>
              {memory.title}
            </Text>
            {big ? (
              <Text numberOfLines={1} style={{ color: "rgba(255,255,255,0.72)", fontFamily: "DMSans_400Regular", fontSize: 10, marginTop: 2 }}>
                {new Date(memory.capturedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </Text>
            ) : null}
          </View>
        </LinearGradient>
      </Pressable>
    </MotiView>
  );
}

export default function HomeScreen() {
  const { workspace, workspaceLoading, workspaceError, refetchWorkspace, activeChild, setActiveChildId, user } = useWorkspace();

  useMemoryRealtime(workspace?.family.id, activeChild?.id);

  const memoriesQuery = useQuery({
    queryKey: workspace && activeChild ? queryKeys.memories(workspace.family.id, activeChild.id) : ["memories", "guest"],
    enabled: Boolean(workspace && activeChild),
    queryFn: async () => listMemories(workspace!.family.id, activeChild!.id)
  });

  const onThisDayQuery = useQuery({
    queryKey: workspace && activeChild ? queryKeys.onThisDay(workspace.family.id, activeChild.id) : ["on-this-day", "guest"],
    enabled: Boolean(workspace && activeChild),
    queryFn: async () => listOnThisDay(workspace!.family.id, activeChild!.id)
  });

  const sections = useMemo(() => {
    const grouped = (memoriesQuery.data ?? []).reduce<Record<string, MemoryItem[]>>((acc, memory) => {
      const key = monthLabel(memory.capturedAt);
      acc[key] = acc[key] ? [...acc[key], memory] : [memory];
      return acc;
    }, {});

    return Object.entries(grouped);
  }, [memoriesQuery.data]);

  if (workspaceLoading) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-night2">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={T.terracotta} />
        </View>
      </SafeAreaView>
    );
  }

  if (!workspace || !activeChild) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-night2">
        <ScrollView contentInsetAdjustmentBehavior="automatic" className="flex-1 bg-night2">
          <View className="px-4 pt-5">
            <EmptyState
              title="Workspace unavailable"
              body={
                workspaceError instanceof Error
                  ? workspaceError.message
                  : "Sign in again to bootstrap your family timeline."
              }
            />
            <Pressable
              onPress={() => {
                void refetchWorkspace();
              }}
              className="mt-3 border border-night4 px-4 py-3"
            >
              <Text className="text-center font-body text-sm text-moon">Retry workspace sync</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (memoriesQuery.isLoading) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-night2">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={T.terracotta} />
        </View>
      </SafeAreaView>
    );
  }

  const memories = memoriesQuery.data ?? [];
  const streak = calculateStreak(memories);

  if (memoriesQuery.error) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-night2">
        <ScrollView contentInsetAdjustmentBehavior="automatic" className="flex-1 bg-night2">
          <View className="px-4 pt-5">
            <EmptyState
              title="Could not load memories"
              body={memoriesQuery.error instanceof Error ? memoriesQuery.error.message : "Unknown error"}
            />
            <Pressable
              onPress={() => {
                void memoriesQuery.refetch();
              }}
              className="mt-3 border border-night4 px-4 py-3"
            >
              <Text className="text-center font-body text-sm text-moon">Retry memories</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-night2">
      <ScrollView contentInsetAdjustmentBehavior="automatic" className="flex-1 bg-night2" contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="px-5 pt-5">
          <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 400 }}>
            <Text className="font-body text-xs text-moonDim">Good morning,</Text>
            <Text className="font-display text-4xl text-cream">{user?.name?.split(" ")[0] ?? "Parent"}</Text>
          </MotiView>

          <View className="mt-4 rounded-2xl border border-terracotta/40 bg-terracotta/15 px-4 py-3">
            <Text className="font-bodybold text-sm text-cream">🔥 {streak}-day streak</Text>
            <Text className="mt-1 font-body text-xs text-blush">
              {memories.length > 0 ? "You captured something today — keep it going!" : "Capture your first memory today."}
            </Text>
          </View>

          <ChildSwitcher childProfiles={workspace.children} activeChildId={activeChild.id} onSelect={setActiveChildId} />

          {onThisDayQuery.data?.length ? (
            <View className="mt-4 rounded-2xl border border-gold/35 bg-gold/10 px-4 py-3">
              <Text className="font-bodybold text-xs uppercase tracking-[2px] text-gold">On this day</Text>
              <Pressable onPress={() => router.push(`/memory/${onThisDayQuery.data![0].id}`)}>
                <Text className="mt-1 font-body text-sm text-cream">{onThisDayQuery.data[0].title}</Text>
              </Pressable>
            </View>
          ) : null}

          {sections.length === 0 ? (
            <View className="mt-6">
              <EmptyState title="No memories yet" body="Open Capture and save your first moment." />
            </View>
          ) : null}

          <View className="mt-6 gap-4">
            {sections.map(([label, items], sectionIndex) => (
              <View key={label}>
                <Text className="mb-2 px-1 font-body text-[10px] uppercase tracking-[2.6px] text-terracotta">{label}</Text>

                {items[0] ? <MemoryTile memory={items[0]} big index={sectionIndex} /> : null}

                <View className="mt-2 flex-row gap-2">
                  {items.slice(1, 4).map((memory, idx) => (
                    <MemoryTile key={memory.id} memory={memory} index={sectionIndex + idx + 1} />
                  ))}
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
