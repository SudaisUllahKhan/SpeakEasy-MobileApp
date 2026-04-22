// Deep-link callback handler for magic links (speakeasy://auth/callback?token=...)
// NextAuth redirects to this URL after email verification

import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuthStore } from "@/lib/authStore";
import { colors, fontSize, fontWeight, spacing } from "@/lib/theme";

export default function AuthCallbackScreen(): React.ReactElement {
  const router = useRouter();
  const params = useLocalSearchParams<{
    token?: string;
    callbackUrl?: string;
    error?: string;
  }>();
  const { setToken, loadFromStorage } = useAuthStore();
  const [status, setStatus] = useState<"processing" | "success" | "error">(
    "processing"
  );

  useEffect(() => {
    (async () => {
      const { token, error } = params;

      if (error) {
        setStatus("error");
        Alert.alert(
          "Sign in failed",
          "The magic link has expired or is invalid. Please request a new one.",
          [{ text: "OK", onPress: () => router.replace("/(auth)/login") }]
        );
        return;
      }

      if (token) {
        try {
          await setToken(token);
          await loadFromStorage();
          setStatus("success");
          router.replace("/(app)/dashboard");
        } catch {
          setStatus("error");
          Alert.alert("Sign in failed", "Could not authenticate. Please try again.", [
            { text: "OK", onPress: () => router.replace("/(auth)/login") },
          ]);
        }
        return;
      }

      // No token — might be a web-flow completion
      // Try to load from storage in case cookie was set
      try {
        await loadFromStorage();
        const { isAuthenticated } = useAuthStore.getState();
        if (isAuthenticated) {
          router.replace("/(app)/dashboard");
        } else {
          router.replace("/(auth)/login");
        }
      } catch {
        router.replace("/(auth)/login");
      }
    })();
  // Only run once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "processing") {
    return <LoadingSpinner fullScreen label="Signing you in..." />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Redirecting...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },
  text: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
  },
});
