import { useState } from "react";
import { Link, router } from "expo-router";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { signUp } from "@/lib/auth";

export default function SignUpScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    try {
      if (password.length < 10) {
        Alert.alert("Weak password", "Use at least 10 characters for stronger account security.");
        return;
      }
      setLoading(true);
      await signUp(name.trim(), email.trim(), password);
      router.replace("/(tabs)");
    } catch (error) {
      Alert.alert("Sign-up failed", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 justify-center bg-canvas-dark px-6">
      <Text className="font-display text-5xl text-ink-dark">Join EverNest</Text>
      <Text className="mt-2 font-body text-base text-zinc-400">Start your family memory timeline.</Text>

      <View className="mt-8 gap-3 rounded-3xl border border-zinc-800 bg-zinc-900/60 p-4">
        <TextInput
          placeholder="Name"
          placeholderTextColor="#8992A3"
          value={name}
          onChangeText={setName}
          className="rounded-2xl border border-zinc-700 px-4 py-3 font-body text-zinc-100"
        />
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="Email"
          placeholderTextColor="#8992A3"
          value={email}
          onChangeText={setEmail}
          className="rounded-2xl border border-zinc-700 px-4 py-3 font-body text-zinc-100"
        />
        <TextInput
          secureTextEntry
          placeholder="Password"
          placeholderTextColor="#8992A3"
          value={password}
          onChangeText={setPassword}
          className="rounded-2xl border border-zinc-700 px-4 py-3 font-body text-zinc-100"
        />
        <Pressable onPress={onSubmit} disabled={loading} className="mt-2 rounded-2xl bg-amber px-4 py-3">
          <Text className="text-center font-bodybold text-base text-zinc-900">{loading ? "Creating..." : "Create account"}</Text>
        </Pressable>
      </View>

      <Link href="/(auth)/sign-in" asChild>
        <Pressable className="mt-6">
          <Text className="text-center font-body text-zinc-300">Already have an account? Sign in</Text>
        </Pressable>
      </Link>
    </View>
  );
}
