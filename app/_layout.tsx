import "../global.css";

import * as SplashScreen from "expo-splash-screen";
import { Stack } from "expo-router";
import { Image, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import { DMSans_400Regular, DMSans_500Medium } from "@expo-google-fonts/dm-sans";
import { InstrumentSerif_400Regular } from "@expo-google-fonts/instrument-serif";
import { useEffect, useState } from "react";
import { AppThemeProvider, useAppTheme } from "@/hooks/use-app-theme";
import { useNotificationLifecycle } from "@/hooks/use-notification-lifecycle";

const appLaunchStartedAt = Date.now();
const minimumSplashDuration = 2000;

void SplashScreen.preventAutoHideAsync();

SplashScreen.setOptions({
  duration: 400,
  fade: true
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false
    }
  }
});

function RootNavigator() {
  const { colors, ready } = useAppTheme();
  useNotificationLifecycle();

  if (!ready) {
    return null;
  }

  return (
    <>
      <StatusBar style={colors.statusBar} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="notifications" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="personalize" options={{ animation: "fade" }} />
        <Stack.Screen name="avatar" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="accept-invite" options={{ presentation: "modal" }} />
        <Stack.Screen name="auth/callback" options={{ presentation: "card" }} />
      </Stack>
    </>
  );
}

function AppLaunchScreen() {
  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        backgroundColor: "#0B0E14"
      }}
    >
      <Image
        source={require("../assets/splash-icon.png")}
        style={{ width: "100%", height: "100%" }}
        resizeMode="cover"
      />
    </View>
  );
}

function AppContent({
  fontsLoaded,
  fontError
}: {
  fontsLoaded: boolean;
  fontError: Error | null;
}) {
  const { ready } = useAppTheme();
  const isReady = ready && (fontsLoaded || Boolean(fontError));
  const [showLaunchScreen, setShowLaunchScreen] = useState(true);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    let cancelled = false;

    const syncSplashVisibility = async () => {
      const remainingDuration = Math.max(
        0,
        minimumSplashDuration - (Date.now() - appLaunchStartedAt)
      );

      await SplashScreen.hideAsync();

      if (remainingDuration > 0) {
        await new Promise((resolve) => setTimeout(resolve, remainingDuration));
      }

      if (!cancelled) {
        setShowLaunchScreen(false);
      }
    };

    void syncSplashVisibility();

    return () => {
      cancelled = true;
    };
  }, [isReady]);

  if (!isReady) {
    return null;
  }

  return (
    <View style={{ flex: 1 }}>
      <RootNavigator />
      {showLaunchScreen ? <AppLaunchScreen /> : null}
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    InstrumentSerif_400Regular,
    DMSans_400Regular,
    DMSans_500Medium
  });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AppThemeProvider>
            <AppContent fontsLoaded={fontsLoaded} fontError={fontError} />
          </AppThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
