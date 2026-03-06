import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    Text,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { MotiView } from "moti";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { queryKeys } from "@/lib/query-keys";
import { useWorkspace } from "@/hooks/use-workspace";
import { listMilestones } from "@/lib/workspace";
import { T, gradients } from "@/lib/theme";
import { Milestone } from "@/lib/types";

const gradientSet = Object.values(gradients);

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

function milestoneColor(index: number): string {
    const colors = [T.terracotta, T.sage, T.gold, "#8B9CF7", T.blush, T.sageLight];
    return colors[index % colors.length];
}

export default function MilestonesScreen() {
    const { childId } = useLocalSearchParams<{ childId: string }>();
    const resolvedChildId = typeof childId === "string" ? childId : "";
    const { workspace } = useWorkspace();

    const child = workspace?.children.find((c) => c.id === resolvedChildId);

    const milestonesQuery = useQuery({
        queryKey: queryKeys.milestones(resolvedChildId),
        enabled: Boolean(resolvedChildId),
        queryFn: () => listMilestones(resolvedChildId)
    });

    const [filter, setFilter] = useState<"all" | "open" | "done">("all");

    const milestones = milestonesQuery.data ?? [];
    const filtered =
        filter === "all"
            ? milestones
            : filter === "open"
                ? milestones.filter((m) => !m.completedMemoryId)
                : milestones.filter((m) => m.completedMemoryId);

    const completedCount = milestones.filter((m) => m.completedMemoryId).length;
    const totalCount = milestones.length;
    const progress = totalCount > 0 ? completedCount / totalCount : 0;

    if (milestonesQuery.isLoading) {
        return (
            <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: T.night2 }}>
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <ActivityIndicator color={T.terracotta} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: T.night2 }}>
            <ScrollView
                contentInsetAdjustmentBehavior="automatic"
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 120 }}
            >
                {/* Hero */}
                <View style={{ height: 260, overflow: "hidden" }}>
                    <LinearGradient
                        colors={["#2A3A28", "#1A2818", T.night2]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={{ flex: 1, justifyContent: "flex-end", paddingHorizontal: 20, paddingBottom: 24 }}
                    >
                        {/* Back button */}
                        <Pressable
                            onPress={() => router.back()}
                            style={{
                                position: "absolute",
                                top: 12,
                                left: 20,
                                width: 36,
                                height: 36,
                                borderRadius: 18,
                                borderWidth: 1,
                                borderColor: "rgba(255,255,255,0.15)",
                                backgroundColor: "rgba(0,0,0,0.35)",
                                alignItems: "center",
                                justifyContent: "center"
                            }}
                        >
                            <MaterialCommunityIcons name="arrow-left" size={18} color={T.cream} />
                        </Pressable>

                        {/* Floating emoji decorations */}
                        <MotiView
                            from={{ opacity: 0, translateY: 20 }}
                            animate={{ opacity: 0.15, translateY: 0 }}
                            transition={{ type: "timing", duration: 800 }}
                            style={{ position: "absolute", top: 40, right: 30 }}
                        >
                            <Text style={{ fontSize: 48 }}>🌱</Text>
                        </MotiView>
                        <MotiView
                            from={{ opacity: 0, translateY: 20 }}
                            animate={{ opacity: 0.1, translateY: 0 }}
                            transition={{ type: "timing", duration: 900, delay: 200 }}
                            style={{ position: "absolute", top: 80, right: 80 }}
                        >
                            <Text style={{ fontSize: 32 }}>✨</Text>
                        </MotiView>

                        <MotiView
                            from={{ opacity: 0, translateY: 16 }}
                            animate={{ opacity: 1, translateY: 0 }}
                            transition={{ type: "timing", duration: 500 }}
                        >
                            <Text
                                style={{
                                    fontFamily: "DMSans_400Regular",
                                    fontSize: 10,
                                    color: T.sage,
                                    textTransform: "uppercase",
                                    letterSpacing: 2.6,
                                    marginBottom: 8
                                }}
                            >
                                Milestones
                            </Text>
                            <Text
                                style={{
                                    fontFamily: "DMSans_500Medium",
                                    fontSize: 32,
                                    color: T.cream,
                                    lineHeight: 38,
                                    letterSpacing: -0.5
                                }}
                            >
                                {child?.firstName ?? "Child"}'s{"\n"}
                                <Text style={{ color: T.sageLight }}>Journey</Text>
                            </Text>
                        </MotiView>
                    </LinearGradient>
                </View>

                <View style={{ paddingHorizontal: 20 }}>
                    {/* Progress card */}
                    <MotiView
                        from={{ opacity: 0, translateY: 12 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: "timing", duration: 400, delay: 80 }}
                        style={{
                            marginTop: -20,
                            borderWidth: 1,
                            borderColor: T.night4,
                            backgroundColor: T.night3,
                            padding: 18,
                            borderRadius: 20
                        }}
                    >
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                            <Text style={{ fontFamily: "DMSans_500Medium", fontSize: 14, color: T.cream }}>
                                Progress
                            </Text>
                            <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 12, color: T.moonDim }}>
                                {completedCount} of {totalCount}
                            </Text>
                        </View>

                        {/* Progress bar */}
                        <View style={{ height: 6, borderRadius: 3, backgroundColor: T.night4, overflow: "hidden" }}>
                            <MotiView
                                from={{ width: "0%" }}
                                animate={{ width: `${Math.round(progress * 100)}%` }}
                                transition={{ type: "timing", duration: 800, delay: 300 }}
                                style={{
                                    height: 6,
                                    borderRadius: 3,
                                    backgroundColor: T.sage
                                }}
                            />
                        </View>

                        {/* Stats row */}
                        <View style={{ marginTop: 16, flexDirection: "row", gap: 12 }}>
                            <View style={{ flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 12, backgroundColor: "rgba(122,158,126,0.10)", borderWidth: 1, borderColor: "rgba(122,158,126,0.20)" }}>
                                <Text style={{ fontFamily: "DMSans_500Medium", fontSize: 22, color: T.cream }}>{completedCount}</Text>
                                <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 9, color: T.moonDim, textTransform: "uppercase", letterSpacing: 1.5, marginTop: 2 }}>Completed</Text>
                            </View>
                            <View style={{ flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 12, backgroundColor: "rgba(212,168,67,0.10)", borderWidth: 1, borderColor: "rgba(212,168,67,0.20)" }}>
                                <Text style={{ fontFamily: "DMSans_500Medium", fontSize: 22, color: T.cream }}>{totalCount - completedCount}</Text>
                                <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 9, color: T.moonDim, textTransform: "uppercase", letterSpacing: 1.5, marginTop: 2 }}>Remaining</Text>
                            </View>
                            <View style={{ flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 12, backgroundColor: "rgba(196,98,58,0.10)", borderWidth: 1, borderColor: "rgba(196,98,58,0.20)" }}>
                                <Text style={{ fontFamily: "DMSans_500Medium", fontSize: 22, color: T.cream }}>{Math.round(progress * 100)}%</Text>
                                <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 9, color: T.moonDim, textTransform: "uppercase", letterSpacing: 1.5, marginTop: 2 }}>Overall</Text>
                            </View>
                        </View>
                    </MotiView>

                    {/* Filter pills */}
                    <View style={{ marginTop: 20, flexDirection: "row", gap: 8 }}>
                        {(["all", "open", "done"] as const).map((option) => (
                            <Pressable
                                key={option}
                                onPress={() => setFilter(option)}
                                style={{
                                    paddingHorizontal: 16,
                                    paddingVertical: 8,
                                    borderRadius: 20,
                                    borderWidth: 1,
                                    borderColor: filter === option ? "rgba(196,98,58,0.45)" : T.night4,
                                    backgroundColor: filter === option ? "rgba(196,98,58,0.20)" : "rgba(46,38,32,0.40)"
                                }}
                            >
                                <Text
                                    style={{
                                        fontFamily: "DMSans_400Regular",
                                        fontSize: 12,
                                        color: filter === option ? T.blush : T.moonDim,
                                        textTransform: "capitalize"
                                    }}
                                >
                                    {option === "all" ? `All (${totalCount})` : option === "open" ? `Open (${totalCount - completedCount})` : `Done (${completedCount})`}
                                </Text>
                            </Pressable>
                        ))}
                    </View>

                    {/* Milestone list */}
                    <View style={{ marginTop: 20, gap: 12 }}>
                        {filtered.map((milestone, index) => {
                            const done = Boolean(milestone.completedMemoryId);
                            const color = milestoneColor(index);
                            const emoji = milestoneEmoji(milestone.templateKey);
                            const gradient = gradientSet[index % gradientSet.length];

                            return (
                                <MotiView
                                    key={milestone.id}
                                    from={{ opacity: 0, translateY: 10 }}
                                    animate={{ opacity: 1, translateY: 0 }}
                                    transition={{ type: "timing", duration: 300, delay: index * 40 }}
                                >
                                    <Pressable
                                        onPress={() => {
                                            if (done && milestone.completedMemoryId) {
                                                router.push(`/memory/${milestone.completedMemoryId}`);
                                            }
                                        }}
                                        style={{
                                            borderWidth: 1,
                                            borderColor: done ? `${color}30` : T.night4,
                                            backgroundColor: T.night3,
                                            borderRadius: 18,
                                            overflow: "hidden"
                                        }}
                                    >
                                        {/* Top accent bar */}
                                        {done ? (
                                            <LinearGradient
                                                colors={gradient}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 0 }}
                                                style={{ height: 3 }}
                                            />
                                        ) : null}

                                        <View style={{ padding: 16, flexDirection: "row", alignItems: "center", gap: 14 }}>
                                            {/* Emoji circle */}
                                            <View
                                                style={{
                                                    width: 48,
                                                    height: 48,
                                                    borderRadius: 16,
                                                    backgroundColor: done ? `${color}18` : "rgba(46,38,32,0.50)",
                                                    borderWidth: 1.5,
                                                    borderColor: done ? `${color}30` : T.night4,
                                                    alignItems: "center",
                                                    justifyContent: "center"
                                                }}
                                            >
                                                <Text style={{ fontSize: 22 }}>{emoji}</Text>
                                            </View>

                                            {/* Label + meta */}
                                            <View style={{ flex: 1 }}>
                                                <Text
                                                    style={{
                                                        fontFamily: "DMSans_500Medium",
                                                        fontSize: 14,
                                                        color: done ? T.cream : T.moon,
                                                        textDecorationLine: done ? "none" : "none"
                                                    }}
                                                >
                                                    {milestone.label}
                                                </Text>
                                                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                                                    {milestone.dueAt ? (
                                                        <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 11, color: T.moonDim }}>
                                                            Due {new Date(milestone.dueAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                                                        </Text>
                                                    ) : null}
                                                    {done ? (
                                                        <View
                                                            style={{
                                                                flexDirection: "row",
                                                                alignItems: "center",
                                                                gap: 4,
                                                                backgroundColor: `${T.sage}18`,
                                                                borderWidth: 1,
                                                                borderColor: `${T.sage}30`,
                                                                paddingHorizontal: 8,
                                                                paddingVertical: 3,
                                                                borderRadius: 10
                                                            }}
                                                        >
                                                            <MaterialCommunityIcons name="check-circle" size={12} color={T.sage} />
                                                            <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 10, color: T.sage }}>
                                                                Completed
                                                            </Text>
                                                        </View>
                                                    ) : (
                                                        <View
                                                            style={{
                                                                flexDirection: "row",
                                                                alignItems: "center",
                                                                gap: 4,
                                                                backgroundColor: "rgba(212,168,67,0.10)",
                                                                borderWidth: 1,
                                                                borderColor: "rgba(212,168,67,0.20)",
                                                                paddingHorizontal: 8,
                                                                paddingVertical: 3,
                                                                borderRadius: 10
                                                            }}
                                                        >
                                                            <MaterialCommunityIcons name="clock-outline" size={12} color={T.gold} />
                                                            <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 10, color: T.gold }}>
                                                                In progress
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>
                                            </View>

                                            {/* Chevron for completed milestones */}
                                            {done ? (
                                                <MaterialCommunityIcons name="chevron-right" size={20} color={T.moonDim} />
                                            ) : null}
                                        </View>
                                    </Pressable>
                                </MotiView>
                            );
                        })}

                        {filtered.length === 0 ? (
                            <View
                                style={{
                                    borderWidth: 1,
                                    borderColor: T.night4,
                                    backgroundColor: T.night3,
                                    paddingHorizontal: 16,
                                    paddingVertical: 24,
                                    borderRadius: 16,
                                    alignItems: "center"
                                }}
                            >
                                <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 13, color: T.moon }}>
                                    No milestones match this filter.
                                </Text>
                            </View>
                        ) : null}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
