import { useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { MotiView } from "moti";
import { SafeAreaView } from "react-native-safe-area-context";
import { acceptFamilyInvite } from "@/lib/collaboration";
import { useAppTheme } from "@/hooks/use-app-theme";

export default function AcceptInviteScreen() {
  const { colors } = useAppTheme();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const safeToken = useMemo(() => (typeof token === "string" ? token : ""), [token]);

  useEffect(() => {
    const run = async () => {
      if (!safeToken) {
        setState("error");
        setErrorMessage("Missing invite token.");
        return;
      }

      try {
        await acceptFamilyInvite(safeToken);
        setState("success");
      } catch (error) {
        setState("error");
        setErrorMessage(error instanceof Error ? error.message : "Could not accept invite.");
      }
    };

    void run();
  }, [safeToken]);

  return (
    <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: colors.backgroundSecondary }}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
        {state === "loading" ? <ActivityIndicator color={colors.brand} /> : null}

        {state === "success" ? (
          <MotiView from={{ opacity: 0, translateY: 12 }} animate={{ opacity: 1, translateY: 0 }} transition={{ duration: 260 }} style={{ alignItems: "center" }}>
            <Text style={{ fontFamily: "InstrumentSerif_400Regular", fontSize: 40, color: colors.text }}>
              Invite Accepted
            </Text>
            <Text style={{ marginTop: 10, textAlign: "center", fontFamily: "DMSans_400Regular", fontSize: 14, lineHeight: 22, color: colors.textMuted }}>
              You are now part of this EverNest family timeline.
            </Text>
            <Pressable
              onPress={() => router.replace("/")}
              style={{ marginTop: 20, borderRadius: 16, backgroundColor: colors.brand, paddingHorizontal: 18, paddingVertical: 14 }}
            >
              <Text style={{ fontFamily: "DMSans_500Medium", color: "#FFFFFF" }}>Open Timeline</Text>
            </Pressable>
          </MotiView>
        ) : null}

        {state === "error" ? (
          <MotiView from={{ opacity: 0, translateY: 12 }} animate={{ opacity: 1, translateY: 0 }} transition={{ duration: 260 }} style={{ alignItems: "center" }}>
            <Text style={{ fontFamily: "InstrumentSerif_400Regular", fontSize: 40, color: colors.text }}>
              Invite Error
            </Text>
            <Text style={{ marginTop: 10, textAlign: "center", fontFamily: "DMSans_400Regular", fontSize: 14, lineHeight: 22, color: colors.textMuted }}>
              {errorMessage}
            </Text>
            <Pressable
              onPress={() => router.replace("/")}
              style={{ marginTop: 20, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 18, paddingVertical: 14 }}
            >
              <Text style={{ fontFamily: "DMSans_400Regular", color: colors.text }}>Go back</Text>
            </Pressable>
          </MotiView>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
