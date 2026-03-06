import { Text } from "react-native";
import { Tabs } from "expo-router";
import { MotiView } from "moti";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { T } from "@/lib/theme";

const TAB_META: Record<string, { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string }> = {
  index: { icon: "home-variant-outline", label: "Home" },
  capture: { icon: "camera-iris", label: "Capture" },
  capsules: { icon: "archive-lock-outline", label: "Capsules" },
  family: { icon: "account-group-outline", label: "Family" },
  settings: { icon: "cog-outline", label: "Settings" }
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => {
        const meta = TAB_META[route.name] ?? { icon: "circle-outline", label: route.name };
        const isCapture = route.name === "capture";

        return {
          headerShown: false,
          tabBarStyle: {
            backgroundColor: T.night2,
            borderTopColor: "rgba(255,255,255,0.08)",
            borderTopWidth: 1,
            height: 78,
            paddingTop: 9,
            paddingBottom: 14
          },
          tabBarLabel: ({ focused }) => (
            <MotiView
              animate={{ opacity: focused ? 1 : 0.76 }}
              transition={{ type: "timing", duration: 180 }}
              style={{ alignItems: "center", gap: 2, marginTop: isCapture ? 10 : 6 }}
            >
              <Text
                style={{
                  fontFamily: focused ? "DMSans_500Medium" : "DMSans_400Regular",
                  fontSize: 9,
                  color: focused ? T.terracotta : T.moonDim,
                  letterSpacing: 0.42
                }}
              >
                {meta.label}
              </Text>
              {focused ? (
                <MotiView
                  from={{ scale: 0.8, opacity: 0.6 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "timing", duration: 180 }}
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: T.terracotta
                  }}
                />
              ) : null}
            </MotiView>
          ),
          tabBarIcon: ({ focused }) => (
            <MotiView
              animate={{
                scale: focused ? (isCapture ? 1.1 : 1.06) : 1,
                translateY: isCapture ? -8 : focused ? -1 : 0,
                backgroundColor: focused
                  ? isCapture
                    ? T.terracotta
                    : "rgba(196,98,58,0.2)"
                  : "rgba(255,255,255,0.04)"
              }}
              transition={{ type: "timing", duration: 220 }}
              style={{
                width: isCapture ? 50 : 36,
                height: isCapture ? 50 : 36,
                borderRadius: 999,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: focused
                  ? isCapture
                    ? "rgba(245,240,232,0.18)"
                    : "rgba(196,98,58,0.45)"
                  : "rgba(255,255,255,0.08)"
              }}
            >
              <MaterialCommunityIcons name={meta.icon} size={isCapture ? 24 : 20} color={focused ? T.cream : T.moonDim} />
            </MotiView>
          ),
          tabBarItemStyle: {
            paddingVertical: 1
          }
        };
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="capsules" options={{ title: "Capsule" }} />
      <Tabs.Screen
        name="capture"
        options={{
          title: "Capture",
          tabBarStyle: { display: "none" }
        }}
      />
      <Tabs.Screen name="family" options={{ title: "Family" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}
