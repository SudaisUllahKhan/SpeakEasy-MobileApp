import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/ui/Button";
import { colors, fontSize, fontWeight, borderRadius, spacing } from "@/lib/theme";
import { sendMagicLink } from "@/lib/api";

export default function VerifyScreen(): React.ReactElement {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [isResending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    try {
      await sendMagicLink(email);
      setResent(true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to resend link.";
      Alert.alert("Error", message);
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="mail" size={48} color={colors.primary} />
        </View>

        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.subtitle}>
          We sent a magic link to
        </Text>
        <Text style={styles.email}>{email ?? "your email"}</Text>
        <Text style={styles.instruction}>
          Tap the link in the email to sign in. The link expires in 24 hours.
        </Text>

        {/* Steps */}
        <View style={styles.stepsCard}>
          {[
            { icon: "mail-open-outline", text: "Open the email from SpeakEasy" },
            { icon: "link-outline", text: "Tap \"Sign in to SpeakEasy\"" },
            { icon: "checkmark-circle-outline", text: "You're in!" },
          ].map((step, i) => (
            <View key={i} style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{i + 1}</Text>
              </View>
              <Ionicons
                name={step.icon as React.ComponentProps<typeof Ionicons>["name"]}
                size={20}
                color={colors.primary}
                style={styles.stepIcon}
              />
              <Text style={styles.stepText}>{step.text}</Text>
            </View>
          ))}
        </View>

        {resent && (
          <View style={styles.resentBanner}>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <Text style={styles.resentText}>
              Magic link resent successfully!
            </Text>
          </View>
        )}

        <Button
          onPress={handleResend}
          variant="outline"
          loading={isResending}
          fullWidth
          style={styles.resendButton}
          accessibilityLabel="Resend magic link"
        >
          Resend magic link
        </Button>

        <Button
          onPress={() => router.back()}
          variant="ghost"
          fullWidth
          accessibilityLabel="Back to sign in"
        >
          Back to sign in
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    alignItems: "center",
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: colors.primaryBg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    textAlign: "center",
  },
  email: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
    marginBottom: 12,
    textAlign: "center",
  },
  instruction: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  stepsCard: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: 16,
  },
  step: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  stepIcon: {
    marginRight: 0,
  },
  stepText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  resentBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.successBg,
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: spacing.md,
    width: "100%",
  },
  resentText: {
    fontSize: fontSize.sm,
    color: colors.success,
    fontWeight: fontWeight.medium,
  },
  resendButton: {
    marginBottom: spacing.sm,
  },
});
