import { useMemo } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MemoryTile } from "@/components/memory-tile";
import { EmptyState } from "@/components/empty-state";
import { useWorkspace } from "@/hooks/use-workspace";
import { useAppTheme } from "@/hooks/use-app-theme";
import { queryKeys } from "@/lib/query-keys";
import { listMemories } from "@/lib/repositories";

export default function MonthScreen() {
    const { colors, gradients } = useAppTheme();
    const { key } = useLocalSearchParams<{ key: string }>();
    const monthKey = typeof key === "string" ? key : "";

    const { workspace, workspaceLoading, activeChild } = useWorkspace();

    const memoriesQuery = useQuery({
        queryKey: workspace && activeChild ? queryKeys.memories(workspace.family.id, activeChild.id) : ["memories", "guest"],
        enabled: Boolean(workspace && activeChild),
        queryFn: async () => listMemories(workspace!.family.id, activeChild!.id)
    });

    const monthMemories = useMemo(() => {
        return (memoriesQuery.data ?? []).filter((memory) => {
            const date = new Date(memory.capturedAt);
            const testKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
            return testKey === monthKey;
        });
    }, [memoriesQuery.data, monthKey]);

    const monthLabel = useMemo(() => {
        if (!monthMemories.length) return monthKey;
        return new Date(monthMemories[0].capturedAt).toLocaleDateString(undefined, {
            month: "long",
            year: "numeric"
        });
    }, [monthMemories, monthKey]);

    if (workspaceLoading || (memoriesQuery.isLoading && !memoriesQuery.data)) {
        return (
            <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.backgroundSecondary }}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <ActivityIndicator color={colors.brand} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.backgroundSecondary }}>
            <Stack.Screen
                options={{
                    title: monthLabel,
                    headerShown: true,
                    headerTransparent: true,
                    headerStyle: { backgroundColor: "transparent" },
                    headerTitleStyle: { fontFamily: "InstrumentSerif_400Regular", fontSize: 24, color: colors.text },
                    headerLeft: () => (
                        <Pressable
                            onPress={() => router.back()}
                            style={{
                                height: 38,
                                width: 38,
                                alignItems: "center",
                                justifyContent: "center",
                                borderWidth: 1,
                                borderColor: colors.border,
                                backgroundColor: colors.surface,
                                borderRadius: 19
                            }}
                        >
                            <MaterialCommunityIcons name="arrow-left" size={18} color={colors.text} />
                        </Pressable>
                    )
                }}
            />
            <ScrollView
                contentInsetAdjustmentBehavior="automatic"
                contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 60, paddingBottom: 120, gap: 14 }}
            >
                <View style={{ marginBottom: 10 }}>
                    <Text style={{ fontFamily: "InstrumentSerif_400Regular", fontSize: 32, color: colors.text }}>
                        {monthLabel}
                    </Text>
                    <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 13, color: colors.textMuted, marginTop: 4 }}>
                        {monthMemories.length} {monthMemories.length === 1 ? "memory" : "memories"} saved
                    </Text>
                </View>

                {monthMemories.length === 0 ? (
                    <EmptyState
                        title="No memories found"
                        body={`There are no memories for this month.`}
                        colors={colors}
                    />
                ) : (
                    <View style={{ gap: 10 }}>
                        {monthMemories.map((memory, index) => (
                            <MemoryTile
                                key={memory.id}
                                item={memory}
                                big={true}
                                index={index}
                                colors={colors}
                                gradients={gradients}
                            />
                        ))}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
