import { Redirect } from "expo-router";
import { ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/hooks/use-auth";

export default function Index() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <SafeAreaView edges={["top", "bottom"]} className="flex-1 items-center justify-center bg-night2">
        <ActivityIndicator color="#C4623A" />
      </SafeAreaView>
    );
  }

  return <Redirect href={user ? "/(tabs)" : "/(auth)"} />;
}
