import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Share, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { MotiView } from "moti";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { addComment, getMemoryDetails, setReaction } from "@/lib/repositories";
import { queryKeys } from "@/lib/query-keys";
import { useAudioPlayer } from "expo-audio";
import { useVideoPlayer, VideoView } from "expo-video";
import { useAppTheme } from "@/hooks/use-app-theme";

const emojiOptions = ["❤️", "👏", "😂", "🥹", "🔥", "🎉"] as const;

export default function MemoryDetailsScreen() {
  const { colors, gradients } = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const memoryId = typeof id === "string" ? id : "";
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");

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

  const videoSource = useMemo(() => {
    if (detailsQuery.data?.memory.mediaType === "video") {
      return detailsQuery.data.memory.mediaUrl;
    }
    return null;
  }, [detailsQuery.data]);

  const videoPlayer = useVideoPlayer(videoSource, (player) => {
    player.loop = true;
    player.play();
  });

  const audioSource = useMemo(() => {
    if (detailsQuery.data?.memory.mediaType === "voice") return detailsQuery.data.memory.mediaUrl;
    return detailsQuery.data?.memory.voiceNoteUrl ?? null;
  }, [detailsQuery.data]);

  const audioPlayer = useAudioPlayer(audioSource);

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

  const handleShare = async () => {
    if (!detailsQuery.data) return;
    const { memory } = detailsQuery.data;
    const message = `${memory.title}\n${new Date(memory.capturedAt).toDateString()}\n\n${memory.note}\n\nShared from EverNest.`;
    await Share.share({ message, url: memory.mediaUrl });
  };

  const playVoice = () => {
    if (!audioSource) return;
    if (audioPlayer.playing) {
      audioPlayer.pause();
      return;
    }
    audioPlayer.play();
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
  const mediaTypeBadge = memory.mediaType === "video" ? "Video" : memory.mediaType === "voice" ? "Voice" : "Photo";
  const mediaTypeIcon = memory.mediaType === "video" ? "video-outline" : memory.mediaType === "voice" ? "microphone-outline" : "image-outline";

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.backgroundSecondary }}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={{ height: 390, overflow: "hidden" }}>
          {memory.mediaType === "image" && memory.mediaUrl ? (
            <Image source={{ uri: memory.mediaUrl }} resizeMode="cover" style={{ width: "100%", height: "100%" }} />
          ) : null}

          {memory.mediaType === "video" && memory.mediaUrl ? (
            <VideoView
              player={videoPlayer}
              nativeControls
              allowsPictureInPicture
              contentFit="cover"
              style={{ width: "100%", height: "100%" }}
            />
          ) : null}

          {memory.mediaType === "voice" || !memory.mediaUrl ? (
            <LinearGradient colors={fallbackGradient} style={{ width: "100%", height: "100%", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 56 }}>🎙️</Text>
              <Text style={{ marginTop: 10, fontFamily: "DMSans_400Regular", fontSize: 13, color: "#FFFFFF" }}>
                {memory.mediaType === "voice" ? "Voice memory" : "Saved memory"}
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

          {memory.voiceNoteUrl || memory.mediaType === "voice" ? (
            <Pressable
              onPress={playVoice}
              style={{
                marginTop: 16,
                alignSelf: "flex-start",
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                paddingHorizontal: 16,
                paddingVertical: 11
              }}
            >
              <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 13, color: colors.text }}>
                {audioPlayer.playing ? "Pause voice note" : "Play voice note"}
              </Text>
            </Pressable>
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
              style={{
                marginTop: 14,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surfaceSecondary,
                paddingHorizontal: 14,
                paddingVertical: 11,
                fontFamily: "DMSans_400Regular",
                fontSize: 14,
                color: colors.text
              }}
            />
            <Pressable
              onPress={() => commentMutation.mutate()}
              disabled={commentMutation.isPending || comment.trim().length === 0}
              style={{
                marginTop: 12,
                backgroundColor: colors.brand,
                paddingVertical: 11,
                opacity: comment.trim().length === 0 ? 0.5 : 1
              }}
            >
              <Text style={{ textAlign: "center", fontFamily: "DMSans_500Medium", fontSize: 14, color: "#FFFFFF" }}>
                {commentMutation.isPending ? "Sending..." : "Post comment"}
              </Text>
            </Pressable>
          </View>

          <Pressable
            onPress={handleShare}
            style={{
              marginTop: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              paddingHorizontal: 16,
              paddingVertical: 11
            }}
          >
            <MaterialCommunityIcons name="share-variant-outline" size={16} color={colors.text} />
            <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 13, color: colors.text }}>
              Share this memory
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
