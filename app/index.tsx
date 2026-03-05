import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/hooks/use-auth";

export default function Index() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas-dark">
        <ActivityIndicator color="#E8B15D" />
      </View>
    );
  }

  return <Redirect href={user ? "/(tabs)" : "/(auth)/sign-in"} />;
}
