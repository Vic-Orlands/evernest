import { useState } from "react";
import { Link, router } from "expo-router";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { SocialAuthButton } from "@/components/auth/social-auth-button";
import { signInWithSocial, signUp } from "@/lib/auth";

export default function SignUpScreen() {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<"google" | "apple" | null>(null);

  const onSubmit = async () => {
    try {
      if (password.length < 10) {
        Alert.alert("Weak password", "Use at least 10 characters for stronger account security.");
        return;
      }
      setLoading(true);
      await signUp(name.trim(), email.trim(), password);
      Alert.alert("Confirm email", "Check your email and tap the confirmation link to complete signup.");
      router.replace("/(auth)/sign-in");
    } catch (error) {
      Alert.alert("Sign-up failed", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const onSocial = async (provider: "google" | "apple") => {
    try {
      setSocialLoading(provider);
      await signInWithSocial(provider);
    } catch (error) {
      Alert.alert("Social sign-up failed", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setSocialLoading(null);
    }
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets
      className="flex-1 bg-night2"
      contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 10) + 16, paddingHorizontal: 24, paddingTop: 16, gap: 20 }}
    >
      <View className="gap-2">
        <Text className="font-display text-[34px] leading-[36px] text-cream">Create account</Text>
        <Text className="font-body text-[13px] leading-5 text-moonDim">
          Start building a shared archive of everyday memories.
        </Text>
      </View>

      <View className="border border-night4 bg-night3/88 p-4">
        <Text className="mb-1 font-body text-[11px] uppercase tracking-[1.2px] text-moonDim">Full name</Text>
        <TextInput
          placeholder="Sarah Johnson"
          placeholderTextColor="#8A8070"
          value={name}
          onChangeText={setName}
          className="border border-night4 bg-night4/35 px-4 py-3 font-body text-[14px] text-moon"
        />

        <Text className="mb-1 mt-3 font-body text-[11px] uppercase tracking-[1.2px] text-moonDim">Email</Text>
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@email.com"
          placeholderTextColor="#8A8070"
          value={email}
          onChangeText={setEmail}
          className="border border-night4 bg-night4/35 px-4 py-3 font-body text-[14px] text-moon"
        />

        <Text className="mb-1 mt-3 font-body text-[11px] uppercase tracking-[1.2px] text-moonDim">Password</Text>
        <View>
          <TextInput
            secureTextEntry={!showPassword}
            placeholder="At least 10 characters"
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

        {password.length > 0 ? (
          <Text className="mt-2 font-body text-[11px] text-moonDim">
            Strength: {password.length < 6 ? "Weak" : password.length < 10 ? "Good" : "Strong"}
          </Text>
        ) : null}

        <Pressable onPress={onSubmit} disabled={loading} className="mt-4 bg-terracotta px-4 py-3">
          <Text className="text-center font-bodybold text-[14px] text-cream">{loading ? "Creating..." : "Create account"}</Text>
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
          <Text className="mt-2 text-center font-body text-[11px] text-moonDim">Opening {socialLoading} sign-up…</Text>
        ) : null}
      </View>

      <Link href="/(auth)/sign-in" asChild>
        <Pressable className="py-1">
          <Text className="text-center font-body text-[13px] text-moonDim">
            Already have an account? <Text className="text-terracotta">Sign in</Text>
          </Text>
        </Pressable>
      </Link>
    </ScrollView>
  );
}
