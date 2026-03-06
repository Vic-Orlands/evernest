import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MotiView } from "moti";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ChildSwitcher } from "@/components/child-switcher";
import { EmptyState } from "@/components/empty-state";
import { useWorkspace } from "@/hooks/use-workspace";
import { useAppTheme } from "@/hooks/use-app-theme";
import { createCapsule, listCapsules, listMemories } from "@/lib/repositories";
import { queryKeys } from "@/lib/query-keys";

const BUTTON_PADDING_Y = 11;

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
  const { colors } = useAppTheme();
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
          <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
            <EmptyState
              title="Workspace unavailable"
              body={workspaceError instanceof Error ? workspaceError.message : "Could not load your family workspace."}
              colors={colors}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (capsulesQuery.error || memoriesQuery.error) {
    const message =
      capsulesQuery.error instanceof Error
        ? capsulesQuery.error.message
        : memoriesQuery.error instanceof Error
          ? memoriesQuery.error.message
          : "Unknown error";

    return (
      <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.backgroundSecondary }}>
        <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ flex: 1 }}>
          <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
            <EmptyState title="Could not load capsules" body={message} colors={colors} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.backgroundSecondary }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={capsulesQuery.isRefetching || memoriesQuery.isRefetching} onRefresh={() => void refreshAll()} tintColor={colors.gold} />}
      >
        <Text style={{ textAlign: "center", fontSize: 52 }}>🏺</Text>
        <Text style={{ textAlign: "center", fontFamily: "InstrumentSerif_400Regular", fontSize: 38, color: colors.text }}>
          Time Capsules
        </Text>
        <Text style={{ textAlign: "center", fontFamily: "DMSans_400Regular", fontSize: 12, color: colors.textMuted, marginTop: 4 }}>
          Seal memories now and deliver them years later with intent.
        </Text>

        <ChildSwitcher childProfiles={workspace.children} activeChildId={activeChild.id} onSelect={setActiveChildId} colors={colors} />

        <View style={{ marginTop: 16, flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1, borderWidth: 1, borderColor: colors.gold, backgroundColor: colors.goldBackground, padding: 16 }}>
            <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 10, textTransform: "uppercase", letterSpacing: 2, color: colors.gold }}>
              Scheduled
            </Text>
            <Text style={{ fontFamily: "InstrumentSerif_400Regular", fontSize: 30, color: colors.text, marginTop: 8 }}>
              {(capsulesQuery.data ?? []).length}
            </Text>
          </View>
          <View style={{ flex: 1, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 16 }}>
            <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 10, textTransform: "uppercase", letterSpacing: 2, color: colors.textMuted }}>
              Memories ready
            </Text>
            <Text style={{ fontFamily: "InstrumentSerif_400Regular", fontSize: 30, color: colors.text, marginTop: 8 }}>
              {memoryOptions.length}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={() => {
            setShowCreate((prev) => !prev);
            if (!showCreate && suggested18th && !releaseDate) {
              setReleaseDate(suggested18th);
            }
          }}
          style={{
            marginTop: 16,
            borderWidth: 1,
            borderColor: colors.gold,
            backgroundColor: colors.goldBackground,
            paddingHorizontal: 16,
            paddingVertical: BUTTON_PADDING_Y
          }}
        >
          <Text style={{ textAlign: "center", fontFamily: "DMSans_500Medium", fontSize: 14, color: colors.gold }}>
            Create new time capsule
          </Text>
        </Pressable>

        {showCreate ? (
          <MotiView
            from={{ opacity: 0, translateY: -6 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 260 }}
            style={{
              marginTop: 12,
              borderWidth: 1,
              borderColor: `${colors.gold}55`,
              backgroundColor: colors.surface,
              padding: 16
            }}
          >
            <TextInput
              placeholder="Capsule title"
              placeholderTextColor={colors.textMuted}
              value={title}
              onChangeText={setTitle}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surfaceSecondary,
                paddingHorizontal: 14,
                paddingVertical: BUTTON_PADDING_Y,
                fontFamily: "DMSans_400Regular",
                fontSize: 14,
                color: colors.text
              }}
            />
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="Recipient email"
              placeholderTextColor={colors.textMuted}
              value={recipientEmail}
              onChangeText={setRecipientEmail}
              style={{
                marginTop: 10,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surfaceSecondary,
                paddingHorizontal: 14,
                paddingVertical: BUTTON_PADDING_Y,
                fontFamily: "DMSans_400Regular",
                fontSize: 14,
                color: colors.text
              }}
            />
            <TextInput
              placeholder="Unlock date (YYYY-MM-DD)"
              placeholderTextColor={colors.textMuted}
              value={releaseDate}
              onChangeText={setReleaseDate}
              style={{
                marginTop: 10,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surfaceSecondary,
                paddingHorizontal: 14,
                paddingVertical: BUTTON_PADDING_Y,
                fontFamily: "DMSans_400Regular",
                fontSize: 14,
                color: colors.text
              }}
            />

            {suggested18th ? (
              <View style={{ marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Pressable
                  onPress={() => setReleaseDate(suggested18th)}
                  style={{ borderWidth: 1, borderColor: colors.gold, backgroundColor: colors.goldBackground, paddingHorizontal: 12, paddingVertical: 7 }}
                >
                  <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 11, color: colors.gold }}>18th birthday</Text>
                </Pressable>
                <Pressable
                  onPress={() => setReleaseDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))}
                  style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary, paddingHorizontal: 12, paddingVertical: 7 }}
                >
                  <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 11, color: colors.text }}>In one year</Text>
                </Pressable>
              </View>
            ) : null}

            <Text style={{ marginTop: 14, fontFamily: "DMSans_400Regular", fontSize: 10, textTransform: "uppercase", letterSpacing: 1.8, color: colors.textMuted }}>
              Select memories
            </Text>
            <View style={{ marginTop: 10, gap: 8 }}>
              {memoryOptions.map((memory) => {
                const active = selectedMemoryIds.includes(memory.id);
                return (
                  <Pressable
                    key={memory.id}
                    onPress={() => toggleMemory(memory.id)}
                    style={{
                      borderWidth: 1,
                      borderColor: active ? colors.gold : colors.border,
                      backgroundColor: active ? colors.goldBackground : colors.surfaceSecondary,
                      paddingHorizontal: 14,
                      paddingVertical: BUTTON_PADDING_Y
                    }}
                  >
                    <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 12, color: colors.text }}>
                      {memory.title}
                    </Text>
                    <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 10, color: colors.textMuted, marginTop: 4 }}>
                      {new Date(memory.capturedAt).toDateString()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={{ marginTop: 10, fontFamily: "DMSans_400Regular", fontSize: 11, color: colors.textMuted }}>
              {selectedMemoryIds.length} memories selected
            </Text>

            <Pressable
              onPress={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              style={{
                marginTop: 12,
                backgroundColor: colors.brand,
                paddingVertical: BUTTON_PADDING_Y
              }}
            >
              <Text style={{ textAlign: "center", fontFamily: "DMSans_500Medium", fontSize: 14, color: "#FFFFFF" }}>
                {saveMutation.isPending ? "Sealing..." : "Seal capsule"}
              </Text>
            </Pressable>
          </MotiView>
        ) : null}

        <View style={{ marginTop: 18, gap: 12 }}>
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
                  borderColor: `${colors.gold}55`,
                  backgroundColor: colors.surface,
                  padding: 16,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: "DMSans_500Medium", fontSize: 14, color: colors.goldLight }}>
                      {capsule.title}
                    </Text>
                    <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
                      To {capsule.recipientEmail}
                    </Text>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      borderWidth: 1,
                      borderColor: `${colors.gold}50`,
                      backgroundColor: colors.goldBackground,
                      paddingHorizontal: 10,
                      paddingVertical: 6
                    }}
                  >
                    <MaterialCommunityIcons
                      name={
                        capsule.status === "scheduled"
                          ? "lock-outline"
                          : capsule.status === "sent"
                            ? "lock-open-variant-outline"
                            : "close-circle-outline"
                      }
                      size={12}
                      color={colors.gold}
                    />
                    <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 10, textTransform: "uppercase", color: colors.gold }}>
                      {capsule.status}
                    </Text>
                  </View>
                </View>
                <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 11, color: colors.text }}>
                    Unlocks {new Date(capsule.releaseAt).toDateString()}
                  </Text>
                  <Text style={{ fontFamily: "DMSans_500Medium", fontSize: 11, color: isPast ? colors.sage : colors.gold }}>
                    {isPast ? "Ready to open" : `${days} days to go`}
                  </Text>
                </View>
              </MotiView>
            );
          })}

          {(capsulesQuery.data ?? []).length === 0 ? (
            <EmptyState
              title="No capsules yet"
              body="Create one for a birthday, graduation, or a future letter."
              colors={colors}
            />
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
