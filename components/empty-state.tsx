import { Text, View } from "react-native";

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <View className="rounded-3xl border border-dashed border-zinc-700 p-6">
      <Text className="text-center font-display text-2xl text-zinc-100">{title}</Text>
      <Text className="mt-2 text-center font-body text-sm text-zinc-300">{body}</Text>
    </View>
  );
}
