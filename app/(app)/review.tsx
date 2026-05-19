import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import * as Speech from "expo-speech";
import { ReviewSkeleton } from "@/components/ui/SkeletonLoader";
import { Button } from "@/components/ui/Button";
import { getReviewWords, submitReviewResult } from "@/lib/api";
import { useAuthStore } from "@/lib/authStore";
import { colors, fontSize, fontWeight, borderRadius, spacing, shadow } from "@/lib/theme";
import type { DifficultWord } from "@/lib/types";

function getDifficultyColor(word: DifficultWord): string {
  if (word.timesCorrect === 0 && word.timesIncorrect === 0) return "#3B82F6";
  if (word.timesIncorrect > word.timesCorrect) return "#EF4444";
  if (word.timesIncorrect > 0) return "#F97316";
  return "#10B981";
}

function getDifficultyLabel(word: DifficultWord): string {
  if (word.timesCorrect === 0 && word.timesIncorrect === 0) return "New";
  if (word.timesIncorrect > word.timesCorrect) return "Hard";
  if (word.timesIncorrect > 0) return "Practice";
  return "Good";
}

export default function ReviewScreen(): React.ReactElement {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const [markedResults, setMarkedResults] = useState<Record<string, boolean>>({});

  const { data: words, isLoading, isError, refetch } = useQuery({
    queryKey: ["review-words"],
    queryFn: getReviewWords,
    enabled: isAuthenticated,
    retry: 2,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const submitMutation = useMutation({
    mutationFn: ({ wordId, isCorrect }: { wordId: string; isCorrect: boolean }) =>
      submitReviewResult(wordId, isCorrect),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["progress"] });
    },
  });

  const handleMark = (word: DifficultWord, isCorrect: boolean) => {
    setMarkedResults((prev) => ({ ...prev, [word.id]: isCorrect }));
    submitMutation.mutate({ wordId: word.id, isCorrect });
  };

  const handleRetry = () => {
    queryClient.removeQueries({ queryKey: ["review-words"] });
    void refetch();
  };

  if (isLoading) return <ReviewSkeleton />;

  if (isError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.muted} />
          <Text style={styles.errorTitle}>Could not load review words</Text>
          <Button onPress={handleRetry} style={{ marginTop: spacing.md }}>Try again</Button>
        </View>
      </SafeAreaView>
    );
  }

  if (!words || words.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Word Review</Text>
        </View>
        <View style={styles.centered}>
          <View style={styles.emptyIconBg}>
            <Ionicons name="checkmark-circle" size={48} color={colors.success} />
          </View>
          <Text style={styles.emptyTitle}>All caught up!</Text>
          <Text style={styles.emptySubtitle}>
            No words due for review today. Keep practicing lessons to build your vocabulary.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const total = words.length;
  const markedCount = Object.keys(markedResults).length;
  const correctCount = Object.values(markedResults).filter(Boolean).length;
  const progress = total > 0 ? markedCount / total : 0;
  const allDone = markedCount === total;


  const renderWordCard = (word: DifficultWord) => {
    const isMarked = word.id in markedResults;
    const gotIt = markedResults[word.id];
    const diffColor = getDifficultyColor(word);
    const diffLabel = getDifficultyLabel(word);

    return (
      <View key={word.id} style={[styles.wordCard, { borderLeftColor: diffColor }, isMarked && styles.wordCardMarked]}>
        <View style={styles.cardTop}>
          <View style={styles.wordInfo}>
            <View style={styles.wordRow}>
              <Text style={[styles.wordText, isMarked && styles.wordTextFaded]}>{word.word}</Text>
              <View style={[styles.diffBadge, { backgroundColor: diffColor + "22" }]}>
                <Text style={[styles.diffBadgeText, { color: diffColor }]}>{diffLabel}</Text>
              </View>
            </View>
            {word.phonetic ? <Text style={styles.phoneticText}>[{word.phonetic}]</Text> : null}
            <View style={styles.miniStats}>
              <Ionicons name="checkmark-circle" size={11} color={colors.success} />
              <Text style={[styles.miniStatText, { color: colors.success }]}>{word.timesCorrect}</Text>
              <Ionicons name="close-circle" size={11} color={colors.danger} style={{ marginLeft: 6 }} />
              <Text style={[styles.miniStatText, { color: colors.danger }]}>{word.timesIncorrect}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.hearBtn}
            onPress={() => Speech.speak(word.word, { language: "en-US" })}
            accessibilityLabel={`Hear ${word.word}`}
          >
            <Ionicons name="volume-high" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {isMarked ? (
          <View style={styles.markedRow}>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <Text style={styles.markedText}>Got it — great!</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.gotBtn} onPress={() => handleMark(word, true)}>
            <Ionicons name="checkmark" size={15} color={colors.white} />
            <Text style={styles.gotText}>Got it!</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderSection = (title: string, sectionWords: DifficultWord[], color: string) => {
    if (sectionWords.length === 0) return null;
    return (
      <View style={styles.section} key={title}>
        <View style={[styles.sectionHeader, { borderLeftColor: color }]}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <View style={[styles.sectionBadge, { backgroundColor: color + "22" }]}>
            <Text style={[styles.sectionBadgeText, { color }]}>{sectionWords.length}</Text>
          </View>
        </View>
        {sectionWords.map(renderWordCard)}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Word Review</Text>
          <Text style={styles.headerSubtitle}>{markedCount} of {total} reviewed</Text>
        </View>
        <View style={[styles.progressRing, { borderColor: progress === 1 ? colors.success : colors.primary }]}>
          <Text style={[styles.progressRingText, { color: progress === 1 ? colors.success : colors.primary }]}>
            {Math.round(progress * 100)}%
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBg}>
        <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: progress === 1 ? colors.success : colors.primary }]} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {words.map(renderWordCard)}

        {allDone && (
          <View style={styles.doneCard}>
            <Text style={styles.doneEmoji}>🎉</Text>
            <Text style={styles.doneTitle}>Session Complete!</Text>
            <Text style={styles.doneSubtitle}>{correctCount} of {total} marked "Got it!" — great work!</Text>
            <Button onPress={handleRetry} fullWidth style={{ marginTop: spacing.md }}>Review more</Button>
          </View>
        )}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  errorTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, marginTop: spacing.md },
  emptyIconBg: { width: 96, height: 96, borderRadius: 48, backgroundColor: "#DCFCE7", alignItems: "center", justifyContent: "center", marginBottom: spacing.md },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text, marginBottom: 8 },
  emptySubtitle: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: "center", lineHeight: 22 },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm },
  headerTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  headerSubtitle: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  progressRing: { width: 52, height: 52, borderRadius: 26, borderWidth: 3, alignItems: "center", justifyContent: "center" },
  progressRingText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },

  progressBg: { height: 6, backgroundColor: colors.border, marginHorizontal: spacing.md, borderRadius: borderRadius.full, overflow: "hidden", marginBottom: spacing.sm },
  progressFill: { height: "100%", borderRadius: borderRadius.full },

  statsStrip: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, marginHorizontal: spacing.md, borderRadius: borderRadius.lg, padding: spacing.sm, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  stripItem: { flex: 1, alignItems: "center" },
  stripNum: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  stripLabel: { fontSize: fontSize.xs, color: colors.textSecondary },
  stripDivider: { width: 1, height: 32, backgroundColor: colors.border },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.md },

  section: { marginBottom: spacing.md },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderLeftWidth: 3, paddingLeft: 10, marginBottom: 8 },
  sectionTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text },
  sectionBadge: { borderRadius: borderRadius.full, paddingHorizontal: 8, paddingVertical: 2 },
  sectionBadgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },

  wordCard: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, borderLeftWidth: 4, borderLeftColor: colors.border, marginBottom: 8, overflow: "hidden", ...shadow.sm },
  wordCardMarked: { opacity: 0.75 },
  cardTop: { flexDirection: "row", alignItems: "center", padding: 12 },
  wordInfo: { flex: 1 },
  wordRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
  wordText: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  wordTextFaded: { color: colors.textSecondary },
  diffBadge: { borderRadius: borderRadius.full, paddingHorizontal: 7, paddingVertical: 2 },
  diffBadgeText: { fontSize: 10, fontWeight: fontWeight.bold },
  phoneticText: { fontSize: fontSize.xs, color: colors.textSecondary, fontStyle: "italic", marginBottom: 4 },
  miniStats: { flexDirection: "row", alignItems: "center", gap: 3 },
  miniStatText: { fontSize: 11, fontWeight: fontWeight.semibold },
  hearBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryBg, alignItems: "center", justifyContent: "center", marginLeft: 8 },

  gotBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 11, backgroundColor: colors.success, borderTopWidth: 1, borderTopColor: colors.border },
  gotText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.white },

  markedRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#DCFCE7" },
  markedText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.success },

  doneCard: { backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: spacing.lg, alignItems: "center", borderWidth: 1, borderColor: colors.border, marginTop: spacing.md },
  doneEmoji: { fontSize: 48, marginBottom: 8 },
  doneTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text, marginBottom: 4 },
  doneSubtitle: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: "center" },
});
