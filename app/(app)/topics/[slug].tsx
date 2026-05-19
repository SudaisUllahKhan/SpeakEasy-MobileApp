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
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { TopicDetailSkeleton } from "@/components/ui/SkeletonLoader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { getTopicLessons } from "@/lib/api";
import {
  colors,
  fontSize,
  fontWeight,
  borderRadius,
  spacing,
  shadow,
} from "@/lib/theme";
import type { LessonWithStatus, Level } from "@/lib/types";

type LevelBadgeVariant = "a1" | "a2" | "b1";

const LEVEL_BADGE: Record<Level, LevelBadgeVariant> = {
  A1: "a1",
  A2: "a2",
  B1: "b1",
};

export default function TopicDetailScreen(): React.ReactElement {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();

  const {
    data,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["topic", slug],
    queryFn: () => getTopicLessons(slug!),
    enabled: !!slug,
  });

  // Refetch every time the screen gains focus so lesson lock status stays fresh
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch])
  );

  if (isLoading) {
    return <TopicDetailSkeleton />;
  }

  if (isError || !data) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorState}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.muted} />
          <Text style={styles.errorTitle}>Could not load lessons</Text>
          <Button
            onPress={() => refetch()}
            variant="primary"
            style={{ marginTop: spacing.md }}
            accessibilityLabel="Retry loading lessons"
          >
            Try again
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  const { topic, lessons } = data;
  const completed = lessons.filter((l) => l.status === "completed").length;
  const total = lessons.length;
  const progress = total > 0 ? completed / total : 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Hero Header */}
      <View style={styles.hero}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          accessibilityLabel="Go back to topics"
        >
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.heroEmoji}>{topic.icon}</Text>
        <Text style={styles.heroTitle}>{topic.name}</Text>
        <Text style={styles.heroStats}>
          {completed} of {total} lessons completed
        </Text>

        {/* Progress bar */}
        <View style={styles.heroProgressTrack}>
          <View
            style={[
              styles.heroProgressFill,
              { width: `${Math.round(progress * 100)}%` },
            ]}
          />
        </View>
      </View>

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
        {lessons.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="book-outline" size={48} color={colors.muted} />
            <Text style={styles.emptyTitle}>No lessons yet</Text>
            <Text style={styles.emptySubtitle}>
              Lessons for your level will appear here once published.
            </Text>
          </View>
        ) : (
          lessons.map((lesson, index) => (
            <LessonRow
              key={lesson.id}
              lesson={lesson}
              number={index + 1}
              onPress={() =>
                router.push(`/(app)/lessons/${lesson.slug}`)
              }
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

interface LessonRowProps {
  lesson: LessonWithStatus;
  number: number;
  onPress: () => void;
}

function LessonRow({ lesson, number, onPress }: LessonRowProps) {
  const isLocked = lesson.status === "locked";
  const isCompleted = lesson.status === "completed";
  const isAvailable = lesson.status === "available";

  return (
    <TouchableOpacity
      style={[
        styles.lessonRow,
        isLocked && styles.lessonRowLocked,
        isCompleted && styles.lessonRowCompleted,
      ]}
      onPress={isLocked ? undefined : onPress}
      disabled={isLocked}
      accessibilityLabel={`${lesson.title}. ${
        isLocked ? "Locked" : isCompleted ? "Completed" : "Available"
      }. Level ${lesson.level}.`}
      activeOpacity={isLocked ? 1 : 0.8}
    >
      {/* Status Icon */}
      <View
        style={[
          styles.lessonStatus,
          isCompleted && styles.lessonStatusCompleted,
          isAvailable && styles.lessonStatusAvailable,
          isLocked && styles.lessonStatusLocked,
        ]}
      >
        {isCompleted ? (
          <Ionicons name="checkmark" size={18} color={colors.white} />
        ) : isLocked ? (
          <Ionicons name="lock-closed" size={16} color={colors.muted} />
        ) : (
          <Text style={styles.lessonNumber}>{number}</Text>
        )}
      </View>

      {/* Content */}
      <View style={styles.lessonContent}>
        <View style={styles.lessonContentTop}>
          <Text
            style={[styles.lessonTitle, isLocked && styles.lessonTitleLocked]}
            numberOfLines={2}
          >
            {lesson.title}
          </Text>
          <Badge variant={LEVEL_BADGE[lesson.level]}>
            {lesson.level}
          </Badge>
        </View>

        {isCompleted && (
          <View style={styles.lessonScores}>
            {lesson.bestPronunciation !== undefined && (
              <ScoreChip
                icon="mic-outline"
                value={lesson.bestPronunciation}
                label="Pron"
              />
            )}
            {lesson.bestFluency !== undefined && (
              <ScoreChip
                icon="speedometer-outline"
                value={lesson.bestFluency}
                label="Fluency"
              />
            )}
            {lesson.bestComprehension !== undefined && (
              <ScoreChip
                icon="help-circle-outline"
                value={lesson.bestComprehension}
                label="Comp"
              />
            )}
          </View>
        )}
      </View>

      {!isLocked && (
        <Ionicons
          name="chevron-forward"
          size={20}
          color={isCompleted ? colors.success : colors.primary}
        />
      )}
    </TouchableOpacity>
  );
}

interface ScoreChipProps {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  value: number;
  label: string;
}

function ScoreChip({ icon, value, label }: ScoreChipProps) {
  return (
    <View style={styles.scoreChip}>
      <Ionicons name={icon} size={12} color={colors.success} />
      <Text style={styles.scoreChipText}>{value.toFixed(1)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  hero: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  backBtn: {
    marginBottom: spacing.sm,
    alignSelf: "flex-start",
    padding: 4,
  },
  heroEmoji: {
    fontSize: 44,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.white,
    marginBottom: 4,
  },
  heroStats: {
    fontSize: fontSize.sm,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 12,
  },
  heroProgressTrack: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: borderRadius.full,
    overflow: "hidden",
  },
  heroProgressFill: {
    height: "100%",
    backgroundColor: colors.white,
    borderRadius: borderRadius.full,
  },
  scroll: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  lessonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
  },
  lessonRowLocked: {
    opacity: 0.6,
  },
  lessonRowCompleted: {
    borderColor: "#BBF7D0",
    backgroundColor: "#F0FDF4",
  },
  lessonStatus: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  lessonStatusCompleted: {
    backgroundColor: colors.success,
  },
  lessonStatusAvailable: {
    backgroundColor: colors.primary,
  },
  lessonStatusLocked: {
    backgroundColor: colors.border,
  },
  lessonNumber: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  lessonContent: {
    flex: 1,
  },
  lessonContentTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 4,
  },
  lessonTitle: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    lineHeight: 20,
  },
  lessonTitleLocked: {
    color: colors.muted,
  },
  lessonScores: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  scoreChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.successBg,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  scoreChipText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.success,
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
    justifyContent: "center",
    padding: spacing.xxl,
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
