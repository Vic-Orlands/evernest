import { useMemo } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { MotiView } from "moti";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ChildSwitcher } from "@/components/child-switcher";
import { EmptyState } from "@/components/empty-state";
import { useWorkspace } from "@/hooks/use-workspace";
import { useMemoryRealtime } from "@/hooks/use-memory-realtime";
import { queryKeys } from "@/lib/query-keys";
import { listMemories, listOnThisDay } from "@/lib/repositories";
import { gradients, T } from "@/lib/theme";
import { MemoryItem } from "@/lib/types";
import { listMilestones } from "@/lib/workspace";

const gradientSet = Object.values(gradients);

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function calculateStreak(memories: MemoryItem[]): number {
  const uniqueDays = Array.from(
    new Set(
      memories.map((memory) => new Date(memory.capturedAt).toDateString())
    )
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
    if (day.getTime() < pointer.getTime()) break;
  }

  return streak;
}

function monthLabel(dateIso: string): string {
  return new Date(dateIso).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric"
  });
}

function hasCapturedToday(memories: MemoryItem[]): boolean {
  const today = new Date().toDateString();
  return memories.some(
    (m) => new Date(m.capturedAt).toDateString() === today
  );
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
  const hasImage = memory.mediaType === "image" && memory.mediaUrl;

  return (
    <MotiView
      from={{ opacity: 0, translateY: 10 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 340, delay: index * 35 }}
      style={{ flex: big ? undefined : 1 }}
    >
      <Pressable onPress={() => router.push(`/memory/${memory.id}`)}>
        <View
          style={{
            height: big ? 168 : 104,
            borderRadius: 18,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.06)",
            backgroundColor: T.night3
          }}
        >
          {hasImage ? (
            <Image
              source={{ uri: memory.mediaUrl }}
              resizeMode="cover"
              style={{ width: "100%", height: "100%" }}
            />
          ) : (
            <LinearGradient
              colors={gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ width: "100%", height: "100%" }}
            />
          )}

          <LinearGradient
            colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.82)"]}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              padding: 12
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between"
              }}
            >
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text
                  numberOfLines={1}
                  style={{
                    color: "rgba(255,255,255,0.95)",
                    fontFamily: "DMSans_500Medium",
                    fontSize: big ? 13 : 11
                  }}
                >
                  {memory.title}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{
                    color: "rgba(255,255,255,0.74)",
                    fontFamily: "DMSans_400Regular",
                    fontSize: 10,
                    marginTop: 3
                  }}
                >
                  {new Date(memory.capturedAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric"
                  })}
                </Text>
              </View>
              <View
                style={{
                  alignItems: "center",
                  gap: 4,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.10)",
                  backgroundColor: "rgba(0,0,0,0.30)",
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 8
                }}
              >
                <MaterialCommunityIcons
                  name={
                    memory.mediaType === "video"
                      ? "video-outline"
                      : "image-outline"
                  }
                  size={14}
                  color={T.cream}
                />
                <Text
                  style={{
                    fontFamily: "DMSans_400Regular",
                    fontSize: 9,
                    color: T.moon
                  }}
                >
                  {memory.commentsCount + memory.reactionsCount}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>
      </Pressable>
    </MotiView>
  );
}

function QuickAction({
  icon,
  label,
  accent,
  onPress
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  accent: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        borderWidth: 1,
        borderColor: T.night4,
        backgroundColor: T.night3,
        paddingHorizontal: 12,
        paddingVertical: 16,
        borderRadius: 16
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          backgroundColor: `${accent}22`,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 10
        }}
      >
        <MaterialCommunityIcons name={icon} size={18} color={accent} />
      </View>
      <Text
        style={{
          fontFamily: "DMSans_500Medium",
          fontSize: 12,
          color: T.cream
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function HomeScreen() {
  const {
    workspace,
    workspaceLoading,
    workspaceError,
    refetchWorkspace,
    activeChild,
    setActiveChildId,
    user
  } = useWorkspace();

  useMemoryRealtime(workspace?.family.id, activeChild?.id);

  const memoriesQuery = useQuery({
    queryKey:
      workspace && activeChild
        ? queryKeys.memories(workspace.family.id, activeChild.id)
        : ["memories", "guest"],
    enabled: Boolean(workspace && activeChild),
    queryFn: async () =>
      listMemories(workspace!.family.id, activeChild!.id)
  });

  const onThisDayQuery = useQuery({
    queryKey:
      workspace && activeChild
        ? queryKeys.onThisDay(workspace.family.id, activeChild.id)
        : ["on-this-day", "guest"],
    enabled: Boolean(workspace && activeChild),
    queryFn: async () =>
      listOnThisDay(workspace!.family.id, activeChild!.id)
  });

  const milestonesQuery = useQuery({
    queryKey: activeChild
      ? queryKeys.milestones(activeChild.id)
      : ["milestones", "guest"],
    enabled: Boolean(activeChild),
    queryFn: async () => listMilestones(activeChild!.id)
  });

  const sections = useMemo(() => {
    const grouped = (memoriesQuery.data ?? []).reduce<
      Record<string, MemoryItem[]>
    >((acc, memory) => {
      const key = monthLabel(memory.capturedAt);
      acc[key] = acc[key] ? [...acc[key], memory] : [memory];
      return acc;
    }, {});
    return Object.entries(grouped);
  }, [memoriesQuery.data]);

  const refreshAll = async () => {
    await refetchWorkspace();
    await Promise.all([
      memoriesQuery.refetch(),
      onThisDayQuery.refetch(),
      milestonesQuery.refetch()
    ]);
  };

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
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          className="flex-1 bg-night2"
        >
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
              style={{ borderRadius: 14 }}
            >
              <Text className="text-center font-body text-sm text-moon">
                Retry workspace sync
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (memoriesQuery.isLoading && !memoriesQuery.data) {
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
  const latestMemory = memories[0];
  const capturedToday = hasCapturedToday(memories);
  const incompleteMilestones = (milestonesQuery.data ?? [])
    .filter((item) => !item.completedMemoryId)
    .slice(0, 3);

  if (memoriesQuery.error) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-night2">
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          className="flex-1 bg-night2"
        >
          <View className="px-4 pt-5">
            <EmptyState
              title="Could not load memories"
              body={
                memoriesQuery.error instanceof Error
                  ? memoriesQuery.error.message
                  : "Unknown error"
              }
            />
            <Pressable
              onPress={() => {
                void memoriesQuery.refetch();
              }}
              className="mt-3 border border-night4 px-4 py-3"
              style={{ borderRadius: 14 }}
            >
              <Text className="text-center font-body text-sm text-moon">
                Retry memories
              </Text>
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
        refreshControl={
          <RefreshControl
            refreshing={
              memoriesQuery.isRefetching || onThisDayQuery.isRefetching
            }
            onRefresh={() => void refreshAll()}
            tintColor={T.terracotta}
          />
        }
      >
        <View className="px-5 pt-5">
          {/* Greeting */}
          <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 400 }}
          >
            <Text className="font-body text-xs text-moonDim">
              {getGreeting()},
            </Text>
            <Text className="font-display text-4xl text-cream">
              {user?.name?.split(" ")[0] ?? "Parent"}
            </Text>
            <Text className="mt-1 font-body text-sm text-moonDim">
              Your family archive is growing one small day at a time.
            </Text>
          </MotiView>

          {/* Streak + count cards with animations */}
          <View className="mt-4 flex-row gap-3">
            <MotiView
              from={{ opacity: 0, translateY: 12 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 400, delay: 60 }}
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: "rgba(196,98,58,0.40)",
                backgroundColor: "rgba(196,98,58,0.15)",
                paddingHorizontal: 16,
                paddingVertical: 16,
                borderRadius: 16
              }}
            >
              <Text className="font-bodybold text-sm text-cream">
                🔥 {streak}-day streak
              </Text>
              <Text className="mt-1 font-body text-xs text-blush">
                {memories.length > 0
                  ? "You captured something today. Keep the story alive."
                  : "Start your family timeline today."}
              </Text>
            </MotiView>
            <MotiView
              from={{ opacity: 0, translateY: 12 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 400, delay: 120 }}
              style={{
                width: 112,
                borderWidth: 1,
                borderColor: T.night4,
                backgroundColor: T.night3,
                paddingHorizontal: 16,
                paddingVertical: 16,
                borderRadius: 16
              }}
            >
              <Text
                style={{
                  fontFamily: "DMSans_400Regular",
                  fontSize: 10,
                  color: T.moonDim,
                  textTransform: "uppercase",
                  letterSpacing: 2
                }}
              >
                Memories
              </Text>
              <Text className="mt-2 font-display text-3xl text-cream">
                {memories.length}
              </Text>
            </MotiView>
          </View>

          <ChildSwitcher
            childProfiles={workspace.children}
            activeChildId={activeChild.id}
            onSelect={setActiveChildId}
          />

          {/* No captures today prompt */}
          {!capturedToday && memories.length > 0 ? (
            <MotiView
              from={{ opacity: 0, translateY: 8 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 360, delay: 180 }}
            >
              <Pressable
                onPress={() => router.push("/(tabs)/capture")}
                style={{
                  marginTop: 16,
                  borderWidth: 1,
                  borderColor: "rgba(212,168,67,0.35)",
                  backgroundColor: "rgba(212,168,67,0.10)",
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderRadius: 16,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: "rgba(212,168,67,0.20)",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  <MaterialCommunityIcons
                    name="camera-plus-outline"
                    size={20}
                    color={T.gold}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text className="font-bodybold text-sm text-cream">
                    No captures today
                  </Text>
                  <Text className="mt-1 font-body text-xs text-moonDim">
                    Open the camera and save a small moment.
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color={T.moonDim}
                />
              </Pressable>
            </MotiView>
          ) : null}

          {/* Quick actions */}
          <View className="mt-5 flex-row gap-3">
            <QuickAction
              icon="camera-outline"
              label="Capture now"
              accent={T.terracotta}
              onPress={() => router.push("/(tabs)/capture")}
            />
            <QuickAction
              icon="archive-lock-outline"
              label="New capsule"
              accent={T.gold}
              onPress={() => router.push("/(tabs)/capsules")}
            />
            <QuickAction
              icon="account-plus-outline"
              label="Invite family"
              accent={T.sageLight}
              onPress={() => router.push("/(tabs)/family")}
            />
          </View>

          {/* Latest memory */}
          {latestMemory ? (
            <View className="mt-6">
              <Text
                style={{
                  fontFamily: "DMSans_400Regular",
                  fontSize: 10,
                  color: T.terracotta,
                  textTransform: "uppercase",
                  letterSpacing: 2.6,
                  marginBottom: 8
                }}
              >
                Latest moment
              </Text>
              <MemoryTile memory={latestMemory} big index={0} />
            </View>
          ) : null}

          {/* Milestones */}
          {incompleteMilestones.length > 0 ? (
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
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}
              >
                <Text className="font-bodybold text-sm text-cream">
                  Milestones in progress
                </Text>
                <Text className="font-body text-xs text-moonDim">
                  {incompleteMilestones.length} open
                </Text>
              </View>
              <View className="mt-3 gap-2">
                {incompleteMilestones.map((milestone) => (
                  <View
                    key={milestone.id}
                    style={{
                      borderWidth: 1,
                      borderColor: T.night4,
                      backgroundColor: "rgba(46,38,32,0.35)",
                      paddingHorizontal: 12,
                      paddingVertical: 12,
                      borderRadius: 12,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10
                    }}
                  >
                    <MaterialCommunityIcons
                      name="flag-checkered"
                      size={16}
                      color={T.gold}
                    />
                    <Text className="font-body text-sm text-moon">
                      {milestone.label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* On This Day carousel */}
          {onThisDayQuery.data?.length ? (
            <View
              style={{
                marginTop: 20,
                borderWidth: 1,
                borderColor: "rgba(212,168,67,0.35)",
                backgroundColor: "rgba(212,168,67,0.10)",
                paddingVertical: 16,
                borderRadius: 16
              }}
            >
              <Text
                style={{
                  fontFamily: "DMSans_500Medium",
                  fontSize: 11,
                  color: T.gold,
                  textTransform: "uppercase",
                  letterSpacing: 2,
                  paddingHorizontal: 16,
                  marginBottom: 12
                }}
              >
                ✦ On this day
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  paddingHorizontal: 16,
                  gap: 10
                }}
              >
                {onThisDayQuery.data.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => router.push(`/memory/${item.id}`)}
                    style={{
                      width: 200,
                      borderWidth: 1,
                      borderColor: "rgba(212,168,67,0.25)",
                      backgroundColor: "rgba(212,168,67,0.08)",
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      borderRadius: 12
                    }}
                  >
                    <Text
                      numberOfLines={1}
                      className="font-bodybold text-sm text-cream"
                    >
                      {item.title}
                    </Text>
                    <Text className="mt-1 font-body text-xs text-moonDim">
                      {new Date(item.capturedAt).toLocaleDateString(
                        undefined,
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric"
                        }
                      )}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {/* Empty state */}
          {sections.length === 0 ? (
            <View className="mt-6">
              <EmptyState
                title="No memories yet"
                body="Open Capture and save your first moment."
              />
            </View>
          ) : null}

          {/* Timeline sections */}
          <View className="mt-6 gap-4">
            {sections.map(([label, items], sectionIndex) => (
              <View key={label}>
                <Text
                  style={{
                    fontFamily: "DMSans_400Regular",
                    fontSize: 10,
                    color: T.terracotta,
                    textTransform: "uppercase",
                    letterSpacing: 2.6,
                    marginBottom: 8,
                    paddingHorizontal: 4
                  }}
                >
                  {label}
                </Text>

                {items[0] ? (
                  <MemoryTile
                    memory={items[0]}
                    big
                    index={sectionIndex + 1}
                  />
                ) : null}

                {items.length > 1 ? (
                  <View className="mt-2 flex-row gap-2">
                    {items.slice(1, 4).map((memory, idx) => (
                      <MemoryTile
                        key={memory.id}
                        memory={memory}
                        index={sectionIndex + idx + 2}
                      />
                    ))}
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
