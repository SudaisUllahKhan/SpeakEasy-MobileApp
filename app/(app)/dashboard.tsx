import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/ui/Button";
import { DashboardSkeleton } from "@/components/ui/SkeletonLoader";
import { getDashboard } from "@/lib/api";
import { useAuthStore } from "@/lib/authStore";
import {
  colors,
  fontSize,
  fontWeight,
  borderRadius,
  spacing,
  shadow,
} from "@/lib/theme";
import {
  getGreeting,
  getDailyQuote,
  formatXP,
  getLevelColor,
} from "@/lib/utils";
import type { Level } from "@/lib/types";

const XP_THRESHOLDS: Record<Level, number> = {
  A1: 500,
  A2: 1500,
  B1: 5000,
};

// Unique color per topic slug
const TOPIC_PALETTE: Record<string, { bg: string; iconColor: string }> = {
  "greetings":      { bg: "#FFF7ED", iconColor: "#F97316" },
  "daily-routine":  { bg: "#EFF6FF", iconColor: "#3B82F6" },
  "family":         { bg: "#FFF1F2", iconColor: "#F43F5E" },
  "food-drink":     { bg: "#F0FDF4", iconColor: "#22C55E" },
  "school-work":    { bg: "#EEF2FF", iconColor: "#6366F1" },
  "travel":         { bg: "#FDF4FF", iconColor: "#A855F7" },
  "hobbies":        { bg: "#FFFBEB", iconColor: "#D97706" },
  "health":         { bg: "#ECFDF5", iconColor: "#10B981" },
  "technology":     { bg: "#F0F9FF", iconColor: "#0EA5E9" },
  "environment":    { bg: "#F7FEE7", iconColor: "#65A30D" },
};

const FALLBACK_PALETTE = [
  { bg: "#FFF7ED", iconColor: "#F97316" },
  { bg: "#EFF6FF", iconColor: "#3B82F6" },
  { bg: "#F0FDF4", iconColor: "#22C55E" },
  { bg: "#EEF2FF", iconColor: "#6366F1" },
];

function getTopicPalette(slug: string, idx: number) {
  return TOPIC_PALETTE[slug] ?? FALLBACK_PALETTE[idx % FALLBACK_PALETTE.length];
}

export default function DashboardScreen(): React.ReactElement {
  const router = useRouter();
  const { user } = useAuthStore();

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["dashboard"],
    queryFn: getDashboard,
  });

  const greeting = getGreeting();
  const quote = getDailyQuote();
  const rawName = user?.name?.trim();
  const firstName = rawName
    ? rawName.split(" ")[0]
    : (user?.email?.split("@")[0] ?? "");

  if (isLoading) return <DashboardSkeleton />;

  if (isError || !data) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorState}>
          <View style={styles.errorIconWrap}>
            <Ionicons name="cloud-offline-outline" size={32} color={colors.primary} />
          </View>
          <Text style={styles.errorTitle}>Could not load dashboard</Text>
          <Text style={styles.errorSubtitle}>Check your connection and try again.</Text>
          <Button onPress={() => refetch()} variant="primary" style={{ marginTop: spacing.md }}>
            Try again
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  const level = (data.level ?? user?.level ?? "A1") as Level;
  const xpMax = XP_THRESHOLDS[level];
  const xpProgress = Math.min(data.totalXP / xpMax, 1);
  const levelColor = getLevelColor(level);
  const xpPct = Math.round(xpProgress * 100);

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.white}
          />
        }
        contentContainerStyle={styles.scroll}
        bounces
      >
        {/* ── Hero Banner ────────────────────────────────────────────── */}
        <SafeAreaView edges={["top"]} style={styles.hero}>
          {/* Decorative circles */}
          <View style={styles.decCircle1} />
          <View style={styles.decCircle2} />

          {/* Greeting row */}
          <View style={styles.heroTop}>
            <View style={styles.heroGreetingBlock}>
              <Text style={styles.heroGreeting}>
                {greeting}{firstName ? `, ${firstName}` : ""}
              </Text>
              <Text style={styles.heroSub}>Ready to practice today?</Text>
            </View>
            <View style={[styles.levelPill, { backgroundColor: levelColor }]}>
              <Text style={styles.levelPillText}>{level}</Text>
            </View>
          </View>

          {/* Hero stats row */}
          <View style={styles.heroStats}>
            <HeroStat icon="flame" color="#FF9500" value={`${data.streakCount}`} label="Streak" />
            <View style={styles.heroStatDivider} />
            <HeroStat icon="star" color="#FFD60A" value={formatXP(data.totalXP)} label="Total XP" />
            <View style={styles.heroStatDivider} />
            <HeroStat icon="library" color="#BFB0FF" value={`${data.difficultWordsCount}`} label="To Review" />
          </View>
        </SafeAreaView>

        {/* ── Content area ───────────────────────────────────────────── */}
        <View style={styles.content}>

          {/* XP Progress Card */}
          <View style={styles.xpCard}>
            <View style={styles.xpCardHeader}>
              <View>
                <Text style={styles.xpCardLabel}>LEVEL PROGRESS</Text>
                <Text style={styles.xpCardLevel}>Level {level}</Text>
              </View>
              <View style={[styles.xpPctBadge, { backgroundColor: `${levelColor}20` }]}>
                <Text style={[styles.xpPctText, { color: levelColor }]}>{xpPct}%</Text>
              </View>
            </View>
            <View style={styles.xpBarTrack}>
              <View
                style={[
                  styles.xpBarFill,
                  { width: `${xpPct}%`, backgroundColor: levelColor },
                ]}
              />
            </View>
            <Text style={styles.xpCardFooter}>
              <Text style={[styles.xpVal, { color: levelColor }]}>{formatXP(data.totalXP)}</Text>
              <Text style={styles.xpMax}> / {formatXP(xpMax)} XP to next level</Text>
            </Text>
          </View>

          {/* Quote card */}
          <View style={styles.quoteCard}>
            <Ionicons name="sparkles" size={16} color={colors.primary} style={styles.quoteIcon} />
            <Text style={styles.quoteText}>{quote}</Text>
          </View>

          {/* CTA */}
          <TouchableOpacity
            style={styles.ctaBtn}
            onPress={() => router.push("/(app)/topics")}
            activeOpacity={0.85}
          >
            <Ionicons name="play" size={20} color={colors.white} style={{ marginRight: 8 }} />
            <Text style={styles.ctaBtnText}>Start Learning</Text>
            <Ionicons name="arrow-forward" size={18} color="rgba(255,255,255,0.7)" style={{ marginLeft: 6 }} />
          </TouchableOpacity>

          {/* Topic Progress */}
          {data.topicsProgress.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Your Topics</Text>
                <TouchableOpacity onPress={() => router.push("/(app)/topics")}>
                  <Text style={styles.sectionLink}>See all</Text>
                </TouchableOpacity>
              </View>
              {data.topicsProgress.slice(0, 5).map((topic, idx) => {
                const palette = getTopicPalette(topic.topicSlug, idx);
                const pct = topic.totalLessons > 0
                  ? Math.round((topic.lessonsCompleted / topic.totalLessons) * 100)
                  : 0;
                const done = topic.lessonsCompleted === topic.totalLessons && topic.totalLessons > 0;
                return (
                  <TouchableOpacity
                    key={topic.topicId}
                    style={styles.topicCard}
                    onPress={() => router.push(`/(app)/topics/${topic.topicSlug}`)}
                    activeOpacity={0.8}
                    accessibilityLabel={`${topic.topicName}, ${topic.lessonsCompleted} of ${topic.totalLessons} lessons`}
                  >
                    {/* Icon */}
                    <View style={[styles.topicIconBox, { backgroundColor: palette.bg }]}>
                      <Text style={styles.topicEmoji}>{topic.topicIcon}</Text>
                    </View>

                    {/* Info */}
                    <View style={styles.topicInfo}>
                      <View style={styles.topicInfoRow}>
                        <Text style={styles.topicName} numberOfLines={1}>{topic.topicName}</Text>
                        {done && (
                          <View style={styles.doneChip}>
                            <Ionicons name="checkmark" size={10} color="#22C55E" />
                            <Text style={styles.doneText}>Done</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.topicMeta}>
                        <View style={styles.topicProgressTrack}>
                          <View
                            style={[
                              styles.topicProgressFill,
                              { width: `${pct}%`, backgroundColor: palette.iconColor },
                            ]}
                          />
                        </View>
                        <Text style={styles.topicLessons}>
                          {topic.lessonsCompleted}/{topic.totalLessons}
                        </Text>
                      </View>
                    </View>

                    {/* Arrow */}
                    <View style={[styles.topicArrow, { backgroundColor: palette.bg }]}>
                      <Ionicons name="chevron-forward" size={14} color={palette.iconColor} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

interface HeroStatProps {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  color: string;
  value: string;
  label: string;
}

function HeroStat({ icon, color, value, label }: HeroStatProps) {
  return (
    <View style={styles.heroStatItem}>
      <Ionicons name={icon} size={18} color={color} style={styles.heroStatIcon} />
      <Text style={styles.heroStatValue}>{value}</Text>
      <Text style={styles.heroStatLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    paddingBottom: spacing.xl + 16,
  },

  // ── Hero ──────────────────────────────────────────────────────────
  hero: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingBottom: 28,
    overflow: "hidden",
  },
  decCircle1: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(255,255,255,0.06)",
    top: -60,
    right: -50,
  },
  decCircle2: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(255,255,255,0.04)",
    bottom: -30,
    left: -20,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: spacing.sm,
    marginBottom: 20,
  },
  heroGreetingBlock: {
    flex: 1,
    marginRight: 12,
  },
  heroGreeting: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.extrabold,
    color: colors.white,
    letterSpacing: -0.3,
  },
  heroSub: {
    fontSize: fontSize.sm,
    color: "rgba(255,255,255,0.72)",
    marginTop: 3,
  },
  levelPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  levelPillText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.extrabold,
    color: colors.white,
    letterSpacing: 0.5,
  },

  // Hero stats
  heroStats: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: borderRadius.xl,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  heroStatItem: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  heroStatIcon: {
    marginBottom: 2,
  },
  heroStatValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.extrabold,
    color: colors.white,
    letterSpacing: -0.5,
  },
  heroStatLabel: {
    fontSize: 10,
    fontWeight: fontWeight.medium,
    color: "rgba(255,255,255,0.65)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  heroStatDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.18)",
    marginVertical: 4,
  },

  // ── Content ───────────────────────────────────────────────────────
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },

  // XP card
  xpCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
  },
  xpCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  xpCardLabel: {
    fontSize: 10,
    fontWeight: fontWeight.semibold,
    color: colors.muted,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  xpCardLevel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.extrabold,
    color: colors.text,
  },
  xpPctBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
  },
  xpPctText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.extrabold,
  },
  xpBarTrack: {
    height: 8,
    backgroundColor: "#F3F0FF",
    borderRadius: borderRadius.full,
    overflow: "hidden",
    marginBottom: 10,
  },
  xpBarFill: {
    height: "100%",
    borderRadius: borderRadius.full,
  },
  xpCardFooter: {
    fontSize: fontSize.xs,
  },
  xpVal: {
    fontWeight: fontWeight.bold,
  },
  xpMax: {
    color: colors.textSecondary,
  },

  // Quote
  quoteCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.primaryBg,
    borderRadius: borderRadius.lg,
    padding: 14,
    marginBottom: spacing.md,
    gap: 10,
  },
  quoteIcon: {
    marginTop: 1,
    flexShrink: 0,
  },
  quoteText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.primaryDark,
    fontStyle: "italic",
    lineHeight: 20,
  },

  // CTA button
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    paddingVertical: 17,
    marginBottom: spacing.lg,
    ...shadow.md,
  },
  ctaBtnText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.extrabold,
    color: colors.white,
    letterSpacing: 0.3,
  },

  // Topics section
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.extrabold,
    color: colors.text,
    letterSpacing: -0.2,
  },
  sectionLink: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  topicCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 14,
    ...shadow.sm,
  },
  topicIconBox: {
    width: 46,
    height: 46,
    borderRadius: borderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  topicEmoji: {
    fontSize: 22,
  },
  topicInfo: {
    flex: 1,
    gap: 6,
  },
  topicInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  topicName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    flex: 1,
  },
  doneChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  doneText: {
    fontSize: 10,
    fontWeight: fontWeight.semibold,
    color: "#22C55E",
  },
  topicMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  topicProgressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: "#F3F0FF",
    borderRadius: borderRadius.full,
    overflow: "hidden",
  },
  topicProgressFill: {
    height: "100%",
    borderRadius: borderRadius.full,
  },
  topicLessons: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    minWidth: 28,
    textAlign: "right",
  },
  topicArrow: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  // Error
  errorState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  errorIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryBg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  errorTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: 6,
  },
  errorSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
