import { useState } from "react";
import { Link, router } from "expo-router";
import {
  Alert,
  Pressable,
  Text,
  TextInput,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { SocialAuthButton } from "@/components/auth/social-auth-button";
import { signIn, signInWithSocial } from "@/lib/auth";

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<"google" | "apple" | null>(null);

  const onSubmit = async () => {
    try {
      setLoading(true);
      await signIn(email.trim(), password);
      router.replace("/(tabs)");
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
    <View style={{ backgroundColor: "#1A1612" }}>
      <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: Math.max(insets.bottom, 10) + 16, gap: 20 }}>
        <View className="gap-2">
          <Text className="font-display text-[34px] leading-[36px] text-cream">Welcome back</Text>
          <Text className="font-body text-[13px] leading-5 text-moonDim">
            Sign in and continue building your family archive.
          </Text>
        </View>

        <View className="border border-night4 bg-night3/88 p-4">
          <Text className="mb-1 font-body text-[11px] uppercase tracking-[1.2px] text-moonDim">Email</Text>
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@email.com"
            placeholderTextColor="#8A8070"
            value={email}
            onChangeText={setEmail}
            className="border border-night4 bg-night4/35 px-4 py-3 font-body text-[14px] text-moon"
          />

          <View className="mt-3 flex-row items-center justify-between">
            <Text className="font-body text-[11px] uppercase tracking-[1.2px] text-moonDim">Password</Text>
            <Pressable>
              <Text className="font-body text-[11px] text-terracotta">Forgot?</Text>
            </Pressable>
          </View>
          <View className="mt-1">
            <TextInput
              secureTextEntry={!showPassword}
              placeholder="••••••••"
              placeholderTextColor="#8A8070"
              value={password}
              onChangeText={setPassword}
              className="border border-night4 bg-night4/35 px-4 py-3 pr-12 font-body text-[14px] text-moon"
            />
            <Pressable
              onPress={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-0 bottom-0 justify-center"
              hitSlop={8}
            >
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#8A8070" />
            </Pressable>
          </View>

          <Pressable onPress={onSubmit} disabled={loading} className="mt-4 bg-terracotta px-4 py-3">
            <Text className="text-center font-bodybold text-[14px] text-cream">{loading ? "Signing in..." : "Sign in"}</Text>
          </Pressable>

          <View className="my-3 flex-row items-center gap-2">
            <View className="h-px flex-1 bg-night4" />
            <Text className="font-body text-[10px] uppercase tracking-[1.2px] text-moonDim">or continue with</Text>
            <View className="h-px flex-1 bg-night4" />
          </View>

          <View className="flex-row gap-2">
            <SocialAuthButton
              provider="apple"
              onPress={() => {
                void onSocial("apple");
              }}
              compact
            />
            <SocialAuthButton
              provider="google"
              onPress={() => {
                void onSocial("google");
              }}
              compact
            />
          </View>

          {socialLoading ? (
            <Text className="mt-2 text-center font-body text-[11px] text-moonDim">Opening {socialLoading} sign-in…</Text>
          ) : null}
        </View>

        <Link href="/(auth)/sign-up" asChild>
          <Pressable className="py-1">
            <Text className="text-center font-body text-[13px] text-moonDim">
              Don't have an account? <Text className="text-terracotta">Create one</Text>
            </Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}
