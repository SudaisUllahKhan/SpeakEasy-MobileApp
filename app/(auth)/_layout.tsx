import React from "react";
import { Stack } from "expo-router";
import { Redirect } from "expo-router";
import { useAuthStore } from "@/lib/authStore";

export default function AuthLayout(): React.ReactElement {
  const { isAuthenticated, isLoading } = useAuthStore();

  // Don't redirect during the initial load — auth state isn't known yet.
  if (!isLoading && isAuthenticated) {
    return <Redirect href="/(app)/dashboard" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
    </Stack>
  );
}
