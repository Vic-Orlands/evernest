import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { useAppTheme } from "@/hooks/use-app-theme";

export default function Index() {
  const { user, loading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { colors } = useAppTheme();

  if (loading || (user && profileLoading)) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.brand} />
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)" />;
  }

  return (
    <Redirect
      href={profile?.personalizationCompletedAt ? "/(tabs)" : "/personalize"}
    />
  );
}
