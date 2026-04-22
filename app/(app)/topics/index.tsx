import React from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/Button";
import { getTopics } from "@/lib/api";
import {
  colors,
  fontSize,
  fontWeight,
  borderRadius,
  spacing,
  shadow,
} from "@/lib/theme";
import type { Topic } from "@/lib/types";

// Gradient header colors per topic (cycled)
const HEADER_GRADIENTS = [
  ["#7C3AED", "#A78BFA"],
  ["#F97316", "#FDBA74"],
  ["#10B981", "#6EE7B7"],
  ["#3B82F6", "#93C5FD"],
  ["#EC4899", "#F9A8D4"],
  ["#F59E0B", "#FDE68A"],
  ["#8B5CF6", "#C4B5FD"],
  ["#06B6D4", "#67E8F9"],
  ["#EF4444", "#FCA5A5"],
  ["#84CC16", "#BEF264"],
];

export default function TopicsScreen(): React.ReactElement {
  const router = useRouter();

  const { data: topics, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["topics"],
    queryFn: getTopics,
  });

  if (isLoading) {
    return <LoadingSpinner fullScreen label="Loading topics..." />;
  }

  if (isError || !topics) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorState}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.muted} />
          <Text style={styles.errorTitle}>Could not load topics</Text>
          <Text style={styles.errorSubtitle}>
            Check your connection and try again.
          </Text>
          <Button
            onPress={() => refetch()}
            variant="primary"
            style={{ marginTop: spacing.md }}
            accessibilityLabel="Retry loading topics"
          >
            Try again
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  if (topics.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="book-outline" size={48} color={colors.muted} />
          <Text style={styles.emptyTitle}>No topics yet</Text>
          <Text style={styles.emptySubtitle}>
            Topics will appear here once they are published.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Topics</Text>
        <Text style={styles.subtitle}>
          {topics.length} topic{topics.length !== 1 ? "s" : ""} available
        </Text>
      </View>

      <FlatList
        data={topics}
        keyExtractor={(item) => item.id}
        numColumns={2}
        renderItem={({ item, index }) => (
          <TopicCard
            topic={item}
            colorPair={HEADER_GRADIENTS[index % HEADER_GRADIENTS.length]}
            onPress={() => router.push(`/(app)/topics/${item.slug}`)}
          />
        )}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
      />
    </SafeAreaView>
  );
}

interface TopicCardProps {
  topic: Topic;
  colorPair: string[];
  onPress: () => void;
}

function TopicCard({ topic, colorPair, onPress }: TopicCardProps) {
  const completed = topic.completedCount ?? 0;
  const total = topic.lessonsCount ?? 0;
  const progress = total > 0 ? completed / total : 0;

  return (
    <TouchableOpacity
      style={styles.topicCard}
      onPress={onPress}
      accessibilityLabel={`${topic.name} topic. ${completed} of ${total} lessons completed.`}
      activeOpacity={0.85}
    >
      {/* Gradient Header */}
      <View
        style={[
          styles.topicCardHeader,
          { backgroundColor: colorPair[0] },
        ]}
      >
        <Text style={styles.topicCardEmoji}>{topic.icon}</Text>
        {completed === total && total > 0 && (
          <View style={styles.completedBadge}>
            <Ionicons name="checkmark" size={12} color={colors.white} />
          </View>
        )}
      </View>

      <View style={styles.topicCardBody}>
        <Text style={styles.topicCardName} numberOfLines={2}>
          {topic.name}
        </Text>
        <Text style={styles.topicCardStats}>
          {completed}/{total} lessons
        </Text>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.round(progress * 100)}%`,
                backgroundColor: colorPair[0],
              },
            ]}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  grid: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  row: {
    gap: 12,
    marginBottom: 12,
  },
  topicCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
  },
  topicCardHeader: {
    height: 80,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  topicCardEmoji: {
    fontSize: 36,
  },
  completedBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.success,
    alignItems: "center",
    justifyContent: "center",
  },
  topicCardBody: {
    padding: 12,
  },
  topicCardName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: 4,
    lineHeight: 20,
  },
  topicCardStats: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  progressTrack: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
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
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
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
  },
});
