import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
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
import { MemoryTile } from "@/components/memory-tile";
import { ProfileAvatar } from "@/components/profile-avatar";
import { useWorkspace } from "@/hooks/use-workspace";
import { useProfile } from "@/hooks/use-profile";
import { useMemoryRealtime } from "@/hooks/use-memory-realtime";
import { useAppTheme } from "@/hooks/use-app-theme";
import { queryKeys } from "@/lib/query-keys";
import { listMemories, listOnThisDay, listUserNotifications } from "@/lib/repositories";
import { AppTheme } from "@/lib/theme";
import { MemoryItem } from "@/lib/types";
import { listMilestones } from "@/lib/workspace";

const BUTTON_PADDING_Y = 11;
const MONTH_RAIL_PREVIEW_COUNT = 3;

type ThemeColors = ReturnType<typeof useAppTheme>["colors"];
type ThemeGradients = ReturnType<typeof useAppTheme>["gradients"];

type MonthGroup = {
  key: string;
  label: string;
  count: number;
  items: MemoryItem[];
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

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
    if (day.getTime() < pointer.getTime()) break;
  }

  return streak;
}

function getMonthKey(dateIso: string): string {
  const date = new Date(dateIso);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabel(dateIso: string): string {
  return new Date(dateIso).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric"
  });
}

function hasCapturedToday(memories: MemoryItem[]): boolean {
  const today = new Date().toDateString();
  return memories.some((memory) => new Date(memory.capturedAt).toDateString() === today);
}

function FilterInput({
  value,
  onChangeText,
  placeholder,
  colors,
  keyboardType
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  colors: AppTheme;
  keyboardType?: "default" | "number-pad";
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      keyboardType={keyboardType}
      style={{
        flex: 1,
        minWidth: 120,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceSecondary,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontFamily: "DMSans_400Regular",
        fontSize: 13,
        color: colors.text
      }}
    />
  );
}


function QuickAction({
  icon,
  label,
  accent,
  onPress,
  colors
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  accent: string;
  onPress: () => void;
  colors: ThemeColors;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        paddingHorizontal: 12,
        paddingVertical: 14
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          backgroundColor: `${accent}20`,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 10
        }}
      >
        <MaterialCommunityIcons name={icon} size={18} color={accent} />
      </View>
      <Text style={{ fontFamily: "DMSans_500Medium", fontSize: 12, color: colors.text }}>
        {label}
      </Text>
    </Pressable>
  );
}

function MonthRailCard({
  month,
  selected,
  onPress,
  colors,
  gradients
}: {
  month: MonthGroup;
  selected: boolean;
  onPress: () => void;
  colors: ThemeColors;
  gradients: ThemeGradients;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: 190,
        borderWidth: 1,
        borderColor: selected ? colors.brand : colors.border,
        backgroundColor: selected ? colors.brandBackground : colors.surface,
        padding: 14,
        gap: 12
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: "DMSans_500Medium", fontSize: 14, color: colors.text }}>
            {month.label}
          </Text>
          <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 11, color: colors.textMuted, marginTop: 3 }}>
            {month.count} {month.count === 1 ? "memory" : "memories"}
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={18} color={selected ? colors.brand : colors.textMuted} />
      </View>

      <View style={{ flexDirection: "row", gap: 8 }}>
        {month.items.slice(0, MONTH_RAIL_PREVIEW_COUNT).map((item, index) => (
          <View key={item.id} style={{ flex: 1 }}>
            <MemoryTile item={item} index={index} colors={colors} gradients={gradients} />
          </View>
        ))}
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const { colors, gradients } = useAppTheme();
  const { profile } = useProfile();
  const {
    workspace,
    workspaceLoading,
    workspaceError,
    refetchWorkspace,
    activeChild,
    setActiveChildId,
    user
  } = useWorkspace();

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

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

  const milestonesQuery = useQuery({
    queryKey: activeChild ? queryKeys.milestones(activeChild.id) : ["milestones", "guest"],
    enabled: Boolean(activeChild),
    queryFn: async () => listMilestones(activeChild!.id)
  });

  const notificationsQuery = useQuery({
    queryKey: workspace ? queryKeys.notifications(workspace.family.id) : ["notifications", "guest"],
    enabled: Boolean(workspace),
    queryFn: async () => listUserNotifications(workspace!.family.id)
  });

  const allMemories = memoriesQuery.data ?? [];

  const filteredMemories = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const normalizedMonth = monthFilter.trim().toLowerCase();
    const normalizedYear = yearFilter.trim();
    const normalizedDate = dateFilter.trim();

    return allMemories.filter((memory) => {
      const capturedDate = new Date(memory.capturedAt);
      const monthName = capturedDate.toLocaleDateString(undefined, { month: "long" }).toLowerCase();
      const monthNumber = String(capturedDate.getMonth() + 1).padStart(2, "0");
      const year = String(capturedDate.getFullYear());
      const isoDate = memory.capturedAt.slice(0, 10);
      const haystack = `${memory.title} ${memory.note} ${memory.tags.join(" ")} ${memory.createdByName}`.toLowerCase();

      const matchesQuery =
        normalizedQuery.length === 0 ||
        haystack.includes(normalizedQuery) ||
        isoDate.includes(normalizedQuery) ||
        getMonthLabel(memory.capturedAt).toLowerCase().includes(normalizedQuery);

      const matchesMonth =
        normalizedMonth.length === 0 ||
        monthName.includes(normalizedMonth) ||
        monthNumber === normalizedMonth.padStart(2, "0");

      const matchesYear = normalizedYear.length === 0 || year.includes(normalizedYear);
      const matchesDate = normalizedDate.length === 0 || isoDate === normalizedDate;

      return matchesQuery && matchesMonth && matchesYear && matchesDate;
    });
  }, [allMemories, dateFilter, monthFilter, query, yearFilter]);

  const monthGroups = useMemo(() => {
    const grouped = filteredMemories.reduce<Record<string, MonthGroup>>((acc, memory) => {
      const key = getMonthKey(memory.capturedAt);
      if (!acc[key]) {
        acc[key] = {
          key,
          label: getMonthLabel(memory.capturedAt),
          count: 0,
          items: []
        };
      }
      acc[key].items.push(memory);
      acc[key].count += 1;
      return acc;
    }, {});

    return Object.values(grouped);
  }, [filteredMemories]);

  const unreadNotificationsCount = useMemo(
    () => (notificationsQuery.data ?? []).filter((item) => !item.readAt).length,
    [notificationsQuery.data]
  );

  const refreshAll = async () => {
    await refetchWorkspace();
    await Promise.all([memoriesQuery.refetch(), onThisDayQuery.refetch(), milestonesQuery.refetch()]);
  };

  if (workspaceLoading || (memoriesQuery.isLoading && !memoriesQuery.data)) {
    return (
      <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.backgroundSecondary }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.brand} />
        </View>
      </SafeAreaView>
    );
  }

  if (!workspace || !activeChild) {
    return (
      <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.backgroundSecondary }}>
        <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ flex: 1 }}>
          <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
            <EmptyState
              title="Workspace unavailable"
              body={
                workspaceError instanceof Error
                  ? workspaceError.message
                  : "Sign in again to bootstrap your family timeline."
              }
              colors={colors}
            />
            <Pressable
              onPress={() => {
                void refetchWorkspace();
              }}
              style={{
                marginTop: 12,
                borderWidth: 1,
                borderColor: colors.border,
                paddingHorizontal: 16,
                paddingVertical: BUTTON_PADDING_Y,
                backgroundColor: colors.surface
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

  if (memoriesQuery.error) {
    return (
      <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.backgroundSecondary }}>
        <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ flex: 1 }}>
          <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
            <EmptyState
              title="Could not load memories"
              body={memoriesQuery.error instanceof Error ? memoriesQuery.error.message : "Unknown error"}
              colors={colors}
            />
            <Pressable
              onPress={() => {
                void memoriesQuery.refetch();
              }}
              style={{
                marginTop: 12,
                borderWidth: 1,
                borderColor: colors.border,
                paddingHorizontal: 16,
                paddingVertical: BUTTON_PADDING_Y,
                backgroundColor: colors.surface
              }}
            >
              <Text style={{ textAlign: "center", fontFamily: "DMSans_400Regular", fontSize: 13, color: colors.text }}>
                Retry memories
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const memories = filteredMemories;
  const streak = calculateStreak(allMemories);
  const latestMemory = memories[0];
  const capturedToday = hasCapturedToday(allMemories);
  const incompleteMilestones = (milestonesQuery.data ?? []).filter((item) => !item.completedMemoryId).slice(0, 3);
  const hasActiveFilters = Boolean(query || monthFilter || yearFilter || dateFilter);

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.backgroundSecondary }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120, gap: 18 }}
        refreshControl={
          <RefreshControl
            refreshing={memoriesQuery.isRefetching || onThisDayQuery.isRefetching}
            onRefresh={() => void refreshAll()}
            tintColor={colors.brand}
          />
        }
      >
        <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 380 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 11, color: colors.textMuted }}>
                {getGreeting()},
              </Text>
              <Text style={{ fontFamily: "InstrumentSerif_400Regular", fontSize: 38, color: colors.text }}>
                {user?.name?.split(" ")[0] ?? "Parent"}
              </Text>
              <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 13, color: colors.textMuted, marginTop: 4 }}>
                Your family archive is growing one small day at a time.
              </Text>
            </View>
            <ProfileAvatar
              imageUrl={profile?.avatarUrl}
              avatarConfig={profile?.avatarConfig}
              name={profile?.fullName ?? user?.name}
              size={56}
              onPress={() => router.push("/(tabs)/settings")}
            />
          </View>
          <Pressable
            onPress={() => router.push("/notifications" as never)}
            style={{
              marginTop: 12,
              alignSelf: "flex-start",
              borderWidth: 1,
              borderColor: unreadNotificationsCount > 0 ? colors.brand : colors.border,
              backgroundColor: unreadNotificationsCount > 0 ? colors.brandBackground : colors.surface,
              paddingHorizontal: 14,
              paddingVertical: 10,
              flexDirection: "row",
              alignItems: "center",
              gap: 8
            }}
          >
            <MaterialCommunityIcons name="bell-outline" size={16} color={unreadNotificationsCount > 0 ? colors.brand : colors.textMuted} />
            <Text style={{ fontFamily: "DMSans_500Medium", fontSize: 12, color: colors.text }}>
              Inbox
            </Text>
            {unreadNotificationsCount > 0 ? (
              <View
                style={{
                  minWidth: 20,
                  height: 20,
                  borderRadius: 999,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: colors.brand
                }}
              >
                <Text style={{ fontFamily: "DMSans_500Medium", fontSize: 10, color: "#FFFFFF" }}>
                  {unreadNotificationsCount > 9 ? "9+" : unreadNotificationsCount}
                </Text>
              </View>
            ) : null}
          </Pressable>
        </MotiView>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <View
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: colors.brand,
              backgroundColor: colors.brandBackground,
              paddingHorizontal: 16,
              paddingVertical: 14
            }}
          >
            <Text style={{ fontFamily: "DMSans_500Medium", fontSize: 14, color: colors.text }}>
              {streak}-day streak
            </Text>
            <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 11, color: colors.brandSecondary, marginTop: 6 }}>
              {capturedToday ? "You captured something today." : "Another little moment keeps the streak alive."}
            </Text>
          </View>
          <View
            style={{
              width: 118,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              paddingHorizontal: 16,
              paddingVertical: 14
            }}
          >
            <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 10, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1.8 }}>
              Memories
            </Text>
            <Text style={{ fontFamily: "InstrumentSerif_400Regular", fontSize: 32, color: colors.text, marginTop: 6 }}>
              {allMemories.length}
            </Text>
          </View>
        </View>

        <ChildSwitcher
          childProfiles={workspace.children}
          activeChildId={activeChild.id}
          onSelect={setActiveChildId}
          colors={colors}
        />

        {!capturedToday && allMemories.length > 0 ? (
          <Pressable
            onPress={() => router.push("/(tabs)/capture")}
            style={{
              borderWidth: 1,
              borderColor: colors.gold,
              backgroundColor: colors.goldBackground,
              paddingHorizontal: 16,
              paddingVertical: 14,
              flexDirection: "row",
              alignItems: "center",
              gap: 12
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                backgroundColor: `${colors.gold}22`,
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <MaterialCommunityIcons name="camera-plus-outline" size={20} color={colors.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: "DMSans_500Medium", fontSize: 14, color: colors.text }}>
                No captures today
              </Text>
              <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                Open the camera and save a small moment.
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}

        <View style={{ flexDirection: "row", gap: 12 }}>
          <QuickAction
            icon="camera-outline"
            label="Capture now"
            accent={colors.brand}
            onPress={() => router.push("/(tabs)/capture")}
            colors={colors}
          />
          <QuickAction
            icon="archive-lock-outline"
            label="New capsule"
            accent={colors.gold}
            onPress={() => router.push("/(tabs)/capsules")}
            colors={colors}
          />
          <QuickAction
            icon="account-plus-outline"
            label="Invite family"
            accent={colors.sage}
            onPress={() => router.push("/(tabs)/family")}
            colors={colors}
          />
        </View>

        <View
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            padding: 16,
            gap: 14
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: "DMSans_500Medium", fontSize: 14, color: colors.text }}>
                Memory browser
              </Text>
              <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 11, color: colors.textMuted, marginTop: 3 }}>
                Search by title, date, month, or year without flooding the home feed.
              </Text>
            </View>
            <Pressable
              onPress={() => setFiltersOpen((value) => !value)}
              style={{
                borderWidth: 1,
                borderColor: filtersOpen || hasActiveFilters ? colors.brand : colors.border,
                backgroundColor: filtersOpen || hasActiveFilters ? colors.brandBackground : colors.surfaceSecondary,
                paddingHorizontal: 14,
                paddingVertical: BUTTON_PADDING_Y,
                flexDirection: "row",
                alignItems: "center",
                gap: 8
              }}
            >
              <MaterialCommunityIcons
                name={filtersOpen ? "filter-minus-outline" : "filter-variant"}
                size={16}
                color={filtersOpen || hasActiveFilters ? colors.brand : colors.textMuted}
              />
              <Text
                style={{
                  fontFamily: "DMSans_500Medium",
                  fontSize: 12,
                  color: filtersOpen || hasActiveFilters ? colors.brand : colors.text
                }}
              >
                Filter
              </Text>
            </Pressable>
          </View>

          {filtersOpen ? (
            <MotiView
              from={{ opacity: 0, translateY: -8 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 240 }}
              style={{ gap: 10 }}
            >
              <FilterInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search title, note, tag, or exact date"
                colors={colors}
              />
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                <FilterInput
                  value={monthFilter}
                  onChangeText={setMonthFilter}
                  placeholder="Month"
                  colors={colors}
                />
                <FilterInput
                  value={yearFilter}
                  onChangeText={setYearFilter}
                  placeholder="Year"
                  colors={colors}
                  keyboardType="number-pad"
                />
                <FilterInput
                  value={dateFilter}
                  onChangeText={setDateFilter}
                  placeholder="YYYY-MM-DD"
                  colors={colors}
                />
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 11, color: colors.textMuted }}>
                  {memories.length} result{memories.length === 1 ? "" : "s"}
                </Text>
                {hasActiveFilters ? (
                  <Pressable
                    onPress={() => {
                      setQuery("");
                      setMonthFilter("");
                      setYearFilter("");
                      setDateFilter("");
                    }}
                    style={{
                      borderWidth: 1,
                      borderColor: colors.border,
                      backgroundColor: colors.surfaceSecondary,
                      paddingHorizontal: 12,
                      paddingVertical: BUTTON_PADDING_Y
                    }}
                  >
                    <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 11, color: colors.text }}>
                      Clear filters
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </MotiView>
          ) : null}
        </View>

        {latestMemory ? (
          <View>
            <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 10, color: colors.brand, textTransform: "uppercase", letterSpacing: 2.4, marginBottom: 8 }}>
              {hasActiveFilters ? "Latest filtered memory" : "Latest moment"}
            </Text>
            <MemoryTile item={latestMemory} big index={0} colors={colors} gradients={gradients} />
          </View>
        ) : null}

        {incompleteMilestones.length > 0 ? (
          <View
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              paddingHorizontal: 16,
              paddingVertical: 16
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontFamily: "DMSans_500Medium", fontSize: 14, color: colors.text }}>
                Milestones in progress
              </Text>
              <Pressable onPress={() => router.push(`/milestones/${activeChild.id}`)}>
                <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 12, color: colors.brand }}>
                  View all
                </Text>
              </Pressable>
            </View>
            <View style={{ marginTop: 12, gap: 8 }}>
              {incompleteMilestones.map((milestone) => (
                <Pressable
                  key={milestone.id}
                  onPress={() => router.push(`/milestones/${activeChild.id}`)}
                  style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.surfaceSecondary,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10
                  }}
                >
                  <MaterialCommunityIcons name="flag-checkered" size={16} color={colors.gold} />
                  <Text style={{ flex: 1, fontFamily: "DMSans_400Regular", fontSize: 13, color: colors.text }}>
                    {milestone.label}
                  </Text>
                  <MaterialCommunityIcons name="chevron-right" size={16} color={colors.textMuted} />
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {onThisDayQuery.data?.length ? (
          <View
            style={{
              borderWidth: 1,
              borderColor: colors.gold,
              backgroundColor: colors.goldBackground,
              paddingVertical: 16
            }}
          >
            <Text
              style={{
                fontFamily: "DMSans_500Medium",
                fontSize: 11,
                color: colors.gold,
                textTransform: "uppercase",
                letterSpacing: 2,
                paddingHorizontal: 16,
                marginBottom: 12
              }}
            >
              On this day
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
              {onThisDayQuery.data.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => router.push(`/memory/${item.id}`)}
                  style={{
                    width: 208,
                    borderWidth: 1,
                    borderColor: `${colors.gold}55`,
                    backgroundColor: "rgba(255,255,255,0.34)",
                    paddingHorizontal: 14,
                    paddingVertical: 12
                  }}
                >
                  <Text numberOfLines={1} style={{ fontFamily: "DMSans_500Medium", fontSize: 13, color: colors.text }}>
                    {item.title}
                  </Text>
                  <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
                    {new Date(item.capturedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric"
                    })}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {monthGroups.length === 0 ? (
          <EmptyState
            title={hasActiveFilters ? "No memories match this filter" : "No memories yet"}
            body={
              hasActiveFilters
                ? "Try a different title, month, year, or exact date."
                : "Open Capture and save your first moment."
            }
            colors={colors}
          />
        ) : null}

        {monthGroups.length > 0 ? (
          <View style={{ gap: 14 }}>
            <View>
              <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 10, color: colors.brand, textTransform: "uppercase", letterSpacing: 2.4, marginBottom: 10 }}>
                Months
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                {monthGroups.map((group) => (
                  <MonthRailCard
                    key={group.key}
                    month={group}
                    selected={false}
                    onPress={() => {
                      router.push({ pathname: "/month/[key]", params: { key: group.key } } as any);
                    }}
                    colors={colors}
                    gradients={gradients}
                  />
                ))}
              </ScrollView>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
