import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { MotiView } from "moti";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { secureGet, secureSet } from "@/lib/secure-store";
import { useAppTheme } from "@/hooks/use-app-theme";

const ONBOARDING_DONE_KEY = "auth.onboarding_done.v1";

const SLIDES = [
  {
    title: "Every moment, captured",
    body: "Photos, video, voice notes, and diaries arranged into a calm timeline instead of a chaotic camera roll.",
    icon: "camera-outline" as const,
    accent: "#C4623A"
  },
  {
    title: "Built for family, not solo archiving",
    body: "Parents and guardians contribute to one shared story, with clean permissions and a timeline that still feels personal.",
    icon: "people-outline" as const,
    accent: "#7A9E7E"
  },
  {
    title: "Send love through time",
    body: "Turn ordinary days into future deliveries for birthdays, graduations, or the exact moment they need them most.",
    icon: "mail-open-outline" as const,
    accent: "#D4A843"
  }
];

async function completeOnboarding() {
  await secureSet(ONBOARDING_DONE_KEY, "1");
}

export default function AuthOnboardingScreen() {
  const { colors } = useAppTheme();
  const [checked, setChecked] = useState(false);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"onboarding" | "choice">("onboarding");

  useEffect(() => {
    let active = true;

    const load = async () => {
      const seen = await secureGet(ONBOARDING_DONE_KEY);
      if (!active) return;
      if (seen === "1") {
        setPhase("choice");
      }
      setChecked(true);
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const slide = useMemo(() => SLIDES[index], [index]);
  const isLast = index === SLIDES.length - 1;

  if (!checked) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: colors.backgroundSecondary }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.brand} />
        </View>
      </SafeAreaView>
    );
  }

  if (phase === "choice") {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: colors.backgroundSecondary }}>
        <LinearGradient
          colors={[colors.brandBackground, "transparent"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ position: "absolute", top: 0, left: 0, right: 0, height: 340 }}
        />
        <View style={{ flex: 1, paddingHorizontal: 24, paddingBottom: 24 }}>
          <View style={{ flex: 0.62, alignItems: "center", justifyContent: "center" }}>
            <View style={{ position: "absolute", width: 250, height: 250, borderRadius: 125, backgroundColor: colors.brandBackground }} />
            <View style={{ position: "absolute", left: 24, top: 120, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 18 }}>
              <Ionicons name="camera-outline" size={22} color={colors.brand} />
            </View>
            <View style={{ position: "absolute", right: 28, top: 92, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 18 }}>
              <Ionicons name="people-outline" size={22} color={colors.sage} />
            </View>
            <View style={{ position: "absolute", bottom: 88, left: 48, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 18 }}>
              <Ionicons name="mail-open-outline" size={22} color={colors.gold} />
            </View>
            <View style={{ width: 96, height: 96, borderRadius: 48, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
              <Ionicons name="sparkles-outline" size={34} color={colors.brand} />
            </View>
          </View>

          <View style={{ flex: 0.38, justifyContent: "center" }}>
            <Text style={{ textAlign: "center", fontFamily: "InstrumentSerif_400Regular", fontSize: 46, color: colors.text }}>
              EverNest
            </Text>
            <Text style={{ marginTop: 10, textAlign: "center", fontFamily: "DMSans_400Regular", fontSize: 14, lineHeight: 22, color: colors.textMuted }}>
              A calm, beautiful archive for your child&apos;s everyday story.
            </Text>

            <View style={{ marginTop: 18, flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
              {["Daily capture", "Family timeline", "Time capsules", "Private by default"].map((label) => (
                <View key={label} style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 }}>
                  <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 11, color: colors.textMuted }}>{label}</Text>
                </View>
              ))}
            </View>

            <View style={{ marginTop: 22, gap: 10 }}>
              <Pressable onPress={() => router.push("/(auth)/sign-up")} style={{ backgroundColor: colors.brand, borderRadius: 16, paddingVertical: 15 }}>
                <Text style={{ textAlign: "center", fontFamily: "DMSans_500Medium", fontSize: 14, color: "#FFFFFF" }}>
                  Create a free account
                </Text>
              </Pressable>
              <Pressable onPress={() => router.push("/(auth)/sign-in")} style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 16, paddingVertical: 15 }}>
                <Text style={{ textAlign: "center", fontFamily: "DMSans_400Regular", fontSize: 14, color: colors.text }}>
                  I already have an account
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: colors.backgroundSecondary }}>
      <LinearGradient
        colors={[colors.brandBackground, "transparent"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 360 }}
      />

      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 10, color: colors.textMuted, letterSpacing: 1.6, textTransform: "uppercase" }}>
            Intro {index + 1} of {SLIDES.length}
          </Text>
          <Pressable
            onPress={async () => {
              await completeOnboarding();
              setPhase("choice");
            }}
            style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 }}
          >
            <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 11, color: colors.textMuted, textTransform: "uppercase" }}>
              Skip
            </Text>
          </Pressable>
        </View>

        <View style={{ flex: 0.6, alignItems: "center", justifyContent: "center" }}>
          <MotiView
            key={slide.title}
            from={{ opacity: 0, translateY: 18 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 360 }}
            style={{ width: "100%", alignItems: "center" }}
          >
            <View style={{ width: 260, height: 260, borderRadius: 130, backgroundColor: `${slide.accent}18`, position: "absolute" }} />
            <View style={{ width: 110, height: 110, borderRadius: 55, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
              <Ionicons name={slide.icon} size={42} color={slide.accent} />
            </View>
            <View style={{ marginTop: 22, flexDirection: "row", gap: 10 }}>
              <View style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 }}>
                <Ionicons name="image-outline" size={18} color={slide.accent} />
              </View>
              <View style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 }}>
                <Ionicons name="mic-outline" size={18} color={slide.accent} />
              </View>
              <View style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 }}>
                <Ionicons name="heart-outline" size={18} color={slide.accent} />
              </View>
            </View>
          </MotiView>
        </View>

        <View style={{ flex: 0.4, justifyContent: "flex-end" }}>
          <Text style={{ fontFamily: "InstrumentSerif_400Regular", fontSize: 38, lineHeight: 42, color: colors.text }}>
            {slide.title}
          </Text>
          <Text style={{ marginTop: 12, fontFamily: "DMSans_400Regular", fontSize: 14, lineHeight: 22, color: colors.textMuted }}>
            {slide.body}
          </Text>

          <View style={{ marginTop: 18, flexDirection: "row", gap: 8 }}>
            {SLIDES.map((_, dotIndex) => (
              <View
                key={dotIndex}
                style={{
                  width: dotIndex === index ? 22 : 8,
                  height: 8,
                  borderRadius: 999,
                  backgroundColor: dotIndex === index ? colors.brand : colors.border
                }}
              />
            ))}
          </View>

          <Pressable
            onPress={async () => {
              if (!isLast) {
                setIndex((value) => value + 1);
                return;
              }
              await completeOnboarding();
              setPhase("choice");
            }}
            style={{ marginTop: 20, backgroundColor: colors.brand, borderRadius: 16, paddingVertical: 15 }}
          >
            <Text style={{ textAlign: "center", fontFamily: "DMSans_500Medium", fontSize: 14, color: "#FFFFFF" }}>
              {isLast ? "Get started" : "Next"}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
