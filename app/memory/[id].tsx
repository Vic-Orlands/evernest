import { useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Share, Text, TextInput, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addComment, getMemoryDetails, setReaction } from "@/lib/repositories";
import { queryKeys } from "@/lib/query-keys";
import { getExpoAV } from "@/lib/expo-av-optional";

const emojiOptions = ["❤️", "👏", "😂", "🥹", "🔥", "🎉"] as const;

export default function MemoryDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const memoryId = typeof id === "string" ? id : "";
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");
  const [playingVoice, setPlayingVoice] = useState(false);
  const expoAV = getExpoAV();
  const VideoComponent = expoAV?.Video;
  const videoResizeMode = expoAV?.ResizeMode;

  const detailsQuery = useQuery({
    queryKey: queryKeys.memoryDetails(memoryId),
    enabled: Boolean(memoryId),
    queryFn: async () => getMemoryDetails(memoryId)
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

  const handleShare = async () => {
    if (!detailsQuery.data) return;
    const { memory } = detailsQuery.data;
    const message = `${memory.title}\n${new Date(memory.capturedAt).toDateString()}\n\n${memory.note}\n\nShared from EverNest.`;
    await Share.share({
      message,
      url: memory.mediaUrl
    });
  };

  const playVoice = async () => {
    const voiceSource =
      detailsQuery.data?.memory.mediaType === "voice"
        ? detailsQuery.data.memory.mediaUrl
        : detailsQuery.data?.memory.voiceNoteUrl;

    if (!voiceSource) return;
    if (!expoAV) {
      Alert.alert("Unavailable in Expo Go", "Voice playback requires a development build with native modules.");
      return;
    }

    try {
      setPlayingVoice(true);
      const { sound } = await expoAV.Audio.Sound.createAsync({ uri: voiceSource }, { shouldPlay: true });
      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded || !status.didJustFinish) return;
        setPlayingVoice(false);
        void sound.unloadAsync();
      });
    } catch {
      setPlayingVoice(false);
      Alert.alert("Voice note", "Could not play voice note.");
    }
  };

  if (detailsQuery.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas-dark">
        <ActivityIndicator color="#E8B15D" />
      </View>
    );
  }

  if (!detailsQuery.data) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas-dark px-4">
        <Text className="font-body text-zinc-100">Memory not found.</Text>
      </View>
    );
  }

  const { memory, comments, reactions } = detailsQuery.data;

  return (
    <ScrollView className="flex-1 bg-canvas-dark px-4 pt-14" contentContainerStyle={{ paddingBottom: 120 }}>
      <Text className="font-display text-4xl text-ink-dark">{memory.title}</Text>
      <Text className="mt-2 font-body text-zinc-400">{new Date(memory.capturedAt).toLocaleString()}</Text>

      {memory.mediaType === "image" ? (
        <Image source={{ uri: memory.mediaUrl }} className="mt-5 h-56 w-full rounded-2xl" resizeMode="cover" />
      ) : null}

      {memory.mediaType === "video" ? (
        VideoComponent && videoResizeMode ? (
          <VideoComponent
            source={{ uri: memory.mediaUrl }}
            className="mt-5 h-56 w-full rounded-2xl"
            useNativeControls
            resizeMode={videoResizeMode.COVER}
          />
        ) : (
          <View className="mt-5 h-56 w-full items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900">
            <Text className="font-body text-zinc-300">Video playback requires a development build.</Text>
          </View>
        )
      ) : null}

      <Text className="mt-6 font-body text-base leading-7 text-zinc-200">{memory.note}</Text>

      <View className="mt-5 flex-row flex-wrap gap-2">
        {memory.tags.map((tag) => (
          <View key={`${memory.id}-${tag}`} className="rounded-full bg-zinc-800 px-2 py-1">
            <Text className="font-body text-xs text-zinc-300">#{tag}</Text>
          </View>
        ))}
      </View>

      {memory.voiceNoteUrl || memory.mediaType === "voice" ? (
        <Pressable onPress={playVoice} className="mt-4 self-start rounded-xl border border-zinc-700 px-4 py-2">
          <Text className="font-body text-zinc-200">{playingVoice ? "Playing voice..." : "Play voice note"}</Text>
        </Pressable>
      ) : null}

      <View className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
        <Text className="font-bodybold text-zinc-100">React</Text>
        <View className="mt-3 flex-row flex-wrap gap-2">
          {emojiOptions.map((emoji) => (
            <Pressable key={emoji} onPress={() => reactionMutation.mutate(emoji)} className="rounded-full bg-zinc-800 px-3 py-2">
              <Text className="text-base">{emoji}</Text>
            </Pressable>
          ))}
        </View>
        <Text className="mt-2 font-body text-xs text-zinc-400">{reactions.length} reactions</Text>
      </View>

      <View className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
        <Text className="font-bodybold text-zinc-100">Comments</Text>
        <View className="mt-3 gap-3">
          {comments.map((item) => (
            <View key={item.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
              <Text className="font-bodybold text-xs text-zinc-300">{item.userName}</Text>
              <Text className="mt-1 font-body text-zinc-200">{item.body}</Text>
            </View>
          ))}
        </View>

        <TextInput
          value={comment}
          onChangeText={setComment}
          placeholder="Add a comment"
          placeholderTextColor="#7B8598"
          className="mt-4 rounded-xl border border-zinc-700 px-3 py-2 font-body text-zinc-100"
        />
        <Pressable
          onPress={() => commentMutation.mutate()}
          disabled={commentMutation.isPending}
          className="mt-3 rounded-xl bg-amber px-3 py-2"
        >
          <Text className="text-center font-bodybold text-zinc-900">{commentMutation.isPending ? "Sending..." : "Post comment"}</Text>
        </Pressable>
      </View>

      <Pressable onPress={handleShare} className="mt-4 rounded-2xl border border-zinc-700 px-4 py-3">
        <Text className="text-center font-body text-zinc-200">Export via share</Text>
      </Pressable>
    </ScrollView>
  );
}
