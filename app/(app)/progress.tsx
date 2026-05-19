import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "@/components/ui/Card";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { ProgressSkeleton } from "@/components/ui/SkeletonLoader";
import { Button } from "@/components/ui/Button";
import { getProgress } from "@/lib/api";
import { useAuthStore } from "@/lib/authStore";
import {
  colors,
  fontSize,
  fontWeight,
  borderRadius,
  spacing,
  shadow,
  levelColors,
} from "@/lib/theme";
import { formatXP, getLevelColor } from "@/lib/utils";
import type { Level } from "@/lib/types";

const XP_THRESHOLDS: Record<Level, number> = {
  A1: 500,
  A2: 1500,
  B1: 5000,
};

export default function ProgressScreen(): React.ReactElement {
  const { user } = useAuthStore();
  const {
    data,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["progress"],
    queryFn: getProgress,
  });

  if (isLoading) {
    return <ProgressSkeleton />;
  }

  if (isError || !data) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorState}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.muted} />
          <Text style={styles.errorTitle}>Could not load progress</Text>
          <Button
            onPress={() => refetch()}
            style={{ marginTop: spacing.md }}
            accessibilityLabel="Retry loading progress"
          >
            Try again
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  const level = (data.level ?? user?.level ?? "A1") as Level;
  const levelColor = getLevelColor(level);
  const xpMax = XP_THRESHOLDS[level];
  const xpProgress = Math.min(data.totalXP / xpMax, 1);

  // Compute average scores across all topics
  const topicsWithScores = data.topicsProgress.filter(
    (t) => t.lessonsCompleted > 0
  );
  const avgPron =
    topicsWithScores.length > 0
      ? topicsWithScores.reduce((s, t) => s + t.avgPronunciation, 0) /
        topicsWithScores.length
      : 0;

  const totalLessons = data.topicsProgress.reduce(
    (s, t) => s + t.lessonsCompleted,
    0
  );

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
        <Text style={styles.pageTitle}>My Progress</Text>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            icon="flame"
            iconColor="#F97316"
            label="Day Streak"
            value={`${data.streakCount}`}
          />
          <StatCard
            icon="school-outline"
            iconColor={colors.primary}
            label="Lessons Done"
            value={`${totalLessons}`}
          />
          <StatCard
            icon="star"
            iconColor="#F59E0B"
            label="Total XP"
            value={formatXP(data.totalXP)}
          />
          <StatCard
            icon="time-outline"
            iconColor={colors.success}
            label="Words to Review"
            value={`${data.difficultWordsCount}`}
          />
        </View>

        {/* Level + XP */}
        <Card elevated style={styles.levelCard}>
          <View style={styles.levelCardHeader}>
            <View style={[styles.levelBadge, { backgroundColor: levelColor }]}>
              <Text style={styles.levelBadgeText}>{level}</Text>
            </View>
            <View style={styles.levelCardInfo}>
              <Text style={styles.levelCardTitle}>Level {level}</Text>
              <Text style={styles.levelCardSubtitle}>
                {formatXP(data.totalXP)} / {formatXP(xpMax)} XP
              </Text>
            </View>
            <Text style={styles.levelCardPercent}>
              {Math.round(xpProgress * 100)}%
            </Text>
          </View>
          <View style={styles.xpBarTrack}>
            <View
              style={[
                styles.xpBarFill,
                { width: `${Math.round(xpProgress * 100)}%`, backgroundColor: levelColor },
              ]}
            />
          </View>
          <Text style={styles.xpBarHint}>
            {formatXP(xpMax - data.totalXP)} XP to next level
          </Text>
        </Card>

        {/* Average scores */}
        {topicsWithScores.length > 0 && (
          <Card style={styles.scoresCard}>
            <Text style={styles.sectionTitle}>Average scores</Text>
            <ScoreBar label="Pronunciation" score={avgPron} />
            <ScoreBar label="Lessons completed" score={totalLessons} maxScore={30} />
          </Card>
        )}

        {/* Topic breakdown */}
        {data.topicsProgress.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Topic progress</Text>
            {data.topicsProgress.map((topic) => {
              const progress =
                topic.totalLessons > 0
                  ? topic.lessonsCompleted / topic.totalLessons
                  : 0;
              return (
                <Card key={topic.topicId} style={styles.topicCard}>
                  <View style={styles.topicCardHeader}>
                    <View style={styles.topicCardIcon}>
                      <Text style={styles.topicCardEmoji}>{topic.topicIcon}</Text>
                    </View>
                    <View style={styles.topicCardInfo}>
                      <Text style={styles.topicCardName}>{topic.topicName}</Text>
                      <Text style={styles.topicCardStats}>
                        {topic.lessonsCompleted} / {topic.totalLessons} lessons
                      </Text>
                    </View>
                    <Text style={styles.topicCardPercent}>
                      {Math.round(progress * 100)}%
                    </Text>
                  </View>
                  <View style={styles.topicProgressTrack}>
                    <View
                      style={[
                        styles.topicProgressFill,
                        { width: `${Math.round(progress * 100)}%` },
                      ]}
                    />
                  </View>
                </Card>
              );
            })}
          </View>
        )}

        {/* Empty state */}
        {data.topicsProgress.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="book-outline" size={48} color={colors.muted} />
            <Text style={styles.emptyTitle}>No progress yet</Text>
            <Text style={styles.emptySubtitle}>
              Complete your first lesson to see progress here.
            </Text>
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
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  pageTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 14,
    alignItems: "flex-start",
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
    marginBottom: 10,
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  levelCard: {
    marginBottom: spacing.md,
  },
  levelCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  levelBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  levelBadgeText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  levelCardInfo: {
    flex: 1,
  },
  levelCardTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  levelCardSubtitle: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  levelCardPercent: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  xpBarTrack: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    overflow: "hidden",
    marginBottom: 6,
  },
  xpBarFill: {
    height: "100%",
    borderRadius: borderRadius.full,
  },
  xpBarHint: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  scoresCard: {
    marginBottom: spacing.md,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  topicCard: {
    marginBottom: 10,
  },
  topicCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  topicCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primaryBg,
    alignItems: "center",
    justifyContent: "center",
  },
  topicCardEmoji: {
    fontSize: 18,
  },
  topicCardInfo: {
    flex: 1,
  },
  topicCardName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  topicCardStats: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  topicCardPercent: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  topicProgressTrack: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    overflow: "hidden",
  },
  topicProgressFill: {
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
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
});
