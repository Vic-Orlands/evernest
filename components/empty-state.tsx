import { Text, View } from "react-native";

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <View className="rounded-3xl border border-dashed border-night4 bg-night3/60 p-6">
      <Text className="text-center font-display text-2xl text-cream">{title}</Text>
      <Text className="mt-2 text-center font-body text-sm text-moonDim">{body}</Text>
    </View>
  );
}
