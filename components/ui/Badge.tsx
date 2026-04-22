import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { colors, borderRadius, fontSize, fontWeight } from "@/lib/theme";

type BadgeVariant = "a1" | "a2" | "b1" | "success" | "danger" | "warning" | "muted" | "primary";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

const variantConfig: Record<BadgeVariant, { bg: string; text: string }> = {
  a1: { bg: "#D1FAE5", text: "#065F46" },
  a2: { bg: "#DBEAFE", text: "#1E40AF" },
  b1: { bg: "#EDE9FE", text: "#4C1D95" },
  success: { bg: "#DCFCE7", text: "#15803D" },
  danger: { bg: "#FEE2E2", text: "#DC2626" },
  warning: { bg: "#FEF3C7", text: "#92400E" },
  muted: { bg: "#F3F4F6", text: "#6B7280" },
  primary: { bg: "#EDE9FE", text: "#7C3AED" },
};

export function Badge({
  children,
  variant = "muted",
  style,
}: BadgeProps): React.ReactElement {
  const { bg, text } = variantConfig[variant];

  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      <Text style={[styles.text, { color: text }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
