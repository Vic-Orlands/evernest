import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#0F1420",
          borderTopColor: "#1E2433"
        },
        tabBarActiveTintColor: "#E8B15D",
        tabBarInactiveTintColor: "#8B95A7"
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Timeline",
          tabBarIcon: ({ color, size }) => <Ionicons name="albums-outline" color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="capture"
        options={{
          title: "Capture",
          tabBarIcon: ({ color, size }) => <Ionicons name="camera-outline" color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="capsules"
        options={{
          title: "Capsules",
          tabBarIcon: ({ color, size }) => <Ionicons name="time-outline" color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="family"
        options={{
          title: "Family",
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" color={color} size={size} />
        }}
      />
    </Tabs>
  );
}
