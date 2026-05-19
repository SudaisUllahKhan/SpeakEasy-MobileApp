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
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.85, duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 650, useNativeDriver: true }),
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

// ─── Dashboard ────────────────────────────────────────────────────────────────
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

        {/* Stats row */}
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={s.statCard}>
              <SkeletonBox width={40} height={40} radius={10} style={{ marginBottom: 8 }} />
              <SkeletonBox width={50} height={18} radius={6} style={{ marginBottom: 4 }} />
              <SkeletonBox width={70} height={11} radius={5} />
            </View>
          ))}
        </View>

        {/* XP card */}
        <View style={s.card}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 14 }}>
            <SkeletonBox width={90} height={90} radius={45} />
            <View style={{ flex: 1, gap: 8 }}>
              <SkeletonBox width={120} height={18} radius={6} />
              <SkeletonBox width={160} height={13} radius={6} />
              <SkeletonBox width="100%" height={6} radius={3} style={{ marginTop: 4 }} />
            </View>
          </View>
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

// ─── Topics grid ──────────────────────────────────────────────────────────────
export function TopicsSkeleton() {
  return (
    <SafeAreaView style={s.container}>
      <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: 10, gap: 8 }}>
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

// ─── Topic detail (lesson list) ───────────────────────────────────────────────
export function TopicDetailSkeleton() {
  return (
    <SafeAreaView style={s.container}>
      {/* Header area */}
      <View style={{ padding: spacing.md, gap: 10 }}>
        <SkeletonBox width={32} height={32} radius={16} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginTop: 6 }}>
          <SkeletonBox width={60} height={60} radius={16} />
          <View style={{ flex: 1, gap: 8 }}>
            <SkeletonBox width={180} height={22} radius={8} />
            <SkeletonBox width={120} height={14} radius={6} />
          </View>
        </View>
        <SkeletonBox width="100%" height={6} radius={3} style={{ marginTop: 4 }} />
      </View>

      {/* Lesson cards */}
      <View style={{ paddingHorizontal: spacing.md, gap: 10 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <View key={i} style={[s.card, { flexDirection: "row", alignItems: "center", gap: 14 }]}>
            <SkeletonBox width={48} height={48} radius={12} />
            <View style={{ flex: 1, gap: 7 }}>
              <SkeletonBox width="75%" height={15} radius={6} />
              <SkeletonBox width="50%" height={12} radius={6} />
            </View>
            <SkeletonBox width={36} height={20} radius={10} />
            <SkeletonBox width={24} height={24} radius={12} />
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

// ─── Progress ─────────────────────────────────────────────────────────────────
export function ProgressSkeleton() {
  return (
    <SafeAreaView style={s.container}>
      <View style={s.scroll}>
        <SkeletonBox width={160} height={28} radius={8} style={{ marginBottom: 16 }} />

        {/* Stats 2x2 */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={[s.card, { flex: 1, minWidth: "45%", gap: 8 }]}>
              <SkeletonBox width={40} height={40} radius={10} />
              <SkeletonBox width={60} height={22} radius={6} />
              <SkeletonBox width={80} height={12} radius={5} />
            </View>
          ))}
        </View>

        {/* Level card */}
        <View style={s.card}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <SkeletonBox width={44} height={44} radius={12} />
            <View style={{ flex: 1, gap: 6 }}>
              <SkeletonBox width={100} height={16} radius={6} />
              <SkeletonBox width={140} height={12} radius={6} />
            </View>
            <SkeletonBox width={44} height={22} radius={6} />
          </View>
          <SkeletonBox width="100%" height={8} radius={4} style={{ marginBottom: 6 }} />
          <SkeletonBox width={120} height={12} radius={6} />
        </View>

        {/* Scores card */}
        <View style={s.card}>
          <SkeletonBox width={130} height={16} radius={6} style={{ marginBottom: 14 }} />
          {[0, 1].map((i) => (
            <View key={i} style={{ marginBottom: 12, gap: 6 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <SkeletonBox width={110} height={13} radius={5} />
                <SkeletonBox width={40} height={13} radius={5} />
              </View>
              <SkeletonBox width="100%" height={6} radius={3} />
            </View>
          ))}
        </View>

        {/* Topic cards */}
        <SkeletonBox width={120} height={16} radius={6} style={{ marginBottom: 10 }} />
        {[0, 1, 2].map((i) => (
          <View key={i} style={[s.card, { marginBottom: 10 }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <SkeletonBox width={36} height={36} radius={10} />
              <View style={{ flex: 1, gap: 5 }}>
                <SkeletonBox width="60%" height={14} radius={6} />
                <SkeletonBox width="40%" height={12} radius={6} />
              </View>
              <SkeletonBox width={36} height={16} radius={6} />
            </View>
            <SkeletonBox width="100%" height={4} radius={2} />
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

// ─── Review words ─────────────────────────────────────────────────────────────
export function ReviewSkeleton() {
  return (
    <SafeAreaView style={s.container}>
      <View style={s.scroll}>
        <SkeletonBox width={100} height={28} radius={8} style={{ marginBottom: 6 }} />
        <SkeletonBox width={160} height={15} radius={6} style={{ marginBottom: 20 }} />

        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[s.card, { marginBottom: 12, gap: 10 }]}>
            {/* Word + badge */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <SkeletonBox width={130} height={22} radius={8} />
              <SkeletonBox width={50} height={22} radius={11} />
            </View>
            {/* Context sentence */}
            <SkeletonBox width="90%" height={13} radius={6} />
            <SkeletonBox width="70%" height={13} radius={6} />
            {/* Action buttons */}
            <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
              <SkeletonBox width="48%" height={40} radius={10} />
              <SkeletonBox width="48%" height={40} radius={10} />
            </View>
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

// ─── Settings ─────────────────────────────────────────────────────────────────
export function SettingsSkeleton() {
  return (
    <SafeAreaView style={s.container}>
      <View style={s.scroll}>
        <SkeletonBox width={120} height={30} radius={8} style={{ marginBottom: 20 }} />

        {/* Profile card */}
        <View style={[s.card, { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 24 }]}>
          <SkeletonBox width={56} height={56} radius={28} />
          <View style={{ flex: 1, gap: 8 }}>
            <SkeletonBox width={130} height={18} radius={7} />
            <SkeletonBox width={180} height={14} radius={6} />
          </View>
        </View>

        {/* Learning section */}
        <SkeletonBox width={70} height={12} radius={4} style={{ marginBottom: 8, marginLeft: 4 }} />
        <View style={[s.card, { marginBottom: 24, overflow: "hidden" }]}>
          <View style={{ padding: 14, gap: 10 }}>
            <SkeletonBox width={100} height={15} radius={6} />
            <View style={{ flexDirection: "row", gap: 6 }}>
              <SkeletonBox width="31%" height={44} radius={8} />
              <SkeletonBox width="31%" height={44} radius={8} />
              <SkeletonBox width="31%" height={44} radius={8} />
            </View>
          </View>
          <SkeletonBox width="100%" height={1} radius={0} />
          <View style={{ padding: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <SkeletonBox width={130} height={15} radius={6} />
            <SkeletonBox width={80} height={15} radius={6} />
          </View>
        </View>

        {/* Account section */}
        <SkeletonBox width={70} height={12} radius={4} style={{ marginBottom: 8, marginLeft: 4 }} />
        <View style={[s.card, { overflow: "hidden" }]}>
          <View style={{ padding: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <SkeletonBox width={80} height={15} radius={6} />
            <SkeletonBox width={20} height={20} radius={10} />
          </View>
          <SkeletonBox width="100%" height={1} radius={0} />
          <View style={{ padding: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <SkeletonBox width={110} height={15} radius={6} />
            <SkeletonBox width={20} height={20} radius={10} />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ─── Shared styles ─────────────────────────────────────────────────────────────
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
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 14,
    alignItems: "center",
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
