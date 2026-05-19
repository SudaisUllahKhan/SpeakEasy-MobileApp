import React, { useEffect, Component } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as SplashScreen from "expo-splash-screen";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import * as Sentry from "@sentry/react-native";
import { useAuthStore } from "@/lib/authStore";
import { queryClient } from "@/lib/queryClient";
import { getDashboard, getTopics, getProgress, getUserSettings } from "@/lib/api";

Sentry.init({
  dsn: "https://74b74b8988bbb8cca1f014cc83e07d8f@o4511417951518720.ingest.us.sentry.io/4511417958793216",
  environment: process.env.APP_ENV ?? "development",
  tracesSampleRate: 0.2,
  enableNativeFramesTracking: true,
});

// Keep splash screen visible while loading auth
SplashScreen.preventAutoHideAsync();

class ErrorBoundary extends Component<
  { children: React.ReactNode },
  { error: string | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(err: unknown) {
    const msg =
      err instanceof Error ? err.message : String(err);
    return { error: msg };
  }

  render() {
    if (this.state.error) {
      return (
        <View style={eb.container}>
          <Text style={eb.title}>App Error</Text>
          <Text style={eb.msg}>{this.state.error}</Text>
          <TouchableOpacity
            style={eb.btn}
            onPress={() => this.setState({ error: null })}
          >
            <Text style={eb.btnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const eb = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 16,
  },
  msg: {
    fontSize: 14,
    color: "#EDE9FE",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  btn: {
    backgroundColor: "#fff",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  btnText: {
    color: "#7C3AED",
    fontWeight: "700",
    fontSize: 16,
  },
});

function AppContent(): React.ReactElement {
  const { loadFromStorage } = useAuthStore();

  useEffect(() => {
    // Hard cap: never show splash for more than 3s regardless of network state.
    const maxWait = setTimeout(() => SplashScreen.hideAsync(), 3000);
    loadFromStorage().finally(() => {
      clearTimeout(maxWait);
      SplashScreen.hideAsync();
      const { user } = useAuthStore.getState();
      if (user) {
        queryClient.prefetchQuery({ queryKey: ["dashboard"], queryFn: getDashboard });
        queryClient.prefetchQuery({ queryKey: ["topics"], queryFn: getTopics });
        queryClient.prefetchQuery({ queryKey: ["progress"], queryFn: getProgress });
        queryClient.prefetchQuery({ queryKey: ["user-settings"], queryFn: getUserSettings });
      }
    });
  }, [loadFromStorage]);

  // Always render the Stack — native splash covers UI during loading so there is
  // no flash. Returning null was causing the Stack to unmount which broke
  // router.replace() calls that fire from the auth/callback deep-link screen.
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
      <Stack.Screen name="auth/callback" />
    </Stack>
  );
}

function RootLayout(): React.ReactElement | null {
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <StatusBar style="light" />
            <AppContent />
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

export default Sentry.wrap(RootLayout);
