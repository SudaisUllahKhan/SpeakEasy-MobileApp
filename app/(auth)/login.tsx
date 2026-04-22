import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/ui/Button";
import { colors, fontSize, fontWeight, borderRadius, spacing } from "@/lib/theme";
import { sendMagicLink, getGoogleAuthUrl } from "@/lib/api";
import { useAuthStore } from "@/lib/authStore";

WebBrowser.maybeCompleteAuthSession();

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "https://your-speakeasy-domain.com";

export default function LoginScreen(): React.ReactElement {
  const router = useRouter();
  const { setToken, loadFromStorage } = useAuthStore();
  const [email, setEmail] = useState("");
  const [isEmailLoading, setEmailLoading] = useState(false);
  const [isGoogleLoading, setGoogleLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const validateEmail = (value: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  };

  const handleSendMagicLink = async () => {
    setEmailError(null);
    const trimmed = email.trim();

    if (!trimmed) {
      setEmailError("Please enter your email address.");
      return;
    }
    if (!validateEmail(trimmed)) {
      setEmailError("Please enter a valid email address.");
      return;
    }

    setEmailLoading(true);
    try {
      await sendMagicLink(trimmed);
      router.push({ pathname: "/(auth)/verify", params: { email: trimmed } });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to send magic link.";
      Alert.alert("Error", message);
    } finally {
      setEmailLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const googleUrl = await getGoogleAuthUrl();
      const result = await WebBrowser.openAuthSessionAsync(
        googleUrl,
        `speakeasy://auth/callback`
      );

      if (result.type === "success" && result.url) {
        // Extract session token from callback URL
        const url = new URL(result.url);
        const sessionToken =
          url.searchParams.get("sessionToken") ??
          url.searchParams.get("token");

        if (sessionToken) {
          await setToken(sessionToken);
          await loadFromStorage();
          router.replace("/(app)/dashboard");
        } else {
          // Open in browser to complete OAuth flow
          await WebBrowser.openBrowserAsync(`${API_URL}/api/auth/signin/google`);
        }
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Google sign-in failed.";
      Alert.alert("Sign In Error", message);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <View style={styles.hero}>
            <View style={styles.logoContainer}>
              <Ionicons name="mic" size={40} color={colors.white} />
            </View>
            <Text style={styles.appName}>SpeakEasy</Text>
            <Text style={styles.tagline}>
              AI-powered English speaking practice
            </Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Welcome back</Text>
            <Text style={styles.cardSubtitle}>
              Sign in to continue your learning journey
            </Text>

            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email address</Text>
              <View
                style={[
                  styles.inputContainer,
                  emailError ? styles.inputError : null,
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={colors.muted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={(v) => {
                    setEmail(v);
                    setEmailError(null);
                  }}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.muted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  returnKeyType="send"
                  onSubmitEditing={handleSendMagicLink}
                  accessibilityLabel="Email address input"
                />
              </View>
              {emailError && (
                <Text style={styles.errorText}>{emailError}</Text>
              )}
            </View>

            <Button
              onPress={handleSendMagicLink}
              loading={isEmailLoading}
              disabled={isEmailLoading || isGoogleLoading}
              fullWidth
              size="lg"
              accessibilityLabel="Send magic link to email"
            >
              Send magic link
            </Button>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Button */}
            <TouchableOpacity
              style={[
                styles.googleButton,
                (isGoogleLoading || isEmailLoading) && styles.disabledButton,
              ]}
              onPress={handleGoogleSignIn}
              disabled={isGoogleLoading || isEmailLoading}
              accessibilityLabel="Continue with Google"
              activeOpacity={0.8}
            >
              <Ionicons name="logo-google" size={20} color="#4285F4" />
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>

            <Text style={styles.terms}>
              By signing in, you agree to our Terms of Service and Privacy
              Policy.
            </Text>
          </View>

          {/* Levels info */}
          <View style={styles.levelsRow}>
            {(["A1", "A2", "B1"] as const).map((level) => (
              <View key={level} style={styles.levelChip}>
                <Text style={styles.levelChipText}>{level}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.levelsLabel}>
            Three proficiency levels — find yours
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  hero: {
    alignItems: "center",
    paddingTop: spacing.xxl,
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
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.bg,
    paddingHorizontal: 12,
  },
  inputError: {
    borderColor: colors.danger,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 13,
    fontSize: fontSize.base,
    color: colors.text,
  },
  errorText: {
    fontSize: fontSize.xs,
    color: colors.danger,
    marginTop: 4,
    marginLeft: 4,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    paddingHorizontal: 12,
    fontSize: fontSize.sm,
    color: colors.muted,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingVertical: 13,
    paddingHorizontal: 20,
    backgroundColor: colors.surface,
    gap: 10,
    marginBottom: spacing.md,
  },
  disabledButton: {
    opacity: 0.5,
  },
  googleButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
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
});
