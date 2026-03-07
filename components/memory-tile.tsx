import { Image, Pressable, Text, View } from "react-native";
import { MotiView } from "moti";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppTheme } from "@/hooks/use-app-theme";

type ThemeColors = ReturnType<typeof useAppTheme>["colors"];
type ThemeGradients = ReturnType<typeof useAppTheme>["gradients"];
import { MemoryItem } from "@/lib/types";

export function MemoryTile({
    item,
    big,
    index,
    colors,
    gradients
}: {
    item: MemoryItem;
    big?: boolean;
    index: number;
    colors: ThemeColors;
    gradients: ThemeGradients;
}) {
    const gradientSet = Object.values(gradients);
    const gradient = gradientSet[index % gradientSet.length];
    const showImage = item.mediaType === "image" && Boolean(item.mediaUrl);

    return (
        <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 320, delay: index * 35 }}
            style={{ flex: big ? undefined : 1 }}
        >
            <Pressable onPress={() => router.push(`/memory/${item.id}`)}>
                <View
                    style={{
                        height: big ? 188 : 118,
                        overflow: "hidden",
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: colors.surface
                    }}
                >
                    {showImage ? (
                        <Image
                            source={{ uri: item.mediaUrl }}
                            resizeMode="cover"
                            style={{ width: "100%", height: "100%" }}
                        />
                    ) : (
                        <LinearGradient
                            colors={gradient as readonly [string, string, ...string[]]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={{ width: "100%", height: "100%", alignItems: "center", justifyContent: "center" }}
                        >
                            <MaterialCommunityIcons
                                name={
                                    item.mediaType === "video"
                                        ? "video-outline"
                                        : item.mediaType === "voice"
                                            ? "microphone-outline"
                                            : "image-outline"
                                }
                                size={26}
                                color="#FFFFFF"
                            />
                        </LinearGradient>
                    )}

                    <LinearGradient
                        colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.84)"]}
                        style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: 12 }}
                    >
                        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                            <View style={{ flex: 1 }}>
                                <Text
                                    numberOfLines={1}
                                    style={{
                                        color: "#FFFFFF",
                                        fontFamily: "DMSans_500Medium",
                                        fontSize: big ? 14 : 11
                                    }}
                                >
                                    {item.title}
                                </Text>
                                <Text
                                    numberOfLines={1}
                                    style={{
                                        color: "rgba(255,255,255,0.72)",
                                        fontFamily: "DMSans_400Regular",
                                        fontSize: 10,
                                        marginTop: 3
                                    }}
                                >
                                    {new Date(item.capturedAt).toLocaleDateString(undefined, {
                                        month: "short",
                                        day: "numeric"
                                    })}
                                </Text>
                            </View>
                            <View
                                style={{
                                    minWidth: 50,
                                    alignItems: "center",
                                    gap: 4,
                                    borderWidth: 1,
                                    borderColor: "rgba(255,255,255,0.14)",
                                    backgroundColor: "rgba(0,0,0,0.3)",
                                    paddingHorizontal: 8,
                                    paddingVertical: 5
                                }}
                            >
                                <MaterialCommunityIcons
                                    name={
                                        item.mediaType === "video"
                                            ? "video-outline"
                                            : item.mediaType === "voice"
                                                ? "microphone-outline"
                                                : "image-outline"
                                    }
                                    size={14}
                                    color="#FFFFFF"
                                />
                                <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 9, color: "#FFFFFF" }}>
                                    {item.commentsCount + item.reactionsCount}
                                </Text>
                            </View>
                        </View>
                    </LinearGradient>
                </View>
            </Pressable>
        </MotiView>
    );
}
