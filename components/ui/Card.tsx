import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { colors, borderRadius, shadow } from "@/lib/theme";

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
  padding?: number;
}

export function Card({
  children,
  style,
  elevated = false,
  padding = 16,
}: CardProps): React.ReactElement {
  return (
    <View
      style={[
        styles.card,
        elevated && shadow.md,
        { padding },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
