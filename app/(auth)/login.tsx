import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Keyboard,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import * as AppleAuthentication from "expo-apple-authentication";
import { Ionicons } from "@expo/vector-icons";
import { colors, fontSize, fontWeight, borderRadius, spacing } from "@/lib/theme";
import { getGoogleAuthUrl } from "@/lib/api";
import { useAuthStore } from "@/lib/authStore";

WebBrowser.maybeCompleteAuthSession();

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "https://your-speakeasy-domain.com";

export default function LoginScreen(): React.ReactElement {
  const router = useRouter();
  const { setToken } = useAuthStore();
  const [isGoogleLoading, setGoogleLoading] = useState(false);
  const [isAppleLoading, setAppleLoading] = useState(false);
  const [isDevLoading, setDevLoading] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    AppleAuthentication.isAvailableAsync()
      .then(setAppleAvailable)
      .catch(() => setAppleAvailable(false));
  }, []);

  const handleGoogleSignIn = async () => {
    Keyboard.dismiss();
    setGoogleLoading(true);
    try {
      const mobileRedirect = Linking.createURL("auth/callback");
      const googleUrl = await getGoogleAuthUrl(mobileRedirect);
      const result = await WebBrowser.openAuthSessionAsync(googleUrl, mobileRedirect);
      if (result.type === "success" && result.url) {
        const parsed = new URL(result.url);
        const sessionToken =
          parsed.searchParams.get("sessionToken") ??
          parsed.searchParams.get("token");
        if (sessionToken) {
          await setToken(sessionToken);
          router.replace("/(app)/dashboard");
        } else {
          Alert.alert("Sign In Error", "Could not complete Google sign-in. Please try again.");
        }
      }
    } catch {
      Alert.alert("Sign In Error", "Google sign-in is not available right now. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    Keyboard.dismiss();
    setAppleLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const res = await fetch(`${API_URL}/api/auth/apple-signin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identityToken: credential.identityToken,
          user: credential.fullName
            ? {
                name: {
                  firstName: credential.fullName.givenName ?? undefined,
                  lastName: credential.fullName.familyName ?? undefined,
                },
                email: credential.email ?? undefined,
              }
            : undefined,
        }),
      });

      const data = (await res.json()) as { sessionToken?: string; error?: string };
      if (!data.sessionToken) throw new Error(data.error ?? "Apple sign-in failed");
      await setToken(data.sessionToken);
      router.replace("/(app)/dashboard");
    } catch (err: unknown) {
      if (err instanceof Error && "code" in err && (err as { code: string }).code === "ERR_REQUEST_CANCELED") {
        return;
      }
      Alert.alert("Sign In Error", err instanceof Error ? err.message : "Apple sign-in failed. Please try again.");
    } finally {
      setAppleLoading(false);
    }
  };

  const handleDevLogin = async () => {
    Keyboard.dismiss();
    setDevLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/dev-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "dev@speakeasy.test" }),
      });
      const text = await res.text();
      if (!text) throw new Error(`Empty response (status ${res.status})`);
      const data = JSON.parse(text) as { sessionToken?: string; error?: string };
      if (!data.sessionToken) throw new Error(data.error ?? "Dev login failed");
      await setToken(data.sessionToken);
      router.replace("/(app)/dashboard");
    } catch (err) {
      Alert.alert("Dev Login Error", err instanceof Error ? err.message : String(err));
    } finally {
      setDevLoading(false);
    }
  };

  // ── Main login screen ─────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.content}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.logoContainer}>
            <Ionicons name="mic" size={40} color={colors.white} />
          </View>
          <Text style={styles.appName}>SpeakEasy</Text>
          <Text style={styles.tagline}>AI-powered English speaking practice</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome</Text>
          <Text style={styles.cardSubtitle}>Sign in to continue your learning journey</Text>

          {/* Google */}
          <TouchableOpacity
            style={[styles.googleButton, isGoogleLoading && styles.disabledButton]}
            onPress={handleGoogleSignIn}
            disabled={isGoogleLoading}
            accessibilityLabel="Continue with Google"
            activeOpacity={0.8}
          >
            {isGoogleLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="logo-google" size={20} color="#4285F4" />
            )}
            <Text style={styles.googleButtonText}>
              {isGoogleLoading ? "Signing in..." : "Continue with Google"}
            </Text>
          </TouchableOpacity>

          {/* Apple (iOS only) */}
          {appleAvailable && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={8}
              style={[styles.appleButton, isAppleLoading && styles.disabledButton]}
              onPress={handleAppleSignIn}
            />
          )}

          <Text style={styles.terms}>
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </Text>

          {__DEV__ && (
            <TouchableOpacity
              style={styles.devButton}
              onPress={handleDevLogin}
              disabled={isDevLoading}
            >
              <Text style={styles.devButtonText}>
                {isDevLoading ? "Logging in..." : "DEV LOGIN (skip auth)"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Level chips */}
        <View style={styles.levelsRow}>
          {(["A1", "A2", "B1"] as const).map((level) => (
            <View key={level} style={styles.levelChip}>
              <Text style={styles.levelChipText}>{level}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.levelsLabel}>Three proficiency levels — find yours</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    justifyContent: "center",
  },
  hero: {
    alignItems: "center",
    paddingBottom: spacing.xl,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  appName: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.extrabold,
    color: colors.white,
    marginBottom: 8,
  },
  tagline: {
    fontSize: fontSize.base,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  cardTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: colors.surface,
    gap: 10,
    marginBottom: spacing.md,
  },
  disabledButton: {
    opacity: 0.6,
  },
  googleButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  appleButton: {
    height: 50,
    marginBottom: spacing.md,
  },
  terms: {
    fontSize: fontSize.xs,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 18,
  },
  levelsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 8,
  },
  levelChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: borderRadius.full,
  },
  levelChipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  levelsLabel: {
    fontSize: fontSize.xs,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
  },
  devButton: {
    marginTop: 12,
    paddingVertical: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#f97316",
    borderRadius: 8,
    borderStyle: "dashed",
  },
  devButtonText: {
    fontSize: fontSize.xs,
    color: "#f97316",
    fontWeight: fontWeight.semibold,
  },
});
