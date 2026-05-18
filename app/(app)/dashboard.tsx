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
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { getDashboard } from "@/lib/api";
import { useAuthStore } from "@/lib/authStore";
import {
  colors,
  fontSize,
  fontWeight,
  borderRadius,
  spacing,
  levelColors,
  shadow,
} from "@/lib/theme";
import {
  getGreeting,
  getDailyQuote,
  formatXP,
  getLevelColor,
} from "@/lib/utils";
import type { Level } from "@/lib/types";

// XP thresholds per level
const XP_THRESHOLDS: Record<Level, number> = {
  A1: 500,
  A2: 1500,
  B1: 5000,
};

export default function DashboardScreen(): React.ReactElement {
  const router = useRouter();
  const { user } = useAuthStore();

  const {
    data,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["dashboard"],
    queryFn: getDashboard,
  });

  const greeting = getGreeting();
  const quote = getDailyQuote();
  const firstName = user?.name?.split(" ")[0] ?? "there";

  if (isLoading) {
    return <LoadingSpinner fullScreen label="Loading dashboard..." />;
  }

  if (isError || !data) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorState}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.muted} />
          <Text style={styles.errorTitle}>Could not load dashboard</Text>
          <Text style={styles.errorSubtitle}>
            Check your connection and try again.
          </Text>
          <Button
            onPress={() => refetch()}
            variant="primary"
            style={{ marginTop: spacing.md }}
            accessibilityLabel="Retry loading dashboard"
          >
            Try again
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  const level = data.level ?? user?.level ?? "A1";
  const xpMax = XP_THRESHOLDS[level as Level];
  const xpProgress = Math.min(data.totalXP / xpMax, 1);
  const levelColor = getLevelColor(level as Level);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.scroll}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              {greeting}, {firstName}
            </Text>
            <Text style={styles.greetingSubtitle}>
              Ready to practice today?
            </Text>
          </View>
          <View style={[styles.levelBadge, { backgroundColor: levelColor }]}>
            <Text style={styles.levelBadgeText}>{level}</Text>
          </View>
        </View>

        {/* Stats Row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statsRow}
        >
          <StatCard
            icon="flame"
            iconColor="#F97316"
            label="Day streak"
            value={`${data.streakCount}`}
          />
          <StatCard
            icon="star"
            iconColor="#F59E0B"
            label="Total XP"
            value={formatXP(data.totalXP)}
          />
          <StatCard
            icon="library"
            iconColor={colors.primary}
            label="Words to review"
            value={`${data.difficultWordsCount}`}
          />
        </ScrollView>

        {/* XP Progress */}
        <Card elevated style={styles.xpCard}>
          <View style={styles.xpCardContent}>
            <ProgressRing
              progress={xpProgress}
              size={90}
              strokeWidth={8}
              color={levelColor}
              label={formatXP(data.totalXP)}
              sublabel="XP"
            />
            <View style={styles.xpInfo}>
              <Text style={styles.xpTitle}>Level {level}</Text>
              <Text style={styles.xpSubtitle}>
                {formatXP(data.totalXP)} / {formatXP(xpMax)} XP to next level
              </Text>
              <View style={styles.xpBar}>
                <View
                  style={[
                    styles.xpBarFill,
                    {
                      width: `${Math.round(xpProgress * 100)}%`,
                      backgroundColor: levelColor,
                    },
                  ]}
                />
              </View>
            </View>
          </View>
        </Card>

        {/* Daily Quote */}
        <Card style={styles.quoteCard}>
          <View style={styles.quoteContent}>
            <Ionicons
              name="sparkles-outline"
              size={20}
              color={colors.primary}
              style={styles.quoteIcon}
            />
            <Text style={styles.quoteText}>{quote}</Text>
          </View>
        </Card>

        {/* CTA */}
        <Button
          onPress={() => router.push("/(app)/topics")}
          size="lg"
          fullWidth
          style={styles.ctaButton}
          accessibilityLabel="Start learning"
        >
          Start Learning
        </Button>

        {/* Topic Progress */}
        {data.topicsProgress.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your topics</Text>
            {data.topicsProgress.slice(0, 4).map((topic) => (
              <TouchableOpacity
                key={topic.topicId}
                style={styles.topicRow}
                onPress={() =>
                  router.push(`/(app)/topics/${topic.topicSlug}`)
                }
                accessibilityLabel={`${topic.topicName} topic, ${topic.lessonsCompleted} of ${topic.totalLessons} lessons completed`}
              >
                <View style={styles.topicRowLeft}>
                  <View style={styles.topicIcon}>
                    <Text style={styles.topicIconEmoji}>{topic.topicIcon}</Text>
                  </View>
                  <View style={styles.topicRowInfo}>
                    <Text style={styles.topicRowName}>{topic.topicName}</Text>
                    <Text style={styles.topicRowStats}>
                      {topic.lessonsCompleted}/{topic.totalLessons} lessons
                    </Text>
                  </View>
                </View>
                <View style={styles.topicRowRight}>
                  <View style={styles.miniProgressTrack}>
                    <View
                      style={[
                        styles.miniProgressFill,
                        {
                          width: `${topic.totalLessons > 0 ? Math.round((topic.lessonsCompleted / topic.totalLessons) * 100) : 0}%`,
                        },
                      ]}
                    />
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={colors.muted}
                  />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

interface StatCardProps {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  iconColor: string;
  label: string;
  value: string;
}

function StatCard({ icon, iconColor, label, value }: StatCardProps) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${iconColor}20` }]}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },
  greeting: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  greetingSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  levelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
  },
  levelBadgeText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  statsRow: {
    gap: 10,
    paddingRight: spacing.md,
    marginBottom: spacing.md,
  },
  statCard: {
    width: 110,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: "center",
  },
  xpCard: {
    marginBottom: spacing.md,
  },
  xpCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  xpInfo: {
    flex: 1,
  },
  xpTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: 4,
  },
  xpSubtitle: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  xpBar: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    overflow: "hidden",
  },
  xpBarFill: {
    height: "100%",
    borderRadius: borderRadius.full,
  },
  quoteCard: {
    marginBottom: spacing.md,
    backgroundColor: colors.primaryBg,
    borderColor: "transparent",
  },
  quoteContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  quoteIcon: {
    marginTop: 2,
  },
  quoteText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.primaryDark,
    fontStyle: "italic",
    lineHeight: 22,
  },
  ctaButton: {
    marginBottom: spacing.lg,
    ...shadow.md,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  topicRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  topicRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  topicIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryBg,
    alignItems: "center",
    justifyContent: "center",
  },
  topicIconEmoji: {
    fontSize: 20,
  },
  topicRowInfo: {
    flex: 1,
  },
  topicRowName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  topicRowStats: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  topicRowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  miniProgressTrack: {
    width: 60,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    overflow: "hidden",
  },
  miniProgressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
  },
  errorState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  errorTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: 6,
  },
  errorSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
