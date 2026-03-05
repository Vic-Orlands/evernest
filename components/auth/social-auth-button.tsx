import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Provider = "apple" | "google";

type Props = {
  provider: Provider;
  onPress: () => void;
  compact?: boolean;
};

export function SocialAuthButton({ provider, onPress, compact = false }: Props) {
  const isApple = provider === "apple";
  const label = compact
    ? isApple
      ? "Apple"
      : "Google"
    : isApple
      ? "Continue with Apple"
      : "Continue with Google";

  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 flex-row items-center justify-center border ${compact ? "py-2.5" : "py-3"} ${
        isApple ? "border-black bg-black" : "border-[#DADCE0] bg-white"
      }`}
      style={{
        boxShadow: isApple ? "0 1px 3px rgba(0,0,0,0.16)" : "0 1px 2px rgba(15,13,11,0.08)"
      }}
    >
      {isApple ? (
        <>
          <Ionicons name="logo-apple" size={18} color="#FFFFFF" />
          <Text className="ml-2 font-bodybold text-[13px] text-white">{label}</Text>
        </>
      ) : (
        <>
          <View className="h-[18px] w-[18px] items-center justify-center rounded-sm bg-white">
            <Text className="text-[13px] font-bold text-[#4285F4]">G</Text>
          </View>
          <Text className="ml-2 font-bodybold text-[13px] text-[#1F1F1F]">{label}</Text>
        </>
      )}
    </Pressable>
  );
}
