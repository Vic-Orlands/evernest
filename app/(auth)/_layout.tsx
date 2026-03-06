import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ animation: "fade" }} />
      <Stack.Screen
        name="sign-in"
        options={{
          presentation: "formSheet",
          animation: "slide_from_bottom",
          sheetGrabberVisible: true,
          sheetAllowedDetents: "fitToContents",
          contentStyle: { backgroundColor: "transparent" }
        }}
      />
      <Stack.Screen
        name="sign-up"
        options={{
          presentation: "formSheet",
          animation: "slide_from_bottom",
          sheetGrabberVisible: true,
          sheetAllowedDetents: "fitToContents",
          contentStyle: { backgroundColor: "transparent" }
        }}
      />
    </Stack>
  );
}
