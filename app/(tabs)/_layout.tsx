import { Text, View, useWindowDimensions } from "react-native";
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

function CurvedTabBarBackground() {
  const { width } = useWindowDimensions();
  const radius = 36;

  return (
    <View style={{ flex: 1, backgroundColor: "transparent" }} pointerEvents="none">
      <View style={{
        flex: 1,
        backgroundColor: T.night2,
        borderTopWidth: 1,
        borderColor: "rgba(255,255,255,0.08)"
      }} />

      <View style={{
        position: "absolute",
        top: -radius + 12,
        left: width / 2 - radius,
        width: radius * 2,
        height: radius * 2,
        borderRadius: radius,
        backgroundColor: T.night2,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)"
      }} />

      <View style={{
        position: "absolute",
        top: 1,
        left: width / 2 - radius - 1,
        width: radius * 2 + 2,
        height: radius + 10,
        backgroundColor: T.night2,
      }} />
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => {
        const meta = TAB_META[route.name] ?? { icon: "circle-outline", label: route.name };
        const isCapture = route.name === "capture";

        return {
          headerShown: false,
          tabBarStyle: {
            backgroundColor: "transparent",
            borderTopWidth: 0,
            elevation: 0,
            height: 78,
            paddingTop: 9,
            paddingBottom: 14
          },
          tabBarBackground: () => <CurvedTabBarBackground />,
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
          tabBarIcon: ({ focused }) => {
            if (isCapture) {
              return (
                <View style={{ width: 72, height: 72, marginTop: -32, alignItems: "center", justifyContent: "center" }}>
                  <MotiView
                    animate={{
                      scale: focused ? 1.05 : 1,
                      backgroundColor: focused ? T.terracotta : "rgba(255,255,255,0.04)"
                    }}
                    transition={{ type: "timing", duration: 220 }}
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 26,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 1,
                      borderColor: focused ? "rgba(245,240,232,0.18)" : "rgba(255,255,255,0.06)",
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.25,
                      shadowRadius: 10
                    }}
                  >
                    <MaterialCommunityIcons name={meta.icon} size={24} color={focused ? T.cream : T.moonDim} />
                  </MotiView>
                </View>
              );
            }

            return (
              <MotiView
                animate={{
                  scale: focused ? 1.06 : 1,
                  translateY: focused ? -1 : 0,
                  backgroundColor: focused ? "rgba(196,98,58,0.2)" : "rgba(255,255,255,0.04)"
                }}
                transition={{ type: "timing", duration: 220 }}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: focused ? "rgba(196,98,58,0.45)" : "rgba(255,255,255,0.08)"
                }}
              >
                <MaterialCommunityIcons name={meta.icon} size={20} color={focused ? T.cream : T.moonDim} />
              </MotiView>
            );
          },
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
