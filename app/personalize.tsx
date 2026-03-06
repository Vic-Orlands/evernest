import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { Redirect, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MotiView } from "moti";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { savePersonalization } from "@/lib/profile";
import { PersonalizationPreferences } from "@/lib/types";
import { useProfile } from "@/hooks/use-profile";
import { useAppTheme } from "@/hooks/use-app-theme";

type StepOption = {
  val: string;
  label: string;
  sub?: string;
  emoji: string;
};

type Step = {
  key: keyof PersonalizationPreferences | "priorities";
  q: string;
  sub: string;
  emoji: string;
  multi?: boolean;
  opts: StepOption[];
};

const STEPS: Step[] = [
  {
    key: "childStage",
    q: "How old is your little one?",
    sub: "We’ll tailor milestones to match their journey.",
    emoji: "👶",
    opts: [
      { val: "newborn", label: "Newborn", sub: "0-3 months", emoji: "🍼" },
      { val: "baby", label: "Baby", sub: "3-12 months", emoji: "🧸" },
      { val: "toddler", label: "Toddler", sub: "1-3 years", emoji: "🚶" },
      { val: "child", label: "Child", sub: "4+ years", emoji: "🎒" }
    ]
  },
  {
    key: "priorities",
    q: "What matters most to you?",
    sub: "Choose everything that fits your family rhythm.",
    emoji: "✨",
    multi: true,
    opts: [
      { val: "daily", label: "Daily moments", emoji: "📅" },
      { val: "milestones", label: "Big milestones", emoji: "🎉" },
      { val: "legacy", label: "Legacy & letters", emoji: "💌" },
      { val: "collab", label: "Sharing with family", emoji: "👨‍👩‍👧" }
    ]
  },
  {
    key: "reminderWindow",
    q: "When do you want your reminder?",
    sub: "Capture something every day without thinking too hard about it.",
    emoji: "🔔",
    opts: [
      { val: "morning", label: "Morning", sub: "8:00 AM", emoji: "🌅" },
      { val: "noon", label: "Midday", sub: "12:00 PM", emoji: "☀️" },
      { val: "golden", label: "Golden hour", sub: "5:00 PM", emoji: "🌄" },
      { val: "night", label: "Bedtime", sub: "8:30 PM", emoji: "🌙" }
    ]
  },
  {
    key: "themePreference",
    q: "Which look should EverNest start with?",
    sub: "You can switch this later in settings.",
    emoji: "🎨",
    opts: [
      { val: "dark", label: "Dark mode", sub: "Warm, cinematic, cozy", emoji: "🌘" },
      { val: "light", label: "Light mode", sub: "Soft paper, calm and bright", emoji: "🌤️" }
    ]
  }
];

const DEFAULT_SELECTION: PersonalizationPreferences = {
  childStage: "baby",
  priorities: ["daily", "milestones"],
  reminderWindow: "night",
  themePreference: "dark"
};

export default function PersonalizeScreen() {
  const queryClient = useQueryClient();
  const { colors, setThemeName } = useAppTheme();
  const { user, profile, loading } = useProfile();
  const [step, setStep] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const [selected, setSelected] = useState<PersonalizationPreferences>(
    profile?.personalization ?? DEFAULT_SELECTION
  );

  const current = STEPS[step];
  const currentValue = selected[current.key as keyof PersonalizationPreferences];
  const isMulti = Boolean(current.multi);

  const canContinue = useMemo(() => {
    if (isMulti) {
      return Array.isArray(currentValue) && currentValue.length > 0;
    }
    return Boolean(currentValue);
  }, [currentValue, isMulti]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await savePersonalization(selected);
      await setThemeName(selected.themePreference);
    },
    onSuccess: async () => {
      if (user) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.profile(user.id) });
      }
      router.replace("/(tabs)");
    }
  });

  const goNext = () => {
    if (step < STEPS.length - 1) {
      setStep((value) => value + 1);
      setAnimKey((value) => value + 1);
      return;
    }
    saveMutation.mutate();
  };

  const toggle = (value: string) => {
    if (current.multi) {
      const currentItems = Array.isArray(currentValue) ? currentValue : [];
      const nextItems = currentItems.includes(value as PersonalizationPreferences["priorities"][number])
        ? currentItems.filter((item) => item !== value)
        : [...currentItems, value as PersonalizationPreferences["priorities"][number]];
      setSelected((state) => ({ ...state, priorities: nextItems as PersonalizationPreferences["priorities"] }));
      return;
    }

    setSelected((state) => ({
      ...state,
      [current.key]: value
    }));

    setTimeout(goNext, 260);
  };

  if (loading) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.brand} />
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)" />;
  }

  if (profile?.personalizationCompletedAt) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: colors.background }}>
      <LinearGradient
        colors={[colors.brandBackground, "transparent"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 320 }}
      />

      <View style={{ height: 4, backgroundColor: colors.border }}>
        <View
          style={{
            width: `${((step + 1) / STEPS.length) * 100}%`,
            height: "100%",
            backgroundColor: colors.brand,
            borderRadius: 999
          }}
        />
      </View>

      <View style={{ paddingHorizontal: 24, paddingTop: 18 }}>
        <Text
          style={{
            fontFamily: "DMSans_400Regular",
            fontSize: 10,
            letterSpacing: 1.8,
            textTransform: "uppercase",
            color: colors.textMuted
          }}
        >
          Step {step + 1} of {STEPS.length}
        </Text>
      </View>

      <MotiView
        key={`question-${animKey}`}
        from={{ opacity: 0, translateY: 18 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "timing", duration: 360 }}
        style={{ paddingHorizontal: 24, paddingTop: 20 }}
      >
        <Text style={{ fontSize: 36, marginBottom: 12 }}>{current.emoji}</Text>
        <Text
          style={{
            fontFamily: "InstrumentSerif_400Regular",
            fontSize: 30,
            lineHeight: 34,
            color: colors.text
          }}
        >
          {current.q}
        </Text>
        <Text
          style={{
            fontFamily: "DMSans_400Regular",
            fontSize: 13,
            lineHeight: 21,
            color: colors.textMuted,
            marginTop: 8
          }}
        >
          {current.sub}
        </Text>
      </MotiView>

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32, gap: 12 }}
      >
        {current.opts.map((option, index) => {
          const isSelected = current.multi
            ? Array.isArray(currentValue) &&
              currentValue.includes(option.val as PersonalizationPreferences["priorities"][number])
            : currentValue === option.val;

          return (
            <MotiView
              key={`${animKey}-${option.val}`}
              from={{ opacity: 0, translateY: 18 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 320, delay: index * 50 }}
            >
              <Pressable
                onPress={() => toggle(option.val)}
                style={{
                  borderRadius: 18,
                  borderWidth: 1.5,
                  borderColor: isSelected ? colors.brand : colors.borderSoft,
                  backgroundColor: isSelected ? colors.brandBackground : colors.surface,
                  paddingHorizontal: 16,
                  paddingVertical: 16,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 14
                }}
              >
                <Text style={{ fontSize: 24 }}>{option.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontFamily: "DMSans_500Medium",
                      fontSize: 14,
                      color: colors.text
                    }}
                  >
                    {option.label}
                  </Text>
                  {option.sub ? (
                    <Text
                      style={{
                        fontFamily: "DMSans_400Regular",
                        fontSize: 11,
                        color: colors.textMuted,
                        marginTop: 3
                      }}
                    >
                      {option.sub}
                    </Text>
                  ) : null}
                </View>
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    borderWidth: 1.5,
                    borderColor: isSelected ? colors.brand : colors.borderSoft,
                    backgroundColor: isSelected ? colors.brand : "transparent",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  {isSelected ? (
                    <Text
                      style={{
                        fontFamily: "DMSans_500Medium",
                        fontSize: 11,
                        color: "#FFFFFF"
                      }}
                    >
                      ✓
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            </MotiView>
          );
        })}
      </ScrollView>

      {current.multi ? (
        <View style={{ paddingHorizontal: 24, paddingBottom: 32 }}>
          <Pressable
            onPress={goNext}
            disabled={!canContinue || saveMutation.isPending}
            style={{
              borderRadius: 16,
              backgroundColor: colors.brand,
              paddingVertical: 17,
              opacity: canContinue ? 1 : 0.42
            }}
          >
            <Text
              style={{
                fontFamily: "DMSans_500Medium",
                fontSize: 15,
                color: "#FFFFFF",
                textAlign: "center"
              }}
            >
              {saveMutation.isPending ? "Saving..." : "Continue"}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}
