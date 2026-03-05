import { Pressable, Text, View } from "react-native";
import { MotiView } from "moti";
import { MemoryItem } from "@/lib/types";

const mediaLabels: Record<MemoryItem["mediaType"], string> = {
  image: "Photo",
  video: "Video",
  voice: "Voice"
};

type Props = {
  item: MemoryItem;
  onPress?: () => void;
};

export function MemoryCard({ item, onPress }: Props) {
  return (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 350 }}
    >
      <Pressable onPress={onPress} className="mb-4 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-4">
        <View className="flex-row items-center justify-between">
          <Text className="font-display text-xl text-zinc-100">{item.title}</Text>
          <View className="rounded-full border border-zinc-700 px-3 py-1">
            <Text className="font-body text-xs uppercase tracking-wide text-zinc-300">{mediaLabels[item.mediaType]}</Text>
          </View>
        </View>

        <Text className="mt-1 font-body text-sm text-zinc-500">{new Date(item.capturedAt).toDateString()}</Text>
        <Text className="mt-3 font-body text-base leading-6 text-zinc-200">{item.note}</Text>

        <View className="mt-3 flex-row flex-wrap gap-2">
          {item.tags.slice(0, 3).map((tag) => (
            <View key={`${item.id}-${tag}`} className="rounded-full bg-zinc-800 px-2 py-1">
              <Text className="font-body text-xs text-zinc-300">#{tag}</Text>
            </View>
          ))}
        </View>

        <View className="mt-4 flex-row items-center justify-between">
          <Text className="font-body text-xs text-zinc-400">By {item.createdByName}</Text>
          <Text className="font-body text-xs text-zinc-400">{item.reactionsCount} reacts · {item.commentsCount} comments</Text>
        </View>
      </Pressable>
    </MotiView>
  );
}
