import { useMemo } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { MemoryCard } from "@/components/memory-card";
import { EmptyState } from "@/components/empty-state";
import { ChildSwitcher } from "@/components/child-switcher";
import { listMemories, listOnThisDay } from "@/lib/repositories";
import { queryKeys } from "@/lib/query-keys";
import { useWorkspace } from "@/hooks/use-workspace";
import { useMemoryRealtime } from "@/hooks/use-memory-realtime";
import { MemoryItem } from "@/lib/types";

type TimelineRow =
  | { type: "hero"; id: string }
  | { type: "header"; id: string; date: string }
  | { type: "memory"; id: string; memory: MemoryItem };

export default function TimelineScreen() {
  const { workspace, workspaceLoading, activeChild, setActiveChildId } = useWorkspace();

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

  const rows = useMemo(() => {
    const memories = memoriesQuery.data ?? [];
    const grouped = memories.reduce<Record<string, MemoryItem[]>>((acc, item) => {
      const key = new Date(item.capturedAt).toLocaleDateString();
      acc[key] = acc[key] ? [...acc[key], item] : [item];
      return acc;
    }, {});

    const output: TimelineRow[] = [{ type: "hero", id: "hero" }];
    Object.entries(grouped).forEach(([date, items]) => {
      output.push({ type: "header", id: `h-${date}`, date });
      items.forEach((memory) => output.push({ type: "memory", id: memory.id, memory }));
    });
    return output;
  }, [memoriesQuery.data]);

  if (workspaceLoading || memoriesQuery.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas-dark">
        <ActivityIndicator color="#E8B15D" />
      </View>
    );
  }

  if (!workspace || !activeChild) {
    return (
      <View className="flex-1 bg-canvas-dark px-4 pt-14">
        <EmptyState title="Workspace unavailable" body="Sign in again to bootstrap your family timeline." />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-canvas-dark px-4 pt-14">
      <Text className="font-display text-4xl text-ink-dark">EverNest</Text>
      <Text className="mt-1 font-body text-zinc-400">{workspace.family.name}</Text>

      <ChildSwitcher childProfiles={workspace.children} activeChildId={activeChild.id} onSelect={setActiveChildId} />

      <FlashList
        data={rows}
        contentContainerStyle={{ paddingTop: 20, paddingBottom: 120 }}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          if (item.type === "hero") {
            const onThisDay = onThisDayQuery.data ?? [];
            const hasTodayMemory = (memoriesQuery.data ?? []).some((memory) => {
              const date = new Date(memory.capturedAt);
              const now = new Date();
              return date.toDateString() === now.toDateString();
            });

            return (
              <View className="mb-4 gap-3">
                {!hasTodayMemory ? (
                  <View className="rounded-2xl border border-amber/40 bg-amber/10 p-4">
                    <Text className="font-bodybold text-zinc-100">No memory captured today yet.</Text>
                    <Text className="mt-1 font-body text-sm text-zinc-300">Add one now to keep your daily streak alive.</Text>
                    <Pressable onPress={() => router.push("/(tabs)/capture")} className="mt-3 self-start rounded-xl bg-amber px-3 py-2">
                      <Text className="font-bodybold text-zinc-900">Capture now</Text>
                    </Pressable>
                  </View>
                ) : null}

                {onThisDay.length > 0 ? (
                  <View className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                    <Text className="font-bodybold text-zinc-100">On This Day</Text>
                    <Text className="mt-1 font-body text-sm text-zinc-400">{onThisDay[0].title}</Text>
                    <Pressable onPress={() => router.push(`/memory/${onThisDay[0].id}`)} className="mt-3 self-start rounded-xl border border-zinc-700 px-3 py-2">
                      <Text className="font-body text-zinc-300">Open memory</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            );
          }

          if (item.type === "header") {
            return <Text className="mb-3 mt-5 font-bodybold text-xs uppercase tracking-widest text-zinc-500">{item.date}</Text>;
          }

          return <MemoryCard item={item.memory} onPress={() => router.push(`/memory/${item.memory.id}`)} />;
        }}
        ListEmptyComponent={
          <EmptyState
            title="No memories yet"
            body="Use Capture to add your first photo/video with a note and tags."
          />
        }
      />
    </View>
  );
}
