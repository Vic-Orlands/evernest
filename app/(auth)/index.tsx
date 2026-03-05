import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { MotiView } from "moti";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { secureGet, secureSet } from "@/lib/secure-store";
import { T } from "@/lib/theme";

const ONBOARDING_DONE_KEY = "auth.onboarding_done.v1";

type Slide = {
  key: string;
  title: string;
  body: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  accentSoft: string;
};

const SLIDES: Slide[] = [
  {
    key: "capture",
    icon: "camera-outline",
    title: "Every moment,\ncaptured",
    body: "Photos, video, voice notes, and diaries arranged into a calm timeline instead of a chaotic camera roll.",
    accent: T.terracotta,
    accentSoft: "rgba(196,98,58,0.18)"
  },
  {
    key: "together",
    icon: "people-outline",
    title: "Built for family,\nnot solo archiving",
    body: "Parents and guardians contribute to one shared story, with clean permissions and a timeline that still feels personal.",
    accent: T.sage,
    accentSoft: "rgba(122,158,126,0.18)"
  },
  {
    key: "capsule",
    icon: "mail-open-outline",
    title: "Send love\nthrough time",
    body: "Turn ordinary days into future deliveries for birthdays, graduations, or the exact moment they need them most.",
    accent: T.gold,
    accentSoft: "rgba(212,168,67,0.18)"
  },
  {
    key: "private",
    icon: "lock-closed-outline",
    title: "Private, secure,\nand actually yours",
    body: "A family archive with secure defaults, controlled sharing, and no need to trade privacy for sentiment.",
    accent: "#A0C4FF",
    accentSoft: "rgba(160,196,255,0.16)"
  }
];

async function completeOnboarding(): Promise<void> {
  await secureSet(ONBOARDING_DONE_KEY, "1");
}

function Artwork({ slide }: { slide: Slide }) {
  if (slide.key === "capture") {
    return (
      <View className="items-center justify-center">
        <View
          className="absolute h-[280px] w-[280px] rounded-full"
          style={{ backgroundColor: slide.accentSoft }}
        />
        <View className="h-[280px] w-full items-center justify-center">
          <View className="absolute left-9 top-20 h-28 w-24 border border-white/10 bg-night3 px-3 py-3">
            <LinearGradient colors={["#3A2018", "#5A3020"]} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="leaf-outline" size={28} color="#F5F0E8" />
            </LinearGradient>
          </View>
          <View className="absolute right-9 top-12 h-28 w-24 border border-white/10 bg-night3 px-3 py-3">
            <LinearGradient colors={["#2A3A28", "#3A5035"]} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="gift-outline" size={28} color="#F5F0E8" />
            </LinearGradient>
          </View>
          <View className="h-24 w-24 items-center justify-center border border-white/10 bg-night3">
            <View className="h-14 w-14 items-center justify-center border" style={{ borderColor: `${slide.accent}88`, backgroundColor: `${slide.accent}1C` }}>
              <Ionicons name={slide.icon} size={28} color={slide.accent} />
            </View>
          </View>
        </View>
      </View>
    );
  }

  if (slide.key === "together") {
    return (
      <View className="items-center justify-center">
        <View className="h-[280px] w-full items-center justify-center">
          <View className="absolute h-44 w-44 rounded-full border border-white/10" />
          <View className="absolute h-64 w-64 rounded-full border border-dashed border-white/10" />
          {[
            { top: 58, left: 62, label: "M" },
            { top: 62, right: 60, label: "D" },
            { bottom: 44, label: "G" }
          ].map((item, index) => (
            <View
              key={item.label}
              className="absolute h-14 w-14 items-center justify-center border-2 border-night2"
              style={{
                borderRadius: 999,
                backgroundColor: index === 0 ? T.terracotta : index === 1 ? T.sage : "#7A6658",
                ...(item.top !== undefined ? { top: item.top } : {}),
                ...(item.left !== undefined ? { left: item.left } : {}),
                ...(item.right !== undefined ? { right: item.right } : {}),
                ...(item.bottom !== undefined ? { bottom: item.bottom, left: "50%", marginLeft: -28 } : {})
              }}
            >
              <Text className="font-bodybold text-base text-cream">{item.label}</Text>
            </View>
          ))}
          <View className="h-20 w-20 items-center justify-center rounded-full border" style={{ borderColor: `${slide.accent}66`, backgroundColor: `${slide.accent}1A` }}>
            <Ionicons name="happy-outline" size={34} color={slide.accent} />
          </View>
        </View>
      </View>
    );
  }

  if (slide.key === "capsule") {
    return (
      <View className="items-center justify-center">
        <View className="h-[280px] w-full items-center justify-center">
          <View className="absolute h-60 w-60 rounded-full border border-gold/20" />
          <View className="absolute h-44 w-44 rounded-full border border-gold/20" />
          <View className="absolute left-14 top-24 border border-gold/30 bg-night3 px-3 py-2">
            <Ionicons name="images-outline" size={20} color={slide.accent} />
          </View>
          <View className="absolute right-14 top-16 border border-gold/30 bg-night3 px-3 py-2">
            <Ionicons name="videocam-outline" size={20} color={slide.accent} />
          </View>
          <View className="absolute right-20 top-52 border border-gold/30 bg-night3 px-3 py-2">
            <Ionicons name="document-text-outline" size={20} color={slide.accent} />
          </View>
          <View className="items-center justify-center border border-gold/35 bg-night3 px-10 py-8">
            <Ionicons name={slide.icon} size={42} color={slide.accent} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className="items-center justify-center">
      <View className="h-[280px] w-full items-center justify-center">
        <View className="absolute h-64 w-64 rounded-full" style={{ backgroundColor: slide.accentSoft }} />
        <View className="absolute left-12 top-20 border border-white/10 bg-night3 px-4 py-2">
          <Text className="font-body text-[11px] uppercase tracking-[2px] text-moonDim">No ads</Text>
        </View>
        <View className="absolute right-10 top-14 border border-white/10 bg-night3 px-4 py-2">
          <Text className="font-body text-[11px] uppercase tracking-[2px] text-moonDim">Family only</Text>
        </View>
        <View className="absolute bottom-12 border border-white/10 bg-night3 px-4 py-2">
          <Text className="font-body text-[11px] uppercase tracking-[2px] text-moonDim">Protected</Text>
        </View>
        <View className="h-24 w-24 items-center justify-center rounded-full border" style={{ borderColor: `${slide.accent}88`, backgroundColor: `${slide.accent}20` }}>
          <Ionicons name={slide.icon} size={38} color={slide.accent} />
        </View>
      </View>
    </View>
  );
}

export default function AuthOnboardingScreen() {
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

  const onSkip = async () => {
    await completeOnboarding();
    setPhase("choice");
  };

  const onContinue = async () => {
    if (!isLast) {
      setIndex((value) => value + 1);
      return;
    }

    await completeOnboarding();
    setPhase("choice");
  };

  if (!checked) {
    return (
      <SafeAreaView edges={["top", "bottom"]} className="flex-1 items-center justify-center bg-night2">
        <ActivityIndicator color={T.terracotta} />
      </SafeAreaView>
    );
  }

  if (phase === "choice") {
    return (
      <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-night2">
        <LinearGradient
          colors={["rgba(196,98,58,0.18)", "rgba(15,13,11,0.04)", "rgba(15,13,11,0)"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ position: "absolute", top: 0, left: 0, right: 0, height: 340 }}
        />

        <View className="flex-1 px-6 pb-6">
          <View className="flex-[0.62] items-center justify-center">
            <View className="absolute h-64 w-64 rounded-full bg-terracotta/10" />
            <View className="absolute left-10 top-32 border border-white/10 bg-night3 px-4 py-3">
              <Ionicons name="camera-outline" size={22} color={T.terracotta} />
            </View>
            <View className="absolute right-12 top-24 border border-white/10 bg-night3 px-4 py-3">
              <Ionicons name="people-outline" size={22} color={T.sage} />
            </View>
            <View className="absolute bottom-20 left-16 border border-white/10 bg-night3 px-4 py-3">
              <Ionicons name="mail-open-outline" size={22} color={T.gold} />
            </View>
            <View className="h-24 w-24 items-center justify-center rounded-full border border-white/10 bg-night3">
              <Ionicons name="sparkles-outline" size={34} color={T.terracotta} />
            </View>
          </View>

          <View className="flex-[0.38] justify-end">
            <Text className="text-center font-display text-[44px] leading-[46px] text-cream">EverNest</Text>
            <Text className="mt-3 text-center font-body text-[14px] leading-6 text-moonDim">
              A calm, beautiful archive for your child’s everyday story.
            </Text>

            <View className="mt-6 flex-row flex-wrap justify-center gap-2">
              {["Daily capture", "Family timeline", "Time capsules", "Private by default"].map((label) => (
                <View key={label} className="border border-night4 bg-night3/70 px-3 py-2">
                  <Text className="font-body text-[11px] text-moonDim">{label}</Text>
                </View>
              ))}
            </View>

            <View className="mt-8 gap-3">
              <Pressable onPress={() => router.push("/(auth)/sign-up")} className="bg-terracotta px-4 py-3.5">
                <Text className="text-center font-bodybold text-[14px] text-cream">Create a free account</Text>
              </Pressable>

              <Pressable onPress={() => router.push("/(auth)/sign-in")} className="border border-night4 bg-night3/80 px-4 py-3.5">
                <Text className="text-center font-body text-[14px] text-moon">I already have an account</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-night2">
      <LinearGradient
        colors={[slide.accentSoft, "rgba(15,13,11,0.03)", "rgba(15,13,11,0)"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 360 }}
      />

      <View className="flex-row justify-end px-5 pt-2">
        <Pressable onPress={onSkip} className="border border-night4 bg-night3/70 px-3 py-2">
          <Text className="font-body text-[11px] uppercase tracking-[1px] text-moonDim">Skip</Text>
        </Pressable>
      </View>

      <View className="flex-1 px-6 pb-6">
        <MotiView
          key={slide.key}
          from={{ opacity: 0, translateY: 18 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 320 }}
          className="flex-1"
        >
          <View className="flex-[0.62] items-center justify-center">
            <Artwork slide={slide} />
          </View>

          <View className="flex-[0.38] justify-end">
            <View className="mb-5 flex-row justify-center gap-2">
              {SLIDES.map((item, dotIndex) => {
                const active = dotIndex === index;
                return (
                  <Pressable
                    key={item.key}
                    onPress={() => setIndex(dotIndex)}
                    style={{
                      height: 7,
                      width: active ? 26 : 7,
                      borderRadius: 999,
                      backgroundColor: active ? slide.accent : "rgba(255,255,255,0.16)"
                    }}
                  />
                );
              })}
            </View>

            <Text className="font-display text-[38px] leading-[42px] text-cream">{slide.title}</Text>
            <Text className="mt-3 font-body text-[14px] leading-6 text-moonDim">{slide.body}</Text>

            <Pressable onPress={onContinue} className="mt-8 px-4 py-3" style={{ backgroundColor: slide.accent }}>
              <Text className="text-center font-bodybold text-[14px] text-cream">{isLast ? "Get started" : "Next"}</Text>
            </Pressable>

            <Pressable onPress={() => setPhase("choice")} className="mt-3 py-1">
              <Text className="text-center font-body text-[12px] text-moonDim">I already have an account</Text>
            </Pressable>
          </View>
        </MotiView>
      </View>
    </SafeAreaView>
  );
}
