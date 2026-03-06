import { Text, View, useWindowDimensions } from "react-native";
import { Tabs } from "expo-router";
import { MotiView } from "moti";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppTheme } from "@/hooks/use-app-theme";

const TAB_META: Record<string, { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string }> = {
  index: { icon: "home-variant-outline", label: "Home" },
  capture: { icon: "camera-iris", label: "Capture" },
  capsules: { icon: "archive-lock-outline", label: "Capsules" },
  family: { icon: "account-group-outline", label: "Family" },
  settings: { icon: "cog-outline", label: "Settings" }
};

function CurvedTabBarBackground({
  backgroundColor,
  borderColor
}: {
  backgroundColor: string;
  borderColor: string;
}) {
  const { width } = useWindowDimensions();
  const radius = 36;

  return (
    <View style={{ flex: 1, backgroundColor: "transparent" }} pointerEvents="none">
      <View
        style={{
          flex: 1,
          backgroundColor,
          borderTopWidth: 1,
          borderColor
        }}
      />

      <View
        style={{
          position: "absolute",
          top: -radius + 12,
          left: width / 2 - radius,
          width: radius * 2,
          height: radius * 2,
          borderRadius: radius,
          backgroundColor,
          borderWidth: 1,
          borderColor
        }}
      />

      <View
        style={{
          position: "absolute",
          top: 1,
          left: width / 2 - radius - 1,
          width: radius * 2 + 2,
          height: radius + 10,
          backgroundColor
        }}
      />
    </View>
  );
}

export default function TabsLayout() {
  const { colors } = useAppTheme();

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
            height: 78,
            paddingTop: 9,
            paddingBottom: 14
          },
          tabBarBackground: () => (
            <CurvedTabBarBackground
              backgroundColor={colors.tabBar}
              borderColor={colors.tabBarBorder}
            />
          ),
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
                  color: focused ? colors.brand : colors.textMuted,
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
                    backgroundColor: colors.brand
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
                      backgroundColor: focused ? colors.brand : colors.surface
                    }}
                    transition={{ type: "timing", duration: 220 }}
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 26,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 1,
                      borderColor: focused ? colors.brand : colors.border,
                      boxShadow: colors.shadow
                    }}
                  >
                    <MaterialCommunityIcons name={meta.icon} size={24} color={focused ? "#FFFFFF" : colors.textMuted} />
                  </MotiView>
                </View>
              );
            }

            return (
              <MotiView
                animate={{
                  scale: focused ? 1.06 : 1,
                  translateY: focused ? -1 : 0,
                  backgroundColor: focused ? colors.brandBackground : colors.surface
                }}
                transition={{ type: "timing", duration: 220 }}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: focused ? colors.brand : colors.border
                }}
              >
                <MaterialCommunityIcons name={meta.icon} size={20} color={focused ? colors.brand : colors.textMuted} />
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
