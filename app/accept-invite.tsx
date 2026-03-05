import { useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, Text } from "react-native";
import { MotiView } from "moti";
import { SafeAreaView } from "react-native-safe-area-context";
import { acceptFamilyInvite } from "@/lib/collaboration";

export default function AcceptInviteScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

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
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 items-center justify-center bg-night2 px-6">
      {state === "loading" ? <ActivityIndicator color="#C4623A" /> : null}

      {state === "success" ? (
        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ duration: 260 }}
          className="items-center"
        >
          <Text className="font-display text-4xl text-cream">Invite Accepted</Text>
          <Text className="mt-2 text-center font-body text-moonDim">You are now part of this EverNest family timeline.</Text>
          <Pressable onPress={() => router.replace("/(tabs)")} className="mt-6 rounded-2xl bg-terracotta px-5 py-3">
            <Text className="font-bodybold text-cream">Open Timeline</Text>
          </Pressable>
        </MotiView>
      ) : null}

      {state === "error" ? (
        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ duration: 260 }}
          className="items-center"
        >
          <Text className="font-display text-4xl text-cream">Invite Error</Text>
          <Text className="mt-2 text-center font-body text-moonDim">{errorMessage}</Text>
          <Pressable onPress={() => router.replace("/(tabs)")} className="mt-6 rounded-2xl border border-night4 px-5 py-3">
            <Text className="font-body text-moon">Go back</Text>
          </Pressable>
        </MotiView>
      ) : null}
    </SafeAreaView>
  );
}
