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
import { T, gradients } from "@/lib/theme";

const emojiOptions = ["❤️", "👏", "😂", "🥹", "🔥", "🎉"] as const;
const gradientSet = Object.values(gradients);

export default function MemoryDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const memoryId = typeof id === "string" ? id : "";
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");


  const detailsQuery = useQuery({
    queryKey: queryKeys.memoryDetails(memoryId),
    enabled: Boolean(memoryId),
    queryFn: async () => getMemoryDetails(memoryId)
  });

  const videoSource = useMemo(() => {
    if (detailsQuery.data?.memory.mediaType === "video") {
      return detailsQuery.data.memory.mediaUrl;
    }
    return null;
  }, [detailsQuery.data]);

  const videoPlayer = useVideoPlayer(videoSource, player => {
    player.loop = true;
  });

  const audioSource = useMemo(() => {
    if (detailsQuery.data) {
      if (detailsQuery.data.memory.mediaType === "voice") return detailsQuery.data.memory.mediaUrl;
      if (detailsQuery.data.memory.voiceNoteUrl) return detailsQuery.data.memory.voiceNoteUrl;
    }
    return null;
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

  const gradient = useMemo(() => {
    const code = memoryId
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return gradientSet[code % gradientSet.length];
  }, [memoryId]);

  const handleShare = async () => {
    if (!detailsQuery.data) return;
    const { memory } = detailsQuery.data;
    const message = `${memory.title}\n${new Date(memory.capturedAt).toDateString()}\n\n${memory.note}\n\nShared from EverNest.`;
    await Share.share({
      message,
      url: memory.mediaUrl
    });
  };

  const playVoice = () => {
    if (!audioSource) return;
    if (audioPlayer.playing) {
      audioPlayer.pause();
    } else {
      audioPlayer.play();
    }
  };

  if (detailsQuery.isLoading) {
    return (
      <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: T.night2 }}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={T.terracotta} />
        </View>
      </SafeAreaView>
    );
  }

  if (!detailsQuery.data) {
    return (
      <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: T.night2 }}>
        <View className="flex-1 items-center justify-center px-4">
          <Text className="font-body text-moon">
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
    <ScrollView contentInsetAdjustmentBehavior="automatic" className="flex-1 bg-night2" contentContainerStyle={{ paddingBottom: 120 }}>
      <View style={{ height: 380, overflow: "hidden" }}>
        {memory.mediaType === "image" && memory.mediaUrl ? (
          <Image source={{ uri: memory.mediaUrl }} className="h-full w-full" resizeMode="cover" />
        ) : null}

        {memory.mediaType === "video" && memory.mediaUrl ? (
          <VideoView player={videoPlayer} allowsPictureInPicture contentFit="cover" style={{ width: '100%', height: '100%' }} />
        ) : null}

        {memory.mediaType === "voice" || !memory.mediaUrl ? (
          <LinearGradient colors={gradient} className="h-full w-full items-center justify-center">
            <Text className="text-6xl">🎙️</Text>
            <Text className="mt-2 font-body text-moon">{memory.mediaType === "voice" ? "Voice memory" : "Saved memory"}</Text>
          </LinearGradient>
        ) : null}

        <LinearGradient
          colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.82)"]}
          style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingBottom: 16, paddingTop: 40 }}
        >
          <Pressable
            onPress={() => router.back()}
            style={{ marginBottom: 12, height: 36, width: 36, alignItems: "center", justifyContent: "center", borderRadius: 18, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", backgroundColor: "rgba(0,0,0,0.45)" }}
          >
            <MaterialCommunityIcons name="arrow-left" size={18} color={T.cream} />
          </Pressable>
          <Text className="font-display text-4xl text-cream">{memory.title}</Text>
          <Text className="mt-1 font-body text-xs text-moonDim">{new Date(memory.capturedAt).toLocaleString()}</Text>
        </LinearGradient>
      </View>

      {/* Metadata row */}
      <View style={{ paddingHorizontal: 20, paddingTop: 12, flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: `${T.terracotta}25`, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontFamily: "DMSans_500Medium", fontSize: 12, color: T.terracotta }}>
              {(memory.createdByName || "G").slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 12, color: T.moon }}>
            {memory.createdByName}
          </Text>
          <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 10, color: T.moonDim }}>·</Text>
          <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 11, color: T.moonDim }}>
            {new Date(memory.capturedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderColor: T.night4, backgroundColor: T.night3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 }}>
          <MaterialCommunityIcons name={mediaTypeIcon as keyof typeof MaterialCommunityIcons.glyphMap} size={12} color={T.moonDim} />
          <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 10, color: T.moonDim }}>{mediaTypeBadge}</Text>
        </View>
      </View>

      <View className="px-5 pt-4">
        <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ duration: 280 }}>
          <Text className="font-body text-base leading-7 text-moon">{memory.note}</Text>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ duration: 280, delay: 40 }}
          className="mt-4 flex-row flex-wrap gap-2"
        >
          {memory.tags.map((tag) => (
            <View key={`${memory.id}-${tag}`} className="rounded-full border border-terracotta/30 bg-terracotta/10 px-3 py-1">
              <Text className="font-body text-xs text-blush">#{tag}</Text>
            </View>
          ))}
        </MotiView>

        {memory.voiceNoteUrl || memory.mediaType === "voice" ? (
          <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 280, delay: 80 }}>
            <Pressable onPress={playVoice} className="mt-4 self-start rounded-xl border border-night4 bg-night3 px-4 py-2">
              <Text className="font-body text-moon">{audioPlayer.playing ? "Pause voice note" : "Play voice note"}</Text>
            </Pressable>
          </MotiView>
        ) : null}

        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ duration: 300, delay: 100 }}
          className="mt-6 rounded-2xl border border-night4 bg-night3 p-4"
        >
          <Text className="font-bodybold text-sm text-cream">React</Text>
          <View className="mt-3 flex-row flex-wrap gap-2">
            {emojiOptions.map((emoji) => (
              <Pressable key={emoji} onPress={() => reactionMutation.mutate(emoji)} className="rounded-full border border-night4 bg-night4/40 px-3 py-2">
                <Text className="text-base">{emoji}</Text>
              </Pressable>
            ))}
          </View>
          <Text className="mt-2 font-body text-xs text-moonDim">{reactions.length} reactions</Text>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ duration: 300, delay: 140 }}
          className="mt-4 rounded-2xl border border-night4 bg-night3 p-4"
        >
          <Text className="font-bodybold text-sm text-cream">Comments</Text>
          <View className="mt-3 gap-3">
            {comments.length > 0 ? (
              comments.map((item) => (
                <View key={item.id} className="rounded-xl border border-night4 bg-night4/40 p-3">
                  <Text className="font-bodybold text-xs text-moon">{item.userName}</Text>
                  <Text className="mt-1 font-body text-sm text-moon">{item.body}</Text>
                </View>
              ))
            ) : (
              <Text className="font-body text-xs text-moonDim">No comments yet.</Text>
            )}
          </View>

          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="Add a comment"
            placeholderTextColor="#8A8070"
            className="mt-4 rounded-xl border border-night4 px-3 py-2 font-body text-moon"
          />
          <Pressable
            onPress={() => commentMutation.mutate()}
            disabled={commentMutation.isPending || comment.trim().length === 0}
            className="mt-3 rounded-xl bg-terracotta px-3 py-3"
          >
            <Text className="text-center font-bodybold text-sm text-cream">{commentMutation.isPending ? "Sending..." : "Post comment"}</Text>
          </Pressable>
        </MotiView>

        <Pressable
          onPress={handleShare}
          style={{ marginTop: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: T.night4, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16 }}
        >
          <MaterialCommunityIcons name="share-variant-outline" size={16} color={T.moon} />
          <Text className="text-center font-body text-moon">Share this memory</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
