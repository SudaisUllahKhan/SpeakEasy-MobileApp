import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Animated,
  TextInput,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as Speech from "expo-speech";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "https://your-speakeasy-domain.com";
import { queryClient } from "@/lib/queryClient";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ScoreBar } from "@/components/ui/ScoreBar";
import {
  getLesson,
  scoreReadingAudio,
  scoreReadingJson,
  generateQuestions,
  evaluateAnswer,
  completeLesson,
} from "@/lib/api";
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
  scoreWordsByDiff,
  calcPronunciationScore,
  calcFluencyScore,
  getWordLabelColor,
  getWordLabelBg,
  getScoreColor,
} from "@/lib/utils";
import type {
  LessonStep,
  ScoredWord,
  GeneratedQuestion,
  QuestionResponse,
  DifficultWord,
  PronunciationFeedback,
  Level,
} from "@/lib/types";

// ─── Module-level audio tracker — stops audio when screen loses focus ─────────

let _activeSound: Audio.Sound | null = null;

async function stopModuleAudio() {
  Speech.stop();
  if (_activeSound) {
    try { await _activeSound.stopAsync(); } catch { /* ignore */ }
    try { await _activeSound.unloadAsync(); } catch { /* ignore */ }
    _activeSound = null;
  }
}

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEPS: LessonStep[] = ["listen", "read", "questions", "feedback", "summary"];
const STEP_LABELS: Record<LessonStep, string> = {
  listen: "Listen",
  read: "Read Aloud",
  questions: "Questions",
  feedback: "Feedback",
  summary: "Summary",
};

// ─── Voice presets ────────────────────────────────────────────────────────────

interface VoicePreset {
  id: string;
  label: string;
  icon: string;
  iconType: "ionicon" | "flag";
  color: string;
  pitch: number;
  rate: number;
  language: string;
}

const VOICE_PRESETS: VoicePreset[] = [
  { id: "female",      label: "Female",     icon: "person-circle",         iconType: "ionicon", color: "#7C3AED", pitch: 1.0,  rate: 1.0,  language: "en-US" },
  { id: "girl",        label: "Girl",       icon: "happy-outline",         iconType: "ionicon", color: "#EC4899", pitch: 1.6,  rate: 1.1,  language: "en-US" },
  { id: "human",       label: "Human",      icon: "people-outline",        iconType: "ionicon", color: "#0EA5E9", pitch: 1.0,  rate: 1.0,  language: "en-US" },
  { id: "american",    label: "American",   icon: "🇺🇸", iconType: "flag", color: "#3B82F6", pitch: 1.0,  rate: 1.0,  language: "en-US" },
  { id: "british",     label: "British",    icon: "🇬🇧", iconType: "flag", color: "#EF4444", pitch: 1.0,  rate: 0.9,  language: "en-GB" },
  { id: "indian",      label: "Indian",     icon: "🇮🇳", iconType: "flag", color: "#F97316", pitch: 1.0,  rate: 0.85, language: "en-IN" },
  { id: "australian",  label: "Australian", icon: "🇦🇺", iconType: "flag", color: "#10B981", pitch: 1.0,  rate: 1.0,  language: "en-AU" },
  { id: "storyteller", label: "Story",      icon: "🎭",  iconType: "flag", color: "#92400E", pitch: 1.15, rate: 0.75, language: "en-US" },
];

const SPEED_OPTIONS = ["0.25", "0.5", "0.75", "1", "1.25", "1.5", "2"] as const;
type SpeedOption = typeof SPEED_OPTIONS[number];

function wordWeight(word: string): number {
  const chars = word.replace(/[^a-zA-Z']/g, "").length || 3;
  const factor = Math.max(0.5, Math.min(2.5, chars / 4.5));
  const hasPause = /[.,!?;:]$/.test(word);
  return factor + (hasPause ? 0.4 : 0);
}

function calcWordTimestamps(words: string[], speed: SpeedOption, durationMs?: number): number[] {
  const startupMs = 280;
  const timestamps: number[] = [];

  if (durationMs && durationMs > 1000) {
    // Accurate mode: distribute actual audio duration proportionally across words
    const usable = durationMs - startupMs - 150; // leave 150ms tail
    const weights = words.map(wordWeight);
    const total = weights.reduce((a, b) => a + b, 0);
    let t = startupMs;
    for (let i = 0; i < words.length; i++) {
      timestamps.push(t);
      t += (weights[i] / total) * usable;
    }
    return timestamps;
  }

  // Fallback: WPM estimate
  const wpm = speed === "2" ? 260 : speed === "1.5" ? 185 : speed === "1.25" ? 158 : speed === "0.75" ? 98 : speed === "0.5" ? 65 : speed === "0.25" ? 32 : 130;
  const avgMs = 60000 / wpm;
  let t = startupMs;
  for (const word of words) {
    timestamps.push(t);
    t += avgMs * wordWeight(word);
  }
  return timestamps;
}

// ─── Main screen ──────────────────────────────────────────────────────────────

function LessonPlayerScreen(): React.ReactElement {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { user } = useAuthStore();

  // Stop audio whenever this screen loses focus (e.g. user taps Home tab)
  useFocusEffect(
    useCallback(() => {
      return () => { void stopModuleAudio(); };
    }, [])
  );

  // ── step state ────────────────────────────────────────────────────────────
  const [step, setStep] = useState<LessonStep>("listen");
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [scoredWords, setScoredWords] = useState<ScoredWord[]>([]);
  const [pronunciationScore, setPronunciationScore] = useState<number | null>(null);
  const [fluencyScore, setFluencyScore] = useState<number | null>(null);
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [questionResponses, setQuestionResponses] = useState<QuestionResponse[]>([]);
  const [comprehensionScore, setComprehensionScore] = useState<number | null>(null);
  const [difficultWords, setDifficultWords] = useState<DifficultWord[]>([]);
  const [pronunciationTip, setPronunciationTip] = useState<PronunciationFeedback | null>(null);
  const [xpEarned, setXpEarned] = useState(0);

  const { data: lesson, isLoading, isError } = useQuery({
    queryKey: ["lesson", slug],
    queryFn: () => getLesson(slug!),
    enabled: !!slug,
  });

  if (isLoading) {
    return <LoadingSpinner fullScreen label="Loading lesson..." />;
  }

  if (isError || !lesson) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorState}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Ionicons name="alert-circle-outline" size={48} color={colors.muted} />
          <Text style={styles.errorTitle}>Lesson not found</Text>
          <Button onPress={() => router.back()} style={{ marginTop: spacing.md }}>
            Go back
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  const level = (user?.level ?? lesson.level) as Level;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            Speech.stop();
            router.back();
          }}
          accessibilityLabel="Exit lesson"
          style={styles.backBtn}
        >
          <Ionicons name="close" size={26} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {lesson.title}
          </Text>
          <Text style={styles.headerStep}>{STEP_LABELS[step]}</Text>
        </View>

        <Badge variant={level.toLowerCase() as "a1" | "a2" | "b1"}>
          {level}
        </Badge>
      </View>

      {/* Step progress dots */}
      <StepProgress currentStep={step} />

      {/* Step content */}
      {step === "listen" && (
        <ListenStep
          lesson={lesson}
          level={level}
          onComplete={() => setStep("read")}
        />
      )}
      {step === "read" && (
        <ReadAloudStep
          lesson={lesson}
          level={level}
          user={user}
          onComplete={(aid, words, pron, fluency) => {
            setAttemptId(aid);
            setScoredWords(words);
            setPronunciationScore(pron);
            setFluencyScore(fluency);
            setStep("questions");
          }}
        />
      )}
      {step === "questions" && (
        <QuestionsStep
          lesson={lesson}
          level={level}
          attemptId={attemptId!}
          user={user}
          questions={questions}
          questionIndex={questionIndex}
          questionResponses={questionResponses}
          onQuestionsLoaded={setQuestions}
          onQuestionResponse={(resp) => {
            setQuestionResponses((prev) => [...prev, resp]);
            setQuestionIndex((i) => i + 1);
          }}
          onComplete={() => setStep("feedback")}
        />
      )}
      {step === "feedback" && (
        <FeedbackStep
          attemptId={attemptId!}
          pronunciationScore={pronunciationScore}
          fluencyScore={fluencyScore}
          difficultWords={difficultWords}
          questionResponses={questionResponses}
          pronunciationTip={pronunciationTip}
          comprehensionScore={comprehensionScore}
          xpEarned={xpEarned}
          onComplete={(compScore, xp, diffWords, tip) => {
            setComprehensionScore(compScore);
            setXpEarned(xp);
            setDifficultWords(diffWords);
            setPronunciationTip(tip);
            setStep("summary");
          }}
          onDataLoaded={(compScore, xp, diffWords, tip) => {
            setComprehensionScore(compScore);
            setXpEarned(xp);
            setDifficultWords(diffWords);
            setPronunciationTip(tip);
          }}
        />
      )}
      {step === "summary" && (
        <SummaryStep
          lesson={lesson}
          pronunciationScore={pronunciationScore}
          fluencyScore={fluencyScore}
          comprehensionScore={comprehensionScore}
          xpEarned={xpEarned}
          difficultWords={difficultWords}
          pronunciationTip={pronunciationTip}
          questionResponses={questionResponses}
          onTryAgain={() => {
            Speech.stop();
            setStep("listen");
            setAttemptId(null);
            setScoredWords([]);
            setPronunciationScore(null);
            setFluencyScore(null);
            setQuestions([]);
            setQuestionIndex(0);
            setQuestionResponses([]);
            setComprehensionScore(null);
            setDifficultWords([]);
            setPronunciationTip(null);
            setXpEarned(0);
          }}
          onBackToTopic={() => {
            Speech.stop();
            const topicSlug = lesson.topic?.slug;
            if (topicSlug) {
              router.replace(`/(app)/topics/${topicSlug}` as never);
            } else {
              router.replace("/(app)/dashboard" as never);
            }
          }}
          onNextLesson={() => {
            Speech.stop();
            const next = (lesson as typeof lesson & { nextLessonSlug?: string | null }).nextLessonSlug;
            if (next) {
              router.replace(`/(app)/lessons/${next}` as never);
            } else {
              const topicSlug = lesson.topic?.slug;
              router.replace(topicSlug ? `/(app)/topics/${topicSlug}` as never : "/(app)/dashboard" as never);
            }
          }}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Step Progress Indicator ──────────────────────────────────────────────────

function StepProgress({ currentStep }: { currentStep: LessonStep }) {
  const currentIndex = STEPS.indexOf(currentStep);
  return (
    <View style={styles.stepProgress}>
      {STEPS.map((s, i) => (
        <React.Fragment key={s}>
          <View
            style={[
              styles.stepDot,
              i <= currentIndex && styles.stepDotActive,
              i === currentIndex && styles.stepDotCurrent,
            ]}
          />
          {i < STEPS.length - 1 && (
            <View
              style={[
                styles.stepLine,
                i < currentIndex && styles.stepLineActive,
              ]}
            />
          )}
        </React.Fragment>
      ))}
    </View>
  );
}

// ─── STEP 1: Listen ───────────────────────────────────────────────────────────

interface ListenStepProps {
  lesson: { passageText: string; audioUrl: string | null; audioSpeed?: number };
  level: Level;
  onComplete: () => void;
}

const ACCENT_TO_VOICE: Record<string, string> = {
  US: "american",
  UK: "british",
  AU: "australian",
  IN: "indian",
};

function ListenStep({ lesson, level, onComplete }: ListenStepProps) {
  const { user } = useAuthStore();
  const defaultVoice = ACCENT_TO_VOICE[user?.preferredAccent ?? "US"] ?? "american";
  const [isPlaying, setIsPlaying] = useState(false);
  const [replaysUsed, setReplaysUsed] = useState(0);
  const [selectedVoiceId, setSelectedVoiceId] = useState(defaultVoice);
  const [selectedSpeed, setSelectedSpeed] = useState<SpeedOption>(() => {
    const s = user?.audioSpeed;
    if (s === 0.75) return "0.75";
    if (s === 1.25) return "1.25";
    return "1";
  });
  const [highlightedWordIndex, setHighlightedWordIndex] = useState(-1);
  const soundRef = useRef<Audio.Sound | null>(null);
  const speakRequestRef = useRef(0);
  const MAX_REPLAYS = 3;

  const passageWords = lesson.passageText.split(/\s+/);

  const stopAudio = async () => {
    Speech.stop();
    if (soundRef.current) {
      await soundRef.current.stopAsync().catch(() => {});
      await soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
    setIsPlaying(false);
    setHighlightedWordIndex(-1);
  };

  const speakWithAzure = async (voiceId: string, speed?: SpeedOption) => {
    const myId = ++speakRequestRef.current;
    await stopAudio();
    if (myId !== speakRequestRef.current) return; // newer request took over
    setIsPlaying(true);
    const spd = speed ?? selectedSpeed;
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, allowsRecordingIOS: false, staysActiveInBackground: true, shouldDuckAndroid: false });
      const encodedText = encodeURIComponent(lesson.passageText);
      // Always fetch 1x audio — client-side rate control is more reliable across
      // all speeds than asking the TTS server to vary tempo.
      const uri = `${API_URL}/api/tts?voiceId=${voiceId}&text=${encodedText}`;
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: false },
        undefined,
        true // downloadFirst — avoids mid-playback cut-outs
      );
      if (myId !== speakRequestRef.current) {
        await sound.stopAsync().catch(() => {});
        await sound.unloadAsync().catch(() => {});
        return;
      }
      soundRef.current = sound;
      _activeSound = sound; // track for focus-based cleanup
      // Apply playback rate on the client so voice and highlight are always in sync.
      const rateMultiplier = parseFloat(spd);
      await sound.setRateAsync(rateMultiplier, true).catch(() => {});
      // Get 1x audio duration then scale by rate to get effective playback duration.
      const loadedStatus = await sound.getStatusAsync();
      const baseDurationMs = loadedStatus.isLoaded ? (loadedStatus.durationMillis ?? undefined) : undefined;
      const durationMs = baseDurationMs !== undefined ? baseDurationMs / rateMultiplier : undefined;
      const wordTimestamps = calcWordTimestamps(passageWords, spd, durationMs);
      // Fire status updates every 80ms for smooth highlight tracking
      await sound.setStatusAsync({ progressUpdateIntervalMillis: 80 });
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) return;
        if (status.positionMillis != null) {
          const pos = status.positionMillis;
          let idx = -1;
          for (let i = 0; i < wordTimestamps.length; i++) {
            if (pos >= wordTimestamps[i]) idx = i;
            else break;
          }
          setHighlightedWordIndex(idx);
        }
        if (status.didJustFinish) {
          setIsPlaying(false);
          setHighlightedWordIndex(-1);
          sound.unloadAsync().catch(() => {});
          soundRef.current = null;
        }
      });
    } catch {
      if (myId !== speakRequestRef.current) return;
      const v = VOICE_PRESETS.find((p) => p.id === voiceId) ?? VOICE_PRESETS[0];
      Speech.speak(lesson.passageText, {
        language: v.language,
        pitch: v.pitch,
        rate: (user?.audioSpeed ?? 1.0) * v.rate,
        onDone: () => setIsPlaying(false),
        onError: () => setIsPlaying(false),
        onStopped: () => setIsPlaying(false),
      });
    }
  };

  const speak = useCallback(async (voiceId?: string) => {
    const id = voiceId ?? selectedVoiceId;
    if (isPlaying) {
      speakRequestRef.current++; // cancel any in-flight load
      await stopAudio();
      return;
    }
    await speakWithAzure(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, selectedVoiceId, lesson.passageText]);

  const handleVoiceSelect = async (voice: VoicePreset) => {
    setSelectedVoiceId(voice.id);
    await speakWithAzure(voice.id);
  };

  const handleReplay = () => {
    if (replaysUsed >= MAX_REPLAYS) return;
    setReplaysUsed((n) => n + 1);
    speak();
  };

  useEffect(() => {
    const timer = setTimeout(() => speakWithAzure(defaultVoice), 500);
    return () => {
      clearTimeout(timer);
      stopAudio();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ScrollView
      contentContainerStyle={styles.stepScroll}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.stepContent}>
        <View style={styles.stepIconHeader}>
          <View style={[styles.stepIconBg, { backgroundColor: "#EDE9FE" }]}>
            <Ionicons name="headset" size={32} color={colors.primary} />
          </View>
          <Text style={styles.stepTitle}>Listen to the passage</Text>
          <Text style={styles.stepSubtitle}>
            Listen carefully. You will read it aloud next.
          </Text>
        </View>

        {/* Passage text with word highlighting */}
        <Card style={styles.passageCard}>
          <View style={styles.passageWordRow}>
            {passageWords.map((word, i) => (
              <View
                key={i}
                style={[
                  styles.passageWordChip,
                  highlightedWordIndex === i && styles.passageWordChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.passageText,
                    highlightedWordIndex === i && styles.passageWordChipText,
                  ]}
                >
                  {word}
                </Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Voice selector */}
        <View style={styles.voiceSelectorSection}>
          <Text style={styles.voiceSelectorLabel}>Choose a voice</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.voiceSelectorRow}
          >
            {VOICE_PRESETS.map((voice) => (
              <TouchableOpacity
                key={voice.id}
                style={[
                  styles.voiceChip,
                  selectedVoiceId === voice.id && {
                    borderColor: voice.color,
                    backgroundColor: voice.color + "18",
                  },
                ]}
                onPress={() => handleVoiceSelect(voice)}
                accessibilityLabel={`Select ${voice.label} voice`}
                accessibilityState={{ selected: selectedVoiceId === voice.id }}
              >
                {voice.iconType === "flag" ? (
                    <Text style={styles.voiceChipFlag}>{voice.icon}</Text>
                  ) : (
                    <Ionicons
                      name={voice.icon as React.ComponentProps<typeof Ionicons>["name"]}
                      size={22}
                      color={voice.color}
                    />
                  )}
                <Text style={[styles.voiceChipLabel, { color: voice.color }]}>
                  {voice.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Speed selector */}
        <View style={styles.speedSelectorRow}>
          <Text style={styles.speedSelectorLabel}>Speed</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.speedButtons}>
            {SPEED_OPTIONS.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.speedBtn, selectedSpeed === s && styles.speedBtnActive]}
                onPress={() => {
                  setSelectedSpeed(s);
                  if (isPlaying) void speakWithAzure(selectedVoiceId, s);
                }}
                accessibilityLabel={`Set speed to ${s}x`}
              >
                <Text style={[styles.speedBtnText, selectedSpeed === s && styles.speedBtnTextActive]}>
                  {s}x
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Player controls */}
        <View style={styles.audioControls}>
          <TouchableOpacity
            style={[styles.playButton, isPlaying && styles.playButtonActive]}
            onPress={() => speak()}
            accessibilityLabel={isPlaying ? "Pause" : "Play passage"}
          >
            <Ionicons
              name={isPlaying ? "pause" : "play"}
              size={36}
              color={colors.white}
            />
          </TouchableOpacity>

          {replaysUsed < MAX_REPLAYS && (
            <TouchableOpacity
              style={styles.replayBtn}
              onPress={handleReplay}
              accessibilityLabel={`Replay passage. ${MAX_REPLAYS - replaysUsed} replays remaining.`}
            >
              <Ionicons name="refresh" size={20} color={colors.primary} />
              <Text style={styles.replayText}>
                Replay ({MAX_REPLAYS - replaysUsed} left)
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <Button
          onPress={() => {
            Speech.stop();
            onComplete();
          }}
          fullWidth
          size="lg"
          style={styles.ctaButton}
          accessibilityLabel="I am ready to read"
        >
          I&apos;m ready to read
        </Button>
      </View>
    </ScrollView>
  );
}

// ─── STEP 2: Read Aloud ───────────────────────────────────────────────────────

interface ReadAloudStepProps {
  lesson: { id: string; passageText: string; level: Level };
  level: Level;
  user: { nativeLanguage?: string | null; level?: Level } | null;
  onComplete: (
    attemptId: string,
    scoredWords: ScoredWord[],
    pronunciation: number,
    fluency: number
  ) => void;
}

function ReadAloudStep({ lesson, level, user, onComplete }: ReadAloudStepProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [textFallback, setTextFallback] = useState("");
  const [useTextInput, setUseTextInput] = useState(false);
  const [scoredWords, setScoredWords] = useState<ScoredWord[]>([]);
  const [showScored, setShowScored] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [listenVoiceId, setListenVoiceId] = useState("female");
  const [listenSpeed, setListenSpeed] = useState<SpeedOption>("1");
  const [isListening, setIsListening] = useState(false);

  const listenSoundRef = useRef<Audio.Sound | null>(null);
  const listenRequestRef = useRef(0);

  const stopListenAudio = async () => {
    Speech.stop();
    if (listenSoundRef.current) {
      await listenSoundRef.current.stopAsync().catch(() => {});
      await listenSoundRef.current.unloadAsync().catch(() => {});
      listenSoundRef.current = null;
    }
    setIsListening(false);
  };

  const handleListenAgain = async (voiceId?: string, speed?: SpeedOption) => {
    const id = voiceId ?? listenVoiceId;
    const spd = speed ?? listenSpeed;
    const myId = ++listenRequestRef.current;

    await stopListenAudio();
    if (myId !== listenRequestRef.current) return;
    if (!voiceId && !speed && myId === listenRequestRef.current) {
      // tapped stop — already stopped above
      return;
    }
    setIsListening(true);
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, allowsRecordingIOS: false, staysActiveInBackground: true, shouldDuckAndroid: false });
      const encodedText = encodeURIComponent(lesson.passageText);
      const uri = `${API_URL}/api/tts?voiceId=${id}&text=${encodedText}`;
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: false },
        undefined,
        true // downloadFirst — avoids mid-playback cut-outs
      );
      if (myId !== listenRequestRef.current) {
        await sound.stopAsync().catch(() => {});
        await sound.unloadAsync().catch(() => {});
        return;
      }
      listenSoundRef.current = sound;
      await sound.setRateAsync(parseFloat(spd), true).catch(() => {});
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsListening(false);
          sound.unloadAsync().catch(() => {});
          listenSoundRef.current = null;
        }
      });
    } catch {
      if (myId !== listenRequestRef.current) return;
      const voice = VOICE_PRESETS.find((v) => v.id === id) ?? VOICE_PRESETS[0];
      Speech.speak(lesson.passageText, {
        language: voice.language,
        pitch: voice.pitch,
        rate: voice.rate * parseFloat(spd),
        onDone: () => setIsListening(false),
        onError: () => setIsListening(false),
        onStopped: () => setIsListening(false),
      });
    }
  };

  const recordingRef = useRef<Audio.Recording | null>(null);
  const recordingStartTime = useRef<number>(0);

  useEffect(() => {
    (async () => {
      const { granted } = await Audio.requestPermissionsAsync();
      setHasPermission(granted);
      if (!granted) {
        setUseTextInput(true);
      }
    })();
  }, []);

  const startRecording = async () => {
    try {
      setErrorMsg(null);
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      recordingStartTime.current = Date.now();
      setIsRecording(true);
    } catch (err) {
      console.error("[ReadAloudStep] Start recording error:", err);
      setUseTextInput(true);
      setErrorMsg("Microphone unavailable. Please type your answer below.");
    }
  };

  const stopRecordingAndScore = async () => {
    if (!recordingRef.current) return;
    setIsRecording(false);
    setIsProcessing(true);

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) throw new Error("No recording URI");

      const durationMs = Date.now() - recordingStartTime.current;

      const result = await scoreReadingAudio(uri, lesson.id, lesson.passageText, level);

      setScoredWords(result.scoredWords);
      setShowScored(true);
      onComplete(result.attemptId, result.scoredWords, result.pronunciationScore, result.fluencyScore);
    } catch (err) {
      console.error("[ReadAloudStep] Score error:", err);
      // Fallback: use text input scoring
      setUseTextInput(true);
      setErrorMsg(
        "Audio processing failed. You can type your reading below, or we can score you based on what you typed."
      );
    } finally {
      setIsProcessing(false);
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    }
  };

  const handleTextSubmit = async () => {
    if (!textFallback.trim()) return;
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const words = scoreWordsByDiff(lesson.passageText, textFallback);
      const pronScore = calcPronunciationScore(words);
      const wpmApprox = (textFallback.split(/\s+/).length / 60) * 60; // assume 60s
      const fluScore = calcFluencyScore(wpmApprox, level);

      const result = await scoreReadingJson({
        lessonId: lesson.id,
        passageText: lesson.passageText,
        level,
        nativeLanguage: user?.nativeLanguage ?? "English",
        transcript: textFallback,
        durationMs: 60000,
        scoredWords: words,
        pronunciationScore: pronScore,
        fluencyScore: fluScore,
      });

      setScoredWords(result.scoredWords);
      setShowScored(true);
      onComplete(result.attemptId, result.scoredWords, result.pronunciationScore, result.fluencyScore);
    } catch (err) {
      setErrorMsg("Scoring failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={styles.stepScroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.stepContent}>
          <View style={styles.stepIconHeader}>
            <View style={[styles.stepIconBg, { backgroundColor: "#FEF3C7" }]}>
              <Ionicons name="mic" size={32} color={colors.accent} />
            </View>
            <Text style={styles.stepTitle}>Read aloud</Text>
            <Text style={styles.stepSubtitle}>
              Read the passage out loud. Try to speak clearly and at a natural
              pace.
            </Text>
          </View>

          {/* Passage */}
          {!showScored ? (
            <Card style={styles.passageCard}>
              <Text style={styles.passageText}>{lesson.passageText}</Text>
            </Card>
          ) : (
            <Card style={styles.passageCard}>
              <Text style={styles.scoredTitle}>Your pronunciation</Text>
              <View style={styles.scoredWords}>
                {scoredWords.map((w, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() =>
                      Speech.speak(w.word, { language: "en-US" })
                    }
                    accessibilityLabel={`${w.word}: ${w.label.toLowerCase()}`}
                    style={[
                      styles.scoredWord,
                      { backgroundColor: getWordLabelBg(w.label) },
                    ]}
                  >
                    <Text
                      style={[
                        styles.scoredWordText,
                        { color: getWordLabelColor(w.label) },
                      ]}
                    >
                      {w.word}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.scoreLegend}>
                <LegendItem label="CORRECT" />
                <LegendItem label="CLOSE" />
                <LegendItem label="MISSED" />
              </View>
            </Card>
          )}

          {errorMsg && (
            <View style={styles.errorBanner}>
              <Ionicons
                name="information-circle-outline"
                size={16}
                color={colors.warning}
              />
              <Text style={styles.errorBannerText}>{errorMsg}</Text>
            </View>
          )}

          {/* Text fallback */}
          {useTextInput && !showScored && (
            <View style={styles.textInputGroup}>
              <Text style={styles.textInputLabel}>
                Type the passage as you would say it:
              </Text>
              <TextInput
                style={styles.textInputArea}
                value={textFallback}
                onChangeText={setTextFallback}
                multiline
                numberOfLines={5}
                placeholder="Type what you said..."
                placeholderTextColor={colors.muted}
                textAlignVertical="top"
                accessibilityLabel="Type your reading"
              />
              <Button
                onPress={handleTextSubmit}
                loading={isProcessing}
                disabled={!textFallback.trim()}
                fullWidth
                style={{ marginTop: spacing.sm }}
                accessibilityLabel="Submit text reading"
              >
                Score my reading
              </Button>
            </View>
          )}

          {/* Listen again */}
          {!showScored && (
            <View style={styles.listenAgainSection}>
              <Text style={styles.listenAgainLabel}>Listen again before recording</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.voiceSelectorRow}
              >
                {VOICE_PRESETS.map((voice) => (
                  <TouchableOpacity
                    key={voice.id}
                    style={[
                      styles.voiceChip,
                      listenVoiceId === voice.id && {
                        borderColor: voice.color,
                        backgroundColor: voice.color + "18",
                      },
                    ]}
                    onPress={() => {
                      setListenVoiceId(voice.id);
                      void handleListenAgain(voice.id);
                    }}
                    accessibilityLabel={`Listen with ${voice.label} voice`}
                  >
                    {voice.iconType === "flag" ? (
                    <Text style={styles.voiceChipFlag}>{voice.icon}</Text>
                  ) : (
                    <Ionicons
                      name={voice.icon as React.ComponentProps<typeof Ionicons>["name"]}
                      size={22}
                      color={voice.color}
                    />
                  )}
                    <Text style={[
                      styles.voiceChipLabel,
                      listenVoiceId === voice.id && styles.voiceChipLabelActive,
                    ]}>
                      {voice.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={[styles.speedSelectorRow, { marginBottom: 8 }]}>
                <Text style={styles.speedSelectorLabel}>Speed</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.speedButtons}>
                  {SPEED_OPTIONS.map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[styles.speedBtn, listenSpeed === s && styles.speedBtnActive]}
                      onPress={() => {
                        setListenSpeed(s);
                        if (isListening) void handleListenAgain(listenVoiceId, s);
                      }}
                      accessibilityLabel={`Set speed to ${s}x`}
                    >
                      <Text style={[styles.speedBtnText, listenSpeed === s && styles.speedBtnTextActive]}>
                        {s}x
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <TouchableOpacity
                style={styles.listenAgainBtn}
                onPress={() => isListening ? stopListenAudio() : handleListenAgain(listenVoiceId, listenSpeed)}
                accessibilityLabel={isListening ? "Stop listening" : "Listen again"}
              >
                <Ionicons
                  name={isListening ? "stop-circle" : "play-circle"}
                  size={20}
                  color={colors.primary}
                />
                <Text style={styles.listenAgainBtnText}>
                  {isListening ? "Stop" : "Listen again"}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Mic controls */}
          {!useTextInput && !showScored && (
            <View style={styles.micControls}>
              {isProcessing ? (
                <LoadingSpinner label="Scoring your reading..." />
              ) : (
                <>
                  <TouchableOpacity
                    style={[
                      styles.micButton,
                      isRecording && styles.micButtonRecording,
                    ]}
                    onPress={isRecording ? stopRecordingAndScore : startRecording}
                    accessibilityLabel={
                      isRecording ? "Stop recording" : "Start recording"
                    }
                  >
                    <Ionicons
                      name={isRecording ? "stop" : "mic"}
                      size={40}
                      color={colors.white}
                    />
                  </TouchableOpacity>
                  <Text style={styles.micHint}>
                    {isRecording
                      ? "Recording... tap to stop"
                      : "Tap to start recording"}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setUseTextInput(true)}
                    accessibilityLabel="Use text input instead"
                    style={styles.switchToText}
                  >
                    <Text style={styles.switchToTextLabel}>
                      Use text input instead
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

          {showScored && (
            <Text style={styles.tapWordHint}>
              Tap any word to hear its pronunciation
            </Text>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── STEP 3: Questions ────────────────────────────────────────────────────────

interface QuestionsStepProps {
  lesson: { id: string; passageText: string };
  level: Level;
  attemptId: string;
  user: { nativeLanguage?: string | null } | null;
  questions: GeneratedQuestion[];
  questionIndex: number;
  questionResponses: QuestionResponse[];
  onQuestionsLoaded: (q: GeneratedQuestion[]) => void;
  onQuestionResponse: (resp: QuestionResponse) => void;
  onComplete: () => void;
}

function QuestionsStep({
  lesson,
  level,
  attemptId,
  user,
  questions,
  questionIndex,
  questionResponses,
  onQuestionsLoaded,
  onQuestionResponse,
  onComplete,
}: QuestionsStepProps) {
  const [answer, setAnswer] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastFeedback, setLastFeedback] = useState<{
    isCorrect: boolean;
    feedback: string;
    correctedVersion: string | null;
  } | null>(null);

  const { isLoading: questionsLoading, data: fetchedQuestions } = useQuery({
    queryKey: ["questions", lesson.id, level],
    queryFn: () => generateQuestions(lesson.id, level),
    enabled: questions.length === 0,
    staleTime: Infinity,
  });

  // Sync fetched questions into parent state once
  useEffect(() => {
    if (fetchedQuestions && fetchedQuestions.length > 0 && questions.length === 0) {
      onQuestionsLoaded(fetchedQuestions);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchedQuestions]);

  const currentQuestion = questions[questionIndex];
  const isLastQuestion = questionIndex >= questions.length - 1;

  const handleSubmitAnswer = async () => {
    if (!answer.trim() || !currentQuestion) return;
    setIsSubmitting(true);

    try {
      const result = await evaluateAnswer({
        attemptId,
        questionText: currentQuestion.text,
        questionType: currentQuestion.type,
        expectedAnswer: currentQuestion.expectedAnswer,
        studentTranscript: answer.trim(),
        nativeLanguage: user?.nativeLanguage ?? null,
        passageText: lesson.passageText,
      });

      const resp: QuestionResponse = {
        id: result.id,
        attemptId,
        questionText: currentQuestion.text,
        questionType: currentQuestion.type,
        expectedAnswer: currentQuestion.expectedAnswer,
        studentAudioUrl: null,
        studentTranscript: answer.trim(),
        isCorrect: result.isCorrect,
        confidenceScore: result.confidence,
        aiFeedback: result.feedback,
        correctedVersion: result.correctedVersion,
      };

      setLastFeedback({
        isCorrect: result.isCorrect,
        feedback: result.feedback,
        correctedVersion: result.correctedVersion,
      });

      onQuestionResponse(resp);
      setAnswer("");

      if (isLastQuestion) {
        setTimeout(onComplete, 1800);
      } else {
        setTimeout(() => setLastFeedback(null), 1800);
      }
    } catch (err) {
      Alert.alert("Error", "Could not submit your answer. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (questionsLoading) {
    return (
      <View style={styles.stepCentered}>
        <LoadingSpinner label="Generating questions..." />
      </View>
    );
  }

  if (questions.length === 0) {
    return (
      <View style={styles.stepCentered}>
        <Text style={styles.errorTitle}>No questions available</Text>
        <Button onPress={onComplete} style={{ marginTop: spacing.md }}>
          Continue
        </Button>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={styles.stepScroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.stepContent}>
          {/* Progress */}
          <View style={styles.questionProgress}>
            <Text style={styles.questionProgressText}>
              Question {Math.min(questionIndex + 1, questions.length)} of{" "}
              {questions.length}
            </Text>
            <View style={styles.questionProgressBar}>
              {questions.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.questionDot,
                    i < questionIndex && styles.questionDotDone,
                    i === questionIndex && styles.questionDotCurrent,
                  ]}
                />
              ))}
            </View>
          </View>

          {currentQuestion && !lastFeedback && (
            <>
              {/* Question type badge */}
              <Badge
                variant={
                  currentQuestion.type === "PERSONAL" ? "a1" : "primary"
                }
                style={{ marginBottom: spacing.sm }}
              >
                {currentQuestion.type.toLowerCase()}
              </Badge>

              {/* Question */}
              <Card style={styles.questionCard}>
                <Text style={styles.questionText}>{currentQuestion.text}</Text>
              </Card>

              {/* Passage reminder */}
              <TouchableOpacity
                style={styles.passageReminder}
                accessibilityLabel="Show passage"
              >
                <Ionicons
                  name="document-text-outline"
                  size={16}
                  color={colors.textSecondary}
                />
                <Text style={styles.passageReminderText}>
                  {lesson.passageText.slice(0, 80)}...
                </Text>
              </TouchableOpacity>

              {/* Answer input */}
              <TextInput
                style={styles.answerInput}
                value={answer}
                onChangeText={setAnswer}
                multiline
                numberOfLines={4}
                placeholder={
                  currentQuestion.type === "PERSONAL"
                    ? "Share your personal experience..."
                    : "Type your answer here..."
                }
                placeholderTextColor={colors.muted}
                textAlignVertical="top"
                accessibilityLabel="Answer input"
              />

              <Button
                onPress={handleSubmitAnswer}
                loading={isSubmitting}
                disabled={!answer.trim()}
                fullWidth
                size="lg"
                style={styles.ctaButton}
                accessibilityLabel="Submit answer"
              >
                Submit answer
              </Button>
            </>
          )}

          {/* Feedback bubble */}
          {lastFeedback && (
            <View
              style={[
                styles.feedbackBubble,
                lastFeedback.isCorrect
                  ? styles.feedbackCorrect
                  : styles.feedbackIncorrect,
              ]}
            >
              <View style={styles.feedbackBubbleHeader}>
                <Ionicons
                  name={
                    lastFeedback.isCorrect
                      ? "checkmark-circle"
                      : "information-circle"
                  }
                  size={22}
                  color={
                    lastFeedback.isCorrect ? colors.success : colors.accent
                  }
                />
                <Text
                  style={[
                    styles.feedbackBubbleTitle,
                    lastFeedback.isCorrect
                      ? styles.feedbackCorrectTitle
                      : styles.feedbackIncorrectTitle,
                  ]}
                >
                  {lastFeedback.isCorrect ? "Well done!" : "Keep it up!"}
                </Text>
              </View>
              <Text style={styles.feedbackBubbleText}>
                {lastFeedback.feedback}
              </Text>
              {lastFeedback.correctedVersion && (
                <View style={styles.correctedVersion}>
                  <Text style={styles.correctedLabel}>Try saying:</Text>
                  <Text style={styles.correctedText}>
                    "{lastFeedback.correctedVersion}"
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── STEP 4: Feedback ─────────────────────────────────────────────────────────

interface FeedbackStepProps {
  attemptId: string;
  pronunciationScore: number | null;
  fluencyScore: number | null;
  difficultWords: DifficultWord[];
  questionResponses: QuestionResponse[];
  pronunciationTip: PronunciationFeedback | null;
  comprehensionScore: number | null;
  xpEarned: number;
  onComplete: (
    compScore: number,
    xp: number,
    diffWords: DifficultWord[],
    tip: PronunciationFeedback | null
  ) => void;
  onDataLoaded: (
    compScore: number,
    xp: number,
    diffWords: DifficultWord[],
    tip: PronunciationFeedback | null
  ) => void;
}

function FeedbackStep({
  attemptId,
  pronunciationScore,
  fluencyScore,
  onComplete,
  onDataLoaded,
}: FeedbackStepProps) {
  const [localData, setLocalData] = useState<{
    comprehensionScore: number;
    xpEarned: number;
    difficultWords: DifficultWord[];
    pronunciationTip: PronunciationFeedback | null;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const result = await completeLesson(attemptId, pronunciationScore, fluencyScore);
        setLocalData({
          comprehensionScore: result.comprehensionScore,
          xpEarned: result.xpEarned,
          difficultWords: result.difficultWords,
          pronunciationTip: result.pronunciationTip,
        });
        onDataLoaded(
          result.comprehensionScore,
          result.xpEarned,
          result.difficultWords,
          result.pronunciationTip
        );
        // Invalidate topics/progress cache so counts update immediately
        void queryClient.invalidateQueries({ queryKey: ["topics"] });
        void queryClient.invalidateQueries({ queryKey: ["topic"] });
        void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      } catch (err) {
        setError("Could not load feedback. Please try again.");
      } finally {
        setIsLoading(false);
      }
    })();
  // Only run once
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId]);

  if (isLoading) {
    return (
      <View style={styles.stepCentered}>
        <LoadingSpinner label="Calculating your scores..." />
      </View>
    );
  }

  if (error || !localData) {
    return (
      <View style={styles.stepCentered}>
        <Text style={styles.errorTitle}>{error ?? "Something went wrong"}</Text>
        <Button onPress={onComplete.bind(null, 0, 0, [], null)} style={{ marginTop: spacing.md }}>
          Continue anyway
        </Button>
      </View>
    );
  }

  const { comprehensionScore, xpEarned, difficultWords, pronunciationTip } =
    localData;

  return (
    <ScrollView
      contentContainerStyle={styles.stepScroll}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.stepContent}>
        <View style={styles.stepIconHeader}>
          <View style={[styles.stepIconBg, { backgroundColor: "#DCFCE7" }]}>
            <Ionicons name="trophy" size={32} color={colors.success} />
          </View>
          <Text style={styles.stepTitle}>Great effort!</Text>
          <Text style={styles.stepSubtitle}>
            Here are your scores for this lesson.
          </Text>
        </View>

        {/* XP Banner */}
        <View style={styles.xpBanner}>
          <Ionicons name="star" size={24} color="#F59E0B" />
          <Text style={styles.xpBannerText}>+{xpEarned} XP earned!</Text>
        </View>

        {/* Scores */}
        <Card style={styles.scoresCard}>
          <ScoreBar
            label="Pronunciation"
            score={pronunciationScore ?? 0}
          />
          <ScoreBar
            label="Fluency"
            score={fluencyScore ?? 0}
          />
          <ScoreBar
            label="Comprehension"
            score={comprehensionScore}
          />
        </Card>

        {/* Pronunciation Tip */}
        {pronunciationTip && (
          <Card style={styles.tipCard}>
            <View style={styles.tipHeader}>
              <Ionicons name="bulb-outline" size={20} color={colors.accent} />
              <Text style={styles.tipTitle}>Pronunciation tip</Text>
            </View>
            <TouchableOpacity
              onPress={() =>
                Speech.speak(pronunciationTip.word, { language: "en-US" })
              }
              style={styles.tipWord}
              accessibilityLabel={`Tap to hear "${pronunciationTip.word}"`}
            >
              <Text style={styles.tipWordText}>{pronunciationTip.word}</Text>
              <Text style={styles.tipPhonetic}>[{pronunciationTip.phonetic}]</Text>
              <Ionicons name="volume-high-outline" size={16} color={colors.primary} />
            </TouchableOpacity>
            <Text style={styles.tipText}>{pronunciationTip.tip}</Text>
          </Card>
        )}

        {/* Difficult Words */}
        {difficultWords.length > 0 && (
          <View style={styles.difficultWordsSection}>
            <Text style={styles.sectionTitle}>Words to practice</Text>
            <View style={styles.difficultWords}>
              {difficultWords.map((w) => (
                <TouchableOpacity
                  key={w.id}
                  style={styles.difficultWordChip}
                  onPress={() =>
                    Speech.speak(w.word, { language: "en-US" })
                  }
                  accessibilityLabel={`Tap to hear "${w.word}"`}
                >
                  <Ionicons
                    name="volume-medium-outline"
                    size={14}
                    color={colors.primary}
                  />
                  <Text style={styles.difficultWordText}>{w.word}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.difficultWordsHint}>
              Tap a word to hear it. These will appear in your review queue.
            </Text>
          </View>
        )}

        <Button
          onPress={() =>
            onComplete(comprehensionScore, xpEarned, difficultWords, pronunciationTip)
          }
          fullWidth
          size="lg"
          style={styles.ctaButton}
          accessibilityLabel="View summary"
        >
          View summary
        </Button>
      </View>
    </ScrollView>
  );
}

// ─── STEP 5: Summary ──────────────────────────────────────────────────────────

interface SummaryStepProps {
  lesson: { title: string; topic?: { slug?: string } };
  pronunciationScore: number | null;
  fluencyScore: number | null;
  comprehensionScore: number | null;
  xpEarned: number;
  difficultWords: DifficultWord[];
  pronunciationTip: PronunciationFeedback | null;
  questionResponses: QuestionResponse[];
  onBackToTopic: () => void;
  onNextLesson: () => void;
  onTryAgain: () => void;
}

function SummaryStep({
  lesson,
  pronunciationScore,
  fluencyScore,
  comprehensionScore,
  xpEarned,
  difficultWords,
  questionResponses,
  onBackToTopic,
  onNextLesson,
  onTryAgain,
}: SummaryStepProps) {
  const overallScore =
    ((pronunciationScore ?? 0) +
      (fluencyScore ?? 0) +
      (comprehensionScore ?? 0)) /
    3;

  const celebrationMessage = () => {
    if (overallScore >= 8) return "Outstanding! You are doing great!";
    if (overallScore >= 6) return "Well done! Keep practicing!";
    if (overallScore >= 4) return "Good effort! Every practice counts!";
    return "Keep going — you are improving!";
  };

  const correctAnswers = questionResponses.filter((r) => r.isCorrect).length;

  return (
    <ScrollView
      contentContainerStyle={styles.stepScroll}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.stepContent}>
        {/* Celebration */}
        <View style={styles.celebrationContainer}>
          <Text style={styles.celebrationEmoji}>
            {overallScore >= 8 ? "🏆" : overallScore >= 6 ? "⭐" : "💪"}
          </Text>
          <Text style={styles.celebrationTitle}>Lesson complete!</Text>
          <Text style={styles.celebrationMessage}>{celebrationMessage()}</Text>
        </View>

        {/* XP earned */}
        <View style={styles.xpBanner}>
          <Ionicons name="star" size={24} color="#F59E0B" />
          <Text style={styles.xpBannerText}>+{xpEarned} XP earned!</Text>
        </View>

        {/* Final scores */}
        <Card style={styles.scoresCard}>
          <Text style={styles.summaryCardTitle}>Your scores</Text>
          <ScoreBar label="Pronunciation" score={pronunciationScore ?? 0} />
          <ScoreBar label="Fluency" score={fluencyScore ?? 0} />
          <ScoreBar label="Comprehension" score={comprehensionScore ?? 0} />
        </Card>

        {/* Q&A recap */}
        {questionResponses.length > 0 && (
          <Card style={styles.qaCard}>
            <Text style={styles.summaryCardTitle}>
              Questions: {correctAnswers}/{questionResponses.length} correct
            </Text>
            {questionResponses.map((resp, i) => (
              <View key={i} style={styles.qaRow}>
                <Ionicons
                  name={resp.isCorrect ? "checkmark-circle" : "close-circle"}
                  size={18}
                  color={resp.isCorrect ? colors.success : colors.accent}
                />
                <View style={styles.qaContent}>
                  <Text style={styles.qaQuestion} numberOfLines={2}>
                    {resp.questionText}
                  </Text>
                  {resp.aiFeedback && (
                    <Text style={styles.qaFeedback}>{resp.aiFeedback}</Text>
                  )}
                </View>
              </View>
            ))}
          </Card>
        )}

        {/* Actions */}
        {overallScore < 5 ? (
          <>
            <View style={styles.retryBanner}>
              <Ionicons name="information-circle" size={20} color="#92400E" />
              <Text style={styles.retryBannerText}>
                Score below 5 — practice more to unlock the next lesson!
              </Text>
            </View>
            <Button
              onPress={onTryAgain}
              fullWidth
              size="lg"
              style={styles.ctaButton}
              accessibilityLabel="Try this lesson again"
            >
              Try again
            </Button>
            <Button
              onPress={onBackToTopic}
              variant="outline"
              fullWidth
              size="lg"
              accessibilityLabel="Back to topic"
            >
              Back to topic
            </Button>
          </>
        ) : (
          <>
            <Button
              onPress={onNextLesson}
              fullWidth
              size="lg"
              style={styles.ctaButton}
              accessibilityLabel="Next lesson"
            >
              Next lesson
            </Button>
            <Button
              onPress={onBackToTopic}
              variant="outline"
              fullWidth
              size="lg"
              accessibilityLabel="Back to topic"
            >
              Back to topic
            </Button>
          </>
        )}
      </View>
    </ScrollView>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface LegendItemProps {
  label: "CORRECT" | "CLOSE" | "MISSED";
}

function LegendItem({ label }: LegendItemProps) {
  return (
    <View style={styles.legendItem}>
      <View
        style={[
          styles.legendDot,
          { backgroundColor: getWordLabelColor(label) },
        ]}
      />
      <Text style={styles.legendText}>{label.toLowerCase()}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  backBtn: {
    padding: 4,
  },
  headerCenter: {
    flex: 1,
    paddingHorizontal: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  headerStep: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  stepProgress: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.border,
  },
  stepDotActive: {
    backgroundColor: colors.primaryLight,
  },
  stepDotCurrent: {
    backgroundColor: colors.primary,
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.border,
    maxWidth: 40,
  },
  stepLineActive: {
    backgroundColor: colors.primaryLight,
  },
  stepScroll: {
    flexGrow: 1,
  },
  stepContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  stepCentered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  stepIconHeader: {
    alignItems: "center",
    marginBottom: spacing.md,
  },
  stepIconBg: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  stepTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: "center",
    marginBottom: 6,
  },
  stepSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: spacing.md,
  },
  passageCard: {
    marginBottom: spacing.md,
  },
  passageWordRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 2,
  },
  passageWordChip: {
    paddingHorizontal: 3,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 4,
  },
  passageWordChipActive: {
    backgroundColor: "#DDD6FE",
    paddingHorizontal: 7,
    paddingVertical: 4,
    transform: [{ scale: 1.08 }],
  },
  passageText: {
    fontSize: fontSize.base,
    color: colors.text,
    lineHeight: 24,
  },
  passageWordChipText: {
    color: "#5B21B6",
    fontWeight: fontWeight.bold,
  },
  audioControls: {
    alignItems: "center",
    marginBottom: spacing.lg,
    gap: 16,
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.md,
  },
  playButtonActive: {
    backgroundColor: colors.primaryDark,
  },
  replayBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  replayText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  ctaButton: {
    marginTop: spacing.md,
  },
  micControls: {
    alignItems: "center",
    gap: 12,
    marginBottom: spacing.md,
  },
  micButton: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.lg,
  },
  micButtonRecording: {
    backgroundColor: colors.danger,
  },
  micHint: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  switchToText: {
    marginTop: 4,
  },
  switchToTextLabel: {
    fontSize: fontSize.sm,
    color: colors.primary,
    textDecorationLine: "underline",
  },
  textInputGroup: {
    marginBottom: spacing.md,
  },
  textInputLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: 8,
  },
  textInputArea: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: 12,
    fontSize: fontSize.base,
    color: colors.text,
    backgroundColor: colors.surface,
    minHeight: 120,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FEF3C7",
    borderRadius: borderRadius.md,
    padding: 12,
    marginBottom: spacing.md,
  },
  errorBannerText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: "#92400E",
    lineHeight: 20,
  },
  scoredTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: 10,
  },
  scoredWords: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  scoredWord: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  scoredWordText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  scoreLegend: {
    flexDirection: "row",
    gap: 16,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textTransform: "capitalize",
  },
  tapWordHint: {
    fontSize: fontSize.xs,
    color: colors.muted,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  questionProgress: {
    marginBottom: spacing.md,
  },
  questionProgressText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  questionProgressBar: {
    flexDirection: "row",
    gap: 6,
  },
  questionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  questionDotDone: {
    backgroundColor: colors.success,
  },
  questionDotCurrent: {
    backgroundColor: colors.primary,
    width: 24,
    borderRadius: 4,
  },
  questionCard: {
    marginBottom: spacing.sm,
  },
  questionText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    lineHeight: 26,
  },
  passageReminder: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: colors.bg,
    borderRadius: borderRadius.sm,
    padding: 8,
    marginBottom: spacing.sm,
  },
  passageReminderText: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontStyle: "italic",
    lineHeight: 18,
  },
  answerInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: 12,
    fontSize: fontSize.base,
    color: colors.text,
    backgroundColor: colors.surface,
    minHeight: 100,
    textAlignVertical: "top",
  },
  feedbackBubble: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
  },
  feedbackCorrect: {
    backgroundColor: colors.successBg,
    borderColor: "#BBF7D0",
  },
  feedbackIncorrect: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FED7AA",
  },
  feedbackBubbleHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  feedbackBubbleTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  feedbackCorrectTitle: {
    color: colors.success,
  },
  feedbackIncorrectTitle: {
    color: colors.accent,
  },
  feedbackBubbleText: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 22,
  },
  correctedVersion: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.08)",
  },
  correctedLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  correctedText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontStyle: "italic",
  },
  xpBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FEF3C7",
    borderRadius: borderRadius.lg,
    paddingVertical: 12,
    marginBottom: spacing.md,
  },
  xpBannerText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: "#92400E",
  },
  scoresCard: {
    marginBottom: spacing.md,
  },
  tipCard: {
    marginBottom: spacing.md,
  },
  tipHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  tipTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  tipWord: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.bg,
    borderRadius: borderRadius.md,
    padding: 10,
    marginBottom: 10,
  },
  tipWordText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  tipPhonetic: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    flex: 1,
  },
  tipText: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 22,
  },
  difficultWordsSection: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: 10,
  },
  difficultWords: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  difficultWordChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.primaryBg,
    borderRadius: borderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  difficultWordText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  difficultWordsHint: {
    fontSize: fontSize.xs,
    color: colors.muted,
  },
  celebrationContainer: {
    alignItems: "center",
    marginBottom: spacing.md,
  },
  celebrationEmoji: {
    fontSize: 64,
    marginBottom: 8,
  },
  celebrationTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: 6,
  },
  celebrationMessage: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
  },
  summaryCardTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  qaCard: {
    marginBottom: spacing.md,
  },
  qaRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  qaContent: {
    flex: 1,
  },
  qaQuestion: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 3,
  },
  qaFeedback: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontStyle: "italic",
    lineHeight: 18,
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
  speedSelectorRow: {
    marginBottom: spacing.md,
  },
  speedSelectorLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  speedButtons: {
    flexDirection: "row",
    gap: 6,
    paddingRight: 4,
  },
  speedBtn: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  speedBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryBg,
  },
  speedBtnText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  speedBtnTextActive: {
    color: colors.primary,
  },
  voiceSelectorSection: {
    marginBottom: spacing.md,
  },
  voiceSelectorLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  voiceSelectorRow: {
    gap: 8,
    paddingRight: spacing.sm,
  },
  voiceChip: {
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minWidth: 68,
  },
  voiceChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryBg,
  },
  voiceChipFlag: {
    fontSize: 24,
    marginBottom: 4,
    lineHeight: 28,
  },
  voiceChipLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    textAlign: "center",
  },
  voiceChipLabelActive: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  retryBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FEF3C7",
    borderRadius: borderRadius.md,
    padding: 12,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  retryBannerText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: "#92400E",
    lineHeight: 20,
  },
  listenAgainSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: 10,
  },
  listenAgainLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: 4,
  },
  listenAgainBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryBg,
  },
  listenAgainBtnText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
});

export default function LessonRoute(): React.ReactElement {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const key = Array.isArray(slug) ? slug[0] : (slug ?? "unknown");
  return <LessonPlayerScreen key={key} />;
}
