import React from "react";
import { Stack } from "expo-router";
import { Redirect } from "expo-router";
import { useAuthStore } from "@/lib/authStore";

export default function AuthLayout(): React.ReactElement {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Redirect href="/(app)/dashboard" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="verify" />
    </Stack>
  );
}
