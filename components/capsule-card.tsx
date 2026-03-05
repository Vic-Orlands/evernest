import { Text, View } from "react-native";
import { Capsule } from "@/lib/types";

export function CapsuleCard({ capsule }: { capsule: Capsule }) {
  const statusLabel = capsule.status === "scheduled" ? "Scheduled" : capsule.status === "sent" ? "Sent" : "Cancelled";

  return (
    <View className="mb-3 rounded-2xl border border-gold/30 bg-night3/80 p-4">
      <Text className="font-display text-xl text-cream">{capsule.title}</Text>
      <Text className="mt-1 font-body text-sm text-moon">Send to {capsule.recipientEmail}</Text>
      <Text className="mt-1 font-body text-sm text-moonDim">Release: {new Date(capsule.releaseAt).toDateString()}</Text>
      <Text className="mt-2 font-body text-xs uppercase tracking-wide text-gold">{statusLabel}</Text>
    </View>
  );
}
