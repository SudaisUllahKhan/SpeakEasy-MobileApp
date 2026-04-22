import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import * as Speech from "expo-speech";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { getReviewWords, submitReviewResult } from "@/lib/api";
import {
  colors,
  fontSize,
  fontWeight,
  borderRadius,
  spacing,
  shadow,
} from "@/lib/theme";
import type { DifficultWord } from "@/lib/types";

type SessionState = "reviewing" | "complete";

export default function ReviewScreen(): React.ReactElement {
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [sessionState, setSessionState] = useState<SessionState>("reviewing");
  const [results, setResults] = useState<{ correct: number; incorrect: number }>({
    correct: 0,
    incorrect: 0,
  });

  const flipAnim = React.useRef(new Animated.Value(0)).current;

  const { data: words, isLoading, isError, refetch } = useQuery({
    queryKey: ["review-words"],
    queryFn: getReviewWords,
  });

  const submitMutation = useMutation({
    mutationFn: ({ wordId, isCorrect }: { wordId: string; isCorrect: boolean }) =>
      submitReviewResult(wordId, isCorrect),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const handleFlip = () => {
    if (flipped) return;
    Animated.timing(flipAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setFlipped(true));

    // Speak the word
    if (words && words[currentIndex]) {
      Speech.speak(words[currentIndex].word, { language: "en-US" });
    }
  };

  const handleResult = async (isCorrect: boolean) => {
    if (!words || currentIndex >= words.length) return;

    const word = words[currentIndex];

    try {
      await submitMutation.mutateAsync({ wordId: word.id, isCorrect });
    } catch {
      // Non-fatal — continue
    }

    setResults((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      incorrect: prev.incorrect + (isCorrect ? 0 : 1),
    }));

    const next = currentIndex + 1;
    if (next >= (words?.length ?? 0)) {
      setSessionState("complete");
    } else {
      setCurrentIndex(next);
      setFlipped(false);
      flipAnim.setValue(0);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setFlipped(false);
    setSessionState("reviewing");
    setResults({ correct: 0, incorrect: 0 });
    flipAnim.setValue(0);
    refetch();
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen label="Loading words to review..." />;
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.muted} />
          <Text style={styles.errorTitle}>Could not load review words</Text>
          <Button
            onPress={() => refetch()}
            style={{ marginTop: spacing.md }}
            accessibilityLabel="Retry loading review words"
          >
            Try again
          </Button>
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
          <Ionicons name="checkmark-circle-outline" size={64} color={colors.success} />
          <Text style={styles.emptyTitle}>All caught up!</Text>
          <Text style={styles.emptySubtitle}>
            No words due for review today. Come back later or keep practicing
            lessons to build your vocabulary.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (sessionState === "complete") {
    const total = results.correct + results.incorrect;
    const accuracy = total > 0 ? Math.round((results.correct / total) * 100) : 0;

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Review Complete!</Text>
        </View>
        <View style={styles.centered}>
          <View style={styles.completionIcon}>
            <Ionicons name="trophy" size={48} color="#F59E0B" />
          </View>
          <Text style={styles.completionTitle}>Session complete!</Text>
          <Text style={styles.completionSubtitle}>
            You reviewed {total} word{total !== 1 ? "s" : ""}
          </Text>

          <View style={styles.completionStats}>
            <View style={styles.completionStat}>
              <Text style={styles.completionStatValue}>{results.correct}</Text>
              <Text style={[styles.completionStatLabel, { color: colors.success }]}>
                Got it
              </Text>
            </View>
            <View style={styles.completionStatDivider} />
            <View style={styles.completionStat}>
              <Text style={styles.completionStatValue}>{results.incorrect}</Text>
              <Text style={[styles.completionStatLabel, { color: colors.accent }]}>
                Still learning
              </Text>
            </View>
            <View style={styles.completionStatDivider} />
            <View style={styles.completionStat}>
              <Text style={styles.completionStatValue}>{accuracy}%</Text>
              <Text style={styles.completionStatLabel}>Accuracy</Text>
            </View>
          </View>

          <Button
            onPress={handleRestart}
            fullWidth
            size="lg"
            style={{ marginTop: spacing.lg }}
            accessibilityLabel="Start another review session"
          >
            Review more
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  const currentWord = words[currentIndex];
  const progress = (currentIndex / words.length) * 100;

  const frontRotate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "90deg"],
  });
  const backRotate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["-90deg", "0deg"],
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Word Review</Text>
        <Text style={styles.headerSubtitle}>
          {currentIndex + 1} / {words.length}
        </Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View
          style={[styles.progressBarFill, { width: `${progress}%` }]}
        />
      </View>

      <View style={styles.cardContainer}>
        {/* Front of card */}
        {!flipped && (
          <Animated.View
            style={[
              styles.flashcard,
              { transform: [{ rotateY: frontRotate }] },
            ]}
          >
            <TouchableOpacity
              style={styles.flashcardInner}
              onPress={handleFlip}
              activeOpacity={0.9}
              accessibilityLabel={`Flashcard for word: ${currentWord.word}. Tap to reveal.`}
            >
              <Text style={styles.flashcardWord}>{currentWord.word}</Text>
              <View style={styles.tapHintRow}>
                <Ionicons name="hand-left-outline" size={16} color={colors.muted} />
                <Text style={styles.tapHint}>Tap to reveal</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Back of card */}
        {flipped && (
          <Animated.View
            style={[
              styles.flashcard,
              styles.flashcardBack,
              { transform: [{ rotateY: backRotate }] },
            ]}
          >
            <View style={styles.flashcardInner}>
              <Text style={styles.flashcardWord}>{currentWord.word}</Text>

              {currentWord.phonetic && (
                <Text style={styles.flashcardPhonetic}>
                  [{currentWord.phonetic}]
                </Text>
              )}

              <TouchableOpacity
                style={styles.hearButton}
                onPress={() =>
                  Speech.speak(currentWord.word, { language: "en-US" })
                }
                accessibilityLabel={`Hear pronunciation of ${currentWord.word}`}
              >
                <Ionicons name="volume-high" size={20} color={colors.primary} />
                <Text style={styles.hearButtonText}>Hear it</Text>
              </TouchableOpacity>

              <View style={styles.statsRow}>
                <View style={styles.statChip}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={14}
                    color={colors.success}
                  />
                  <Text style={[styles.statChipText, { color: colors.success }]}>
                    {currentWord.timesCorrect}x correct
                  </Text>
                </View>
                <View style={styles.statChip}>
                  <Ionicons
                    name="close-circle-outline"
                    size={14}
                    color={colors.danger}
                  />
                  <Text style={[styles.statChipText, { color: colors.danger }]}>
                    {currentWord.timesIncorrect}x missed
                  </Text>
                </View>
              </View>
            </View>
          </Animated.View>
        )}
      </View>

      {/* Action buttons — only shown after flip */}
      {flipped && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.stillLearningBtn}
            onPress={() => handleResult(false)}
            accessibilityLabel="Still learning this word"
          >
            <Ionicons name="refresh-outline" size={22} color={colors.accent} />
            <Text style={styles.stillLearningText}>Still learning</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gotItBtn}
            onPress={() => handleResult(true)}
            accessibilityLabel="I know this word"
          >
            <Ionicons name="checkmark" size={22} color={colors.white} />
            <Text style={styles.gotItText}>Got it!</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    overflow: "hidden",
    marginBottom: spacing.lg,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
  },
  cardContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: "center",
  },
  flashcard: {
    width: "100%",
    minHeight: 280,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    ...shadow.lg,
    backfaceVisibility: "hidden",
  },
  flashcardBack: {
    backgroundColor: colors.primaryBg,
    borderColor: colors.primary,
  },
  flashcardInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    minHeight: 280,
  },
  flashcardWord: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: "center",
    marginBottom: 12,
  },
  tapHintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: spacing.md,
  },
  tapHint: {
    fontSize: fontSize.sm,
    color: colors.muted,
  },
  flashcardPhonetic: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    marginBottom: 16,
    fontStyle: "italic",
  },
  hearButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    marginBottom: spacing.md,
  },
  hearButtonText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.bg,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statChipText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  actionButtons: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  stillLearningBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  stillLearningText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.accent,
  },
  gotItBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.success,
  },
  gotItText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  centered: {
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
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  completionIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  completionTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: 6,
  },
  completionSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  completionStats: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    width: "100%",
  },
  completionStat: {
    flex: 1,
    alignItems: "center",
  },
  completionStatValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: 2,
  },
  completionStatLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: "center",
  },
  completionStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
});
