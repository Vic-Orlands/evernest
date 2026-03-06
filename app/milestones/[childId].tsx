import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { MotiView } from "moti";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { queryKeys } from "@/lib/query-keys";
import { useWorkspace } from "@/hooks/use-workspace";
import { listMilestones } from "@/lib/workspace";
import { useAppTheme } from "@/hooks/use-app-theme";

function milestoneEmoji(templateKey: string): string {
  const map: Record<string, string> = {
    first_word: "🗣️",
    first_step: "👣",
    first_smile: "😊",
    first_tooth: "🦷",
    first_food: "🍼",
    first_day_school: "🎒",
    first_haircut: "✂️",
    first_swim: "🏊",
    first_bike: "🚲",
    first_drawing: "🎨"
  };
  return map[templateKey] ?? "🌟";
}

export default function MilestonesScreen() {
  const { colors, gradients } = useAppTheme();
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const resolvedChildId = typeof childId === "string" ? childId : "";
  const { workspace } = useWorkspace();
  const child = workspace?.children.find((item) => item.id === resolvedChildId);
  const [filter, setFilter] = useState<"all" | "open" | "done">("all");

  const milestonesQuery = useQuery({
    queryKey: queryKeys.milestones(resolvedChildId),
    enabled: Boolean(resolvedChildId),
    queryFn: () => listMilestones(resolvedChildId)
  });

  const milestones = milestonesQuery.data ?? [];
  const filtered =
    filter === "all"
      ? milestones
      : filter === "open"
        ? milestones.filter((item) => !item.completedMemoryId)
        : milestones.filter((item) => item.completedMemoryId);

  const completedCount = milestones.filter((item) => item.completedMemoryId).length;
  const totalCount = milestones.length;
  const progress = totalCount > 0 ? completedCount / totalCount : 0;

  if (milestonesQuery.isLoading) {
    return (
      <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.backgroundSecondary }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.brand} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.backgroundSecondary }}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={{ height: 260, overflow: "hidden" }}>
          <LinearGradient
            colors={[gradients.sage[0], gradients.sage[1], colors.backgroundSecondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{ flex: 1, justifyContent: "flex-end", paddingHorizontal: 20, paddingBottom: 24 }}
          >
            <Pressable
              onPress={() => router.back()}
              style={{
                position: "absolute",
                top: 12,
                left: 20,
                width: 36,
                height: 36,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.15)",
                backgroundColor: "rgba(0,0,0,0.35)",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <MaterialCommunityIcons name="arrow-left" size={18} color="#FFFFFF" />
            </Pressable>

            <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 10, color: colors.sageLight, textTransform: "uppercase", letterSpacing: 2.6, marginBottom: 8 }}>
              Milestones
            </Text>
            <Text style={{ fontFamily: "DMSans_500Medium", fontSize: 32, lineHeight: 38, color: "#FFFFFF" }}>
              {child?.firstName ?? "Child"}&apos;s journey
            </Text>
          </LinearGradient>
        </View>

        <View style={{ paddingHorizontal: 20 }}>
          <MotiView
            from={{ opacity: 0, translateY: 12 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 400, delay: 80 }}
            style={{
              marginTop: -20,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              padding: 18
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <Text style={{ fontFamily: "DMSans_500Medium", fontSize: 14, color: colors.text }}>Progress</Text>
              <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 12, color: colors.textMuted }}>
                {completedCount} of {totalCount}
              </Text>
            </View>
            <View style={{ height: 6, backgroundColor: colors.border, overflow: "hidden" }}>
              <MotiView
                from={{ width: "0%" }}
                animate={{ width: `${Math.round(progress * 100)}%` }}
                transition={{ type: "timing", duration: 800, delay: 300 }}
                style={{ height: 6, backgroundColor: colors.sage }}
              />
            </View>
            <View style={{ marginTop: 16, flexDirection: "row", gap: 12 }}>
              {[
                { label: "Completed", value: completedCount, bg: colors.sageBackground },
                { label: "Remaining", value: totalCount - completedCount, bg: colors.goldBackground },
                { label: "Overall", value: `${Math.round(progress * 100)}%`, bg: colors.brandBackground }
              ].map((item) => (
                <View key={item.label} style={{ flex: 1, alignItems: "center", paddingVertical: 10, backgroundColor: item.bg, borderWidth: 1, borderColor: colors.border }}>
                  <Text style={{ fontFamily: "DMSans_500Medium", fontSize: 22, color: colors.text }}>{item.value}</Text>
                  <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 9, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1.5, marginTop: 2 }}>
                    {item.label}
                  </Text>
                </View>
              ))}
            </View>
          </MotiView>

          <View style={{ marginTop: 20, flexDirection: "row", gap: 8 }}>
            {(["all", "open", "done"] as const).map((option) => (
              <Pressable
                key={option}
                onPress={() => setFilter(option)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 7,
                  borderWidth: 1,
                  borderColor: filter === option ? colors.brand : colors.border,
                  backgroundColor: filter === option ? colors.brandBackground : colors.surface
                }}
              >
                <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 11, color: filter === option ? colors.brand : colors.textMuted }}>
                  {option}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={{ marginTop: 18, gap: 12 }}>
            {filtered.map((milestone, index) => {
              const completed = Boolean(milestone.completedMemoryId);
              return (
                <MotiView
                  key={milestone.id}
                  from={{ opacity: 0, translateY: 10 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ duration: 260, delay: index * 40 }}
                  style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                    padding: 16
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View style={{ width: 48, height: 48, alignItems: "center", justifyContent: "center", backgroundColor: completed ? colors.sageBackground : colors.brandBackground }}>
                      <Text style={{ fontSize: 24 }}>{milestoneEmoji(milestone.templateKey)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: "DMSans_500Medium", fontSize: 14, color: colors.text }}>{milestone.label}</Text>
                      <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
                        {completed ? "Captured in the timeline" : "Still waiting to be marked with a memory"}
                      </Text>
                    </View>
                    <View style={{ borderWidth: 1, borderColor: completed ? colors.sage : colors.brand, backgroundColor: completed ? colors.sageBackground : colors.brandBackground, paddingHorizontal: 10, paddingVertical: 6 }}>
                      <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 10, textTransform: "uppercase", color: completed ? colors.sage : colors.brand }}>
                        {completed ? "Done" : "Open"}
                      </Text>
                    </View>
                  </View>
                </MotiView>
              );
            })}

            {filtered.length === 0 ? (
              <View style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 18 }}>
                <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 13, color: colors.textMuted }}>
                  No milestones match this filter yet.
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
