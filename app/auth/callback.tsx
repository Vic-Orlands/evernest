import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import * as Linking from "expo-linking";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { useAppTheme } from "@/hooks/use-app-theme";

type AuthState = "processing" | "success" | "error";

function takeParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string" && value.length > 0) return value;
  return null;
}

function parseParamsFromUrl(url: string | null): Record<string, string> {
  if (!url) return {};

  const out: Record<string, string> = {};
  const fill = (raw: string) => {
    const params = new URLSearchParams(raw);
    params.forEach((value, key) => {
      if (!out[key]) out[key] = value;
    });
  };

  const queryIndex = url.indexOf("?");
  if (queryIndex >= 0) {
    fill(url.slice(queryIndex + 1).split("#")[0]);
  }

  const hashIndex = url.indexOf("#");
  if (hashIndex >= 0) {
    fill(url.slice(hashIndex + 1));
  }

  return out;
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default function AuthCallbackScreen() {
  const { colors } = useAppTheme();
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const incomingUrl = Linking.useURL();
  const [state, setState] = useState<AuthState>("processing");
  const [message, setMessage] = useState("Finalizing your sign-in...");

  useEffect(() => {
    const run = async () => {
      try {
        const parsedFromUrl = parseParamsFromUrl(incomingUrl);
        const accessToken = takeParam(params.access_token) ?? parsedFromUrl.access_token ?? null;
        const refreshToken = takeParam(params.refresh_token) ?? parsedFromUrl.refresh_token ?? null;
        const code = takeParam(params.code) ?? parsedFromUrl.code ?? null;
        const tokenHash = takeParam(params.token_hash) ?? parsedFromUrl.token_hash ?? null;
        const token = takeParam(params.token) ?? parsedFromUrl.token ?? null;
        const type = takeParam(params.type) ?? parsedFromUrl.type ?? null;
        const errorDescription =
          takeParam(params.error_description) ??
          takeParam(params.error) ??
          parsedFromUrl.error_description ??
          parsedFromUrl.error ??
          null;

        if (errorDescription) {
          setState("error");
          setMessage(safeDecode(errorDescription));
          return;
        }

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          if (error) throw error;
          setState("success");
          setMessage("Signed in. Redirecting...");
          router.replace("/");
          return;
        }

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          setState("success");
          setMessage("Signed in. Redirecting...");
          router.replace("/");
          return;
        }

        if (tokenHash && type) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as "email" | "recovery" | "invite" | "email_change" | "magiclink" | "signup"
          });
          if (error) throw error;
          setState("success");
          setMessage("Email confirmed. Please sign in.");
          router.replace("/(auth)/sign-in");
          return;
        }

        if (token && type === "signup") {
          setState("success");
          setMessage("Email confirmed. Please sign in.");
          router.replace("/(auth)/sign-in");
          return;
        }

        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
          setState("success");
          router.replace("/");
          return;
        }

        setState("error");
        setMessage("Could not complete authentication from this link.");
      } catch (error) {
        setState("error");
        setMessage(error instanceof Error ? error.message : "Authentication failed.");
      }
    };

    void run();
  }, [params, incomingUrl]);

  return (
    <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: colors.backgroundSecondary }}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
        {state === "processing" ? <ActivityIndicator color={colors.brand} /> : null}
        <Text style={{ marginTop: 16, textAlign: "center", fontFamily: "InstrumentSerif_400Regular", fontSize: 40, color: colors.text }}>
          EverNest
        </Text>
        <Text style={{ marginTop: 10, textAlign: "center", fontFamily: "DMSans_400Regular", fontSize: 14, lineHeight: 22, color: colors.textMuted }}>
          {message}
        </Text>
        {state === "error" ? (
          <Pressable
            onPress={() => router.replace("/(auth)/sign-in")}
            style={{
              marginTop: 20,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              paddingHorizontal: 16,
              paddingVertical: 12
            }}
          >
            <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 13, color: colors.text }}>
              Return to sign in
            </Text>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
