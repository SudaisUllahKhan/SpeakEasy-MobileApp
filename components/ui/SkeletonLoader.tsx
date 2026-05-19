import React, { useEffect, useRef } from "react";
import { Animated, View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, borderRadius, spacing } from "@/lib/theme";

function SkeletonBox({
  width = "100%" as number | `${number}%`,
  height = 16,
  radius = 8,
  style,
}: {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: object;
}) {
  const opacity = useRef(new Animated.Value(0.25)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.9, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.25, duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius, backgroundColor: "#DDD6FE", opacity }, style]}
    />
  );
}

export function DashboardSkeleton() {
  return (
    <SafeAreaView style={s.container}>
      <View style={s.scroll}>
        {/* Header */}
        <View style={s.header}>
          <View style={{ gap: 8 }}>
            <SkeletonBox width={200} height={26} radius={8} />
            <SkeletonBox width={150} height={16} radius={6} />
          </View>
          <SkeletonBox width={42} height={24} radius={12} />
        </View>

        {/* XP card */}
        <View style={s.card}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 16 }}>
            <View style={{ gap: 8, flex: 1 }}>
              <SkeletonBox width={120} height={18} radius={6} />
              <SkeletonBox width={80} height={14} radius={6} />
            </View>
            <SkeletonBox width={60} height={60} radius={30} />
          </View>
          <SkeletonBox width="100%" height={8} radius={4} style={{ marginBottom: 6 }} />
          <SkeletonBox width="65%" height={12} radius={6} />
        </View>

        {/* Quote card */}
        <View style={s.card}>
          <SkeletonBox width="95%" height={13} radius={6} style={{ marginBottom: 8 }} />
          <SkeletonBox width="75%" height={13} radius={6} />
        </View>

        {/* Recent lessons */}
        <View style={s.card}>
          <SkeletonBox width={130} height={16} radius={6} style={{ marginBottom: 14 }} />
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <SkeletonBox width={40} height={40} radius={20} />
              <View style={{ flex: 1, gap: 6 }}>
                <SkeletonBox width="70%" height={14} radius={6} />
                <SkeletonBox width="45%" height={12} radius={6} />
              </View>
              <SkeletonBox width={40} height={20} radius={10} />
            </View>
          ))}
        </View>

        {/* CTA button */}
        <SkeletonBox width="100%" height={52} radius={12} />
      </View>
    </SafeAreaView>
  );
}

export function TopicsSkeleton() {
  return (
    <SafeAreaView style={s.container}>
      <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm, gap: 8 }}>
        <SkeletonBox width={120} height={28} radius={8} />
        <SkeletonBox width={110} height={15} radius={6} />
      </View>

      <View style={t.grid}>
        {Array.from({ length: 6 }).map((_, i) => (
          <View key={i} style={t.card}>
            <SkeletonBox width="100%" height={80} radius={0} />
            <View style={{ padding: 12, gap: 8 }}>
              <SkeletonBox width="80%" height={14} radius={6} />
              <SkeletonBox width="50%" height={12} radius={6} />
              <SkeletonBox width="100%" height={4} radius={2} />
            </View>
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, gap: 14 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
});

const t = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: spacing.md,
    gap: 12,
  },
  card: {
    width: "47%",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
});
