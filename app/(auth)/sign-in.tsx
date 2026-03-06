import { useState } from "react";
import { Link, router } from "expo-router";
import { Alert, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { SocialAuthButton } from "@/components/auth/social-auth-button";
import { signIn, signInWithSocial } from "@/lib/auth";
import { useAppTheme } from "@/hooks/use-app-theme";

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<"google" | "apple" | null>(null);

  const onSubmit = async () => {
    try {
      setLoading(true);
      await signIn(email.trim(), password);
      router.replace("/");
    } catch (error) {
      Alert.alert("Sign-in failed", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const onSocial = async (provider: "google" | "apple") => {
    try {
      setSocialLoading(provider);
      await signInWithSocial(provider);
    } catch (error) {
      Alert.alert("Social sign-in failed", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setSocialLoading(null);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ backgroundColor: colors.surface }}>
      <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: Math.max(insets.bottom, 10) + 18, gap: 20 }}>
        <View style={{ gap: 8 }}>
          <Text style={{ fontFamily: "InstrumentSerif_400Regular", fontSize: 34, lineHeight: 36, color: colors.text }}>
            Welcome back
          </Text>
          <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 13, lineHeight: 20, color: colors.textMuted }}>
            Sign in and continue building your family archive.
          </Text>
        </View>

        <View style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary, padding: 16, borderRadius: 22 }}>
          <Text style={{ marginBottom: 6, fontFamily: "DMSans_400Regular", fontSize: 11, textTransform: "uppercase", letterSpacing: 1.2, color: colors.textMuted }}>
            Email
          </Text>
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@email.com"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 14,
              backgroundColor: colors.surface,
              paddingHorizontal: 16,
              paddingVertical: 12,
              fontFamily: "DMSans_400Regular",
              fontSize: 14,
              color: colors.text
            }}
          />

          <View style={{ marginTop: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 11, textTransform: "uppercase", letterSpacing: 1.2, color: colors.textMuted }}>
              Password
            </Text>
            <Pressable>
              <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 11, color: colors.brand }}>Forgot?</Text>
            </Pressable>
          </View>
          <View style={{ marginTop: 6 }}>
            <TextInput
              secureTextEntry={!showPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 14,
                backgroundColor: colors.surface,
                paddingHorizontal: 16,
                paddingVertical: 12,
                paddingRight: 46,
                fontFamily: "DMSans_400Regular",
                fontSize: 14,
                color: colors.text
              }}
            />
            <Pressable onPress={() => setShowPassword((value) => !value)} style={{ position: "absolute", right: 12, top: 0, bottom: 0, justifyContent: "center" }}>
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textMuted} />
            </Pressable>
          </View>

          <Pressable onPress={onSubmit} disabled={loading} style={{ marginTop: 16, backgroundColor: colors.brand, paddingVertical: 14, borderRadius: 14 }}>
            <Text style={{ textAlign: "center", fontFamily: "DMSans_500Medium", fontSize: 14, color: "#FFFFFF" }}>
              {loading ? "Signing in..." : "Sign in"}
            </Text>
          </Pressable>

          <View style={{ marginVertical: 14, flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
            <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 10, textTransform: "uppercase", letterSpacing: 1.2, color: colors.textMuted }}>
              or continue with
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
          </View>

          <View style={{ flexDirection: "row", gap: 8 }}>
            <SocialAuthButton provider="apple" onPress={() => void onSocial("apple")} compact />
            <SocialAuthButton provider="google" onPress={() => void onSocial("google")} compact />
          </View>

          {socialLoading ? (
            <Text style={{ marginTop: 10, textAlign: "center", fontFamily: "DMSans_400Regular", fontSize: 11, color: colors.textMuted }}>
              Opening {socialLoading} sign-in...
            </Text>
          ) : null}
        </View>

        <Link href="/(auth)/sign-up" asChild>
          <Pressable style={{ paddingVertical: 4 }}>
            <Text style={{ textAlign: "center", fontFamily: "DMSans_400Regular", fontSize: 13, color: colors.textMuted }}>
              Don&apos;t have an account?{" "}
              <Text style={{ color: colors.brand }}>Create one</Text>
            </Text>
          </Pressable>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}
