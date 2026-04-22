import React, { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet } from "react-native";
import { colors, borderRadius, fontSize, fontWeight } from "@/lib/theme";
import { getScoreColor } from "@/lib/utils";

interface ScoreBarProps {
  label: string;
  score: number;
  maxScore?: number;
  animated?: boolean;
}

export function ScoreBar({
  label,
  score,
  maxScore = 10,
  animated = true,
}: ScoreBarProps): React.ReactElement {
  const widthAnim = useRef(new Animated.Value(0)).current;
  const fillPercent = Math.min((score / maxScore) * 100, 100);
  const scoreColor = getScoreColor(score);

  useEffect(() => {
    if (animated) {
      Animated.timing(widthAnim, {
        toValue: fillPercent,
        duration: 800,
        delay: 200,
        useNativeDriver: false,
      }).start();
    } else {
      widthAnim.setValue(fillPercent);
    }
  }, [score, animated, fillPercent, widthAnim]);

  return (
    <View style={styles.container} accessibilityLabel={`${label}: ${score} out of ${maxScore}`}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.score, { color: scoreColor }]}>{score.toFixed(1)}</Text>
      </View>
      <View style={styles.track}>
        <Animated.View
          style={[
            styles.fill,
            {
              backgroundColor: scoreColor,
              width: widthAnim.interpolate({
                inputRange: [0, 100],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  score: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  track: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: borderRadius.full,
  },
});
