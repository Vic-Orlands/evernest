import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Share, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAudioPlayer } from "expo-audio";
import { useVideoPlayer, VideoView } from "expo-video";
import { addComment, deleteMemory, getMemoryDetails, setReaction } from "@/lib/repositories";
import { queryKeys } from "@/lib/query-keys";
import { useAppTheme } from "@/hooks/use-app-theme";
import { MemoryVoiceNote } from "@/lib/types";

const emojiOptions = ["❤️", "👏", "😂", "🥹", "🔥", "🎉"] as const;

function formatDurationMs(durationMs: number | null): string {
  if (!durationMs) return "00:00";
  const totalSeconds = Math.max(1, Math.round(durationMs / 1000));
  const mins = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${mins}:${secs}`;
}

function VoiceNoteRow({
  note,
  colors
}: {
  note: MemoryVoiceNote;
  colors: ReturnType<typeof useAppTheme>["colors"];
}) {
  const player = useAudioPlayer(note.url);

  return (
    <View style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary, padding: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ width: 36, height: 36, backgroundColor: colors.brandBackground, alignItems: "center", justifyContent: "center" }}>
            <MaterialCommunityIcons name={player.playing ? "pause" : "play"} size={18} color={colors.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: "DMSans_500Medium", fontSize: 13, color: colors.text }}>
              Voice note
            </Text>
            <Text style={{ marginTop: 2, fontFamily: "DMSans_400Regular", fontSize: 11, color: colors.textMuted }}>
              {formatDurationMs(note.durationMs)}
            </Text>
          </View>
        </View>
        <Pressable
          onPress={() => {
            if (player.playing) {
              player.pause();
              return;
            }
            player.play();
          }}
          style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 10 }}
        >
          <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 11, color: colors.text }}>
            {player.playing ? "Pause" : "Play"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function MemoryDetailsScreen() {
  const { colors, gradients } = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const memoryId = typeof id === "string" ? id : "";
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  const detailsQuery = useQuery({
    queryKey: queryKeys.memoryDetails(memoryId),
    enabled: Boolean(memoryId),
    queryFn: async () => getMemoryDetails(memoryId)
  });

  const gradientSet = Object.values(gradients);
  const fallbackGradient = useMemo(() => {
    const code = memoryId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return gradientSet[code % gradientSet.length];
  }, [gradientSet, memoryId]);

  const selectedAsset = useMemo(() => {
    const assets = detailsQuery.data?.memory.assets ?? [];
    return assets.find((asset) => asset.id === selectedAssetId) ?? assets[0] ?? null;
  }, [detailsQuery.data, selectedAssetId]);

  const videoSource = useMemo(() => {
    if (selectedAsset?.mediaType === "video") {
      return selectedAsset.url;
    }
    return null;
  }, [selectedAsset]);

  const videoPlayer = useVideoPlayer(videoSource, (player) => {
    player.loop = true;
    player.play();
  });

  const commentMutation = useMutation({
    mutationFn: async () => addComment(memoryId, comment),
    onSuccess: async () => {
      setComment("");
      await queryClient.invalidateQueries({ queryKey: queryKeys.memoryDetails(memoryId) });
    },
    onError: (error) => {
      Alert.alert("Comment failed", error instanceof Error ? error.message : "Unknown error");
    }
  });

  const reactionMutation = useMutation({
    mutationFn: async (emoji: (typeof emojiOptions)[number]) => setReaction(memoryId, emoji),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.memoryDetails(memoryId) });
    },
    onError: (error) => {
      Alert.alert("Reaction failed", error instanceof Error ? error.message : "Unknown error");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => deleteMemory(memoryId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.memoryDetails(memoryId) });
      await queryClient.invalidateQueries({ queryKey: ["memories"] });
      router.replace("/(tabs)");
    },
    onError: (error) => {
      Alert.alert("Delete failed", error instanceof Error ? error.message : "Unknown error");
    }
  });

  const confirmDelete = () => {
    Alert.alert(
      "Delete memory?",
      "Are you sure you want to delete this memory? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate() }
      ]
    );
  };

  const handleShare = async () => {
    if (!detailsQuery.data) return;
    const { memory } = detailsQuery.data;
    const message = `${memory.title}\n${new Date(memory.capturedAt).toDateString()}\n\n${memory.note}\n\nShared from EverNest.`;
    const shareUrl = selectedAsset?.url ?? memory.mediaUrl ?? memory.voiceNotes[0]?.url;
    await Share.share(shareUrl ? { message, url: shareUrl } : { message });
  };

  if (detailsQuery.isLoading) {
    return (
      <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.backgroundSecondary }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.brand} />
        </View>
      </SafeAreaView>
    );
  }

  if (!detailsQuery.data) {
    return (
      <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.backgroundSecondary }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 }}>
          <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 14, color: colors.textMuted }}>
            {detailsQuery.error instanceof Error ? detailsQuery.error.message : "Memory not found."}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const { memory, comments, reactions } = detailsQuery.data;
  const mediaTypeBadge =
    memory.mediaCount > 1
      ? `${memory.mediaCount} items`
      : memory.mediaType === "video"
        ? "Video"
        : memory.mediaType === "voice"
          ? "Voice"
          : "Photo";
  const mediaTypeIcon =
    memory.mediaType === "video"
      ? "video-outline"
      : memory.mediaType === "voice"
        ? "microphone-outline"
        : "image-outline";

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.backgroundSecondary }}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={{ height: 390, overflow: "hidden" }}>
          {selectedAsset?.mediaType === "image" ? (
            <Image source={{ uri: selectedAsset.url }} resizeMode="cover" style={{ width: "100%", height: "100%" }} />
          ) : null}

          {selectedAsset?.mediaType === "video" ? (
            <VideoView
              player={videoPlayer}
              nativeControls
              allowsPictureInPicture
              contentFit="cover"
              style={{ width: "100%", height: "100%" }}
            />
          ) : null}

          {!selectedAsset ? (
            <LinearGradient colors={fallbackGradient} style={{ width: "100%", height: "100%", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 56 }}>🎙️</Text>
              <Text style={{ marginTop: 10, fontFamily: "DMSans_400Regular", fontSize: 13, color: "#FFFFFF" }}>
                Voice memory
              </Text>
            </LinearGradient>
          ) : null}

          <LinearGradient
            colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.82)"]}
            style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 18, paddingBottom: 18, paddingTop: 48 }}
          >
            <Pressable
              onPress={() => router.back()}
              style={{
                marginBottom: 14,
                height: 38,
                width: 38,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.15)",
                backgroundColor: "rgba(0,0,0,0.45)"
              }}
            >
              <MaterialCommunityIcons name="arrow-left" size={18} color="#FFFFFF" />
            </Pressable>
            <Text style={{ fontFamily: "InstrumentSerif_400Regular", fontSize: 36, color: "#FFFFFF" }}>
              {memory.title}
            </Text>
            <Text style={{ marginTop: 4, fontFamily: "DMSans_400Regular", fontSize: 11, color: "rgba(255,255,255,0.74)" }}>
              {new Date(memory.capturedAt).toLocaleString()}
            </Text>
          </LinearGradient>
        </View>

        {memory.assets.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, gap: 10 }}
          >
            {memory.assets.map((asset, index) => {
              const active = asset.id === selectedAsset?.id;

              return (
                <Pressable key={asset.id} onPress={() => setSelectedAssetId(asset.id)} style={{ width: 90 }}>
                  <View style={{ height: 104, overflow: "hidden", borderWidth: 2, borderColor: active ? colors.brand : colors.border, backgroundColor: colors.surface }}>
                    {asset.mediaType === "image" ? (
                      <Image source={{ uri: asset.url }} resizeMode="cover" style={{ width: "100%", height: "100%" }} />
                    ) : (
                      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceSecondary }}>
                        <MaterialCommunityIcons name="video-outline" size={24} color={colors.text} />
                      </View>
                    )}
                  </View>
                  <Text style={{ marginTop: 6, fontFamily: "DMSans_400Regular", fontSize: 11, color: active ? colors.brand : colors.textMuted }}>
                    {asset.mediaType === "image" ? "Photo" : "Video"} {index + 1}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        <View style={{ paddingHorizontal: 20, paddingTop: 14, flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{ width: 30, height: 30, backgroundColor: colors.brandBackground, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontFamily: "DMSans_500Medium", fontSize: 12, color: colors.brand }}>
                {(memory.createdByName || "G").slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 12, color: colors.text }}>
              {memory.createdByName}
            </Text>
            <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 11, color: colors.textMuted }}>·</Text>
            <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 11, color: colors.textMuted }}>
              {new Date(memory.capturedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 9, paddingVertical: 5 }}>
            <MaterialCommunityIcons name={mediaTypeIcon} size={12} color={colors.textMuted} />
            <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 10, color: colors.textMuted }}>{mediaTypeBadge}</Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 15, lineHeight: 26, color: colors.textSecondary }}>
            {memory.note}
          </Text>

          {memory.tags.length > 0 ? (
            <View style={{ marginTop: 14, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {memory.tags.map((tag) => (
                <View key={`${memory.id}-${tag}`} style={{ borderWidth: 1, borderColor: colors.brand, backgroundColor: colors.brandBackground, paddingHorizontal: 12, paddingVertical: 6 }}>
                  <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 11, color: colors.brandSecondary }}>#{tag}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {memory.voiceNotes.length > 0 ? (
            <View style={{ marginTop: 18, gap: 10 }}>
              <Text style={{ fontFamily: "DMSans_500Medium", fontSize: 14, color: colors.text }}>
                Voice notes
              </Text>
              {memory.voiceNotes.map((voiceNote) => (
                <VoiceNoteRow key={voiceNote.id} note={voiceNote} colors={colors} />
              ))}
            </View>
          ) : null}

          <View style={{ marginTop: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 16 }}>
            <Text style={{ fontFamily: "DMSans_500Medium", fontSize: 14, color: colors.text }}>React</Text>
            <View style={{ marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {emojiOptions.map((emoji) => (
                <Pressable
                  key={emoji}
                  onPress={() => reactionMutation.mutate(emoji)}
                  style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary, paddingHorizontal: 12, paddingVertical: 8 }}
                >
                  <Text style={{ fontSize: 16 }}>{emoji}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={{ marginTop: 10, fontFamily: "DMSans_400Regular", fontSize: 11, color: colors.textMuted }}>
              {reactions.length} reactions
            </Text>
          </View>

          <View style={{ marginTop: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 16 }}>
            <Text style={{ fontFamily: "DMSans_500Medium", fontSize: 14, color: colors.text }}>Comments</Text>
            <View style={{ marginTop: 12, gap: 10 }}>
              {comments.length > 0 ? (
                comments.map((item) => (
                  <View key={item.id} style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary, padding: 12 }}>
                    <Text style={{ fontFamily: "DMSans_500Medium", fontSize: 12, color: colors.text }}>{item.userName}</Text>
                    <Text style={{ marginTop: 4, fontFamily: "DMSans_400Regular", fontSize: 13, lineHeight: 22, color: colors.textSecondary }}>
                      {item.body}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 12, color: colors.textMuted }}>No comments yet.</Text>
              )}
            </View>

            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="Add a comment"
              placeholderTextColor={colors.textMuted}
              multiline
              style={{
                marginTop: 14,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surfaceSecondary,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontFamily: "DMSans_400Regular",
                fontSize: 13,
                color: colors.text,
                minHeight: 64
              }}
            />

            <View style={{ marginTop: 12, flexDirection: "row", gap: 10 }}>
              <Pressable
                onPress={() => commentMutation.mutate()}
                disabled={!comment.trim() || commentMutation.isPending}
                style={{ flex: 1, backgroundColor: colors.brand, paddingVertical: 12 }}
              >
                <Text style={{ textAlign: "center", fontFamily: "DMSans_500Medium", fontSize: 13, color: "#FFFFFF" }}>
                  {commentMutation.isPending ? "Posting..." : "Post comment"}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  void handleShare();
                }}
                style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary, paddingHorizontal: 16, justifyContent: "center" }}
              >
                <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 12, color: colors.text }}>
                  Share this memory
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={{ marginTop: 24, paddingBottom: 24 }}>
            <Pressable
              onPress={confirmDelete}
              disabled={deleteMutation.isPending}
              style={{
                borderWidth: 1,
                borderColor: "rgba(239, 68, 68, 0.3)",
                backgroundColor: "rgba(239, 68, 68, 0.05)",
                paddingVertical: 14,
                alignItems: "center"
              }}
            >
              <Text style={{ fontFamily: "DMSans_500Medium", fontSize: 13, color: "rgb(239, 68, 68)" }}>
                {deleteMutation.isPending ? "Deleting..." : "Delete memory"}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
