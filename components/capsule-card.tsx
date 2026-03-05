import { Text, View } from "react-native";
import { Capsule } from "@/lib/types";

export function CapsuleCard({ capsule }: { capsule: Capsule }) {
  const statusLabel = capsule.status === "scheduled" ? "Scheduled" : capsule.status === "sent" ? "Sent" : "Cancelled";

  return (
    <View className="mb-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
      <Text className="font-display text-xl text-zinc-100">{capsule.title}</Text>
      <Text className="mt-1 font-body text-sm text-zinc-300">Send to {capsule.recipientEmail}</Text>
      <Text className="mt-1 font-body text-sm text-zinc-500">Release: {new Date(capsule.releaseAt).toDateString()}</Text>
      <Text className="mt-2 font-body text-xs uppercase tracking-wide text-amber">{statusLabel}</Text>
    </View>
  );
}
