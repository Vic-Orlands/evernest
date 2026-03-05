import { useEffect } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { router } from "expo-router";

export default function AuthCallbackScreen() {
  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/(auth)/sign-in");
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View className="flex-1 items-center justify-center bg-canvas-dark px-6">
      <ActivityIndicator color="#E8B15D" />
      <Text className="mt-4 text-center font-display text-3xl text-ink-dark">Email Confirmed</Text>
      <Text className="mt-2 text-center font-body text-zinc-300">Your account is verified. Redirecting to sign in...</Text>
      <Pressable onPress={() => router.replace("/(auth)/sign-in")} className="mt-6 rounded-xl border border-zinc-700 px-4 py-3">
        <Text className="font-body text-zinc-200">Continue now</Text>
      </Pressable>
    </View>
  );
}
