import { useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
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
    <View className="flex-1 items-center justify-center bg-canvas-dark px-6">
      {state === "loading" ? <ActivityIndicator color="#E8B15D" /> : null}

      {state === "success" ? (
        <>
          <Text className="font-display text-3xl text-ink-dark">Invite Accepted</Text>
          <Text className="mt-2 text-center font-body text-zinc-300">You are now part of this EverNest family timeline.</Text>
          <Pressable onPress={() => router.replace("/(tabs)")} className="mt-6 rounded-2xl bg-amber px-5 py-3">
            <Text className="font-bodybold text-zinc-900">Open Timeline</Text>
          </Pressable>
        </>
      ) : null}

      {state === "error" ? (
        <>
          <Text className="font-display text-3xl text-ink-dark">Invite Error</Text>
          <Text className="mt-2 text-center font-body text-zinc-300">{errorMessage}</Text>
          <Pressable onPress={() => router.replace("/(tabs)")} className="mt-6 rounded-2xl border border-zinc-700 px-5 py-3">
            <Text className="font-body text-zinc-200">Go back</Text>
          </Pressable>
        </>
      ) : null}
    </View>
  );
}
