import React from "react";
import { ActivityIndicator, View, Text, StyleSheet } from "react-native";
import { colors, fontSize } from "@/lib/theme";

interface LoadingSpinnerProps {
  size?: "small" | "large";
  color?: string;
  label?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({
  size = "large",
  color = colors.primary,
  label,
  fullScreen = false,
}: LoadingSpinnerProps): React.ReactElement {
  return (
    <View
      style={[styles.container, fullScreen && styles.fullScreen]}
      accessibilityRole="progressbar"
      accessibilityLabel={label ?? "Loading"}
    >
      <ActivityIndicator size={size} color={color} />
      {label && <Text style={styles.label}>{label}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  fullScreen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  label: {
    marginTop: 12,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});
