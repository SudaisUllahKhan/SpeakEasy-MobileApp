// SpeakEasy Mobile — Shared TypeScript types
// Mirrors s:\SpeakEasy\speakeasy\types\index.ts

export type Role = "STUDENT" | "TEACHER" | "ADMIN";
export type Level = "A1" | "A2" | "B1";
export type Accent = "US" | "UK" | "AU" | "IN";
export type QuestionType =
  | "FACTUAL"
  | "INFERENCE"
  | "PERSONAL"
  | "REPETITION"
  | "PARAPHRASE";

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: Role;
  level: Level;
  nativeLanguage: string | null;
  preferredAccent: Accent;
  audioSpeed: number;
  streakCount: number;
  totalXP: number;
  onboardingDone: boolean;
  isPremium: boolean;
  badges: Badge[];
  createdAt: string;
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  earnedAt: string;
}

export interface Topic {
  id: string;
  name: string;
  slug: string;
  icon: string;
  sortOrder: number;
  language: string;
  lessonsCount?: number;
  completedCount?: number;
}

export interface Lesson {
  id: string;
  title: string;
  slug: string;
  level: Level;
  topicId: string;
  passageText: string;
  audioUrl: string | null;
  audioUrlUK: string | null;
  durationSeconds: number | null;
  sortOrder: number;
  isPublished: boolean;
  language: string;
  topic?: Topic;
}

export type LessonStatus = "locked" | "available" | "completed";

export interface LessonWithStatus extends Lesson {
  status: LessonStatus;
  bestPronunciation?: number;
  bestFluency?: number;
  bestComprehension?: number;
  attempts?: number;
}

export interface LessonAttempt {
  id: string;
  userId: string;
  lessonId: string;
  readingAudioUrl: string | null;
  readingTranscript: string | null;
  pronunciationScore: number | null;
  fluencyScore: number | null;
  comprehensionScore: number | null;
  xpEarned: number;
  readingDurationMs: number | null;
  isComplete: boolean;
  attemptedAt: string;
  questionResponses?: QuestionResponse[];
}

export interface QuestionResponse {
  id: string;
  attemptId: string;
  questionText: string;
  questionType: QuestionType;
  expectedAnswer: string | null;
  studentAudioUrl: string | null;
  studentTranscript: string | null;
  isCorrect: boolean;
  confidenceScore: number | null;
  aiFeedback: string | null;
  correctedVersion: string | null;
}

export interface DifficultWord {
  id: string;
  userId: string;
  word: string;
  phonetic: string | null;
  correctAudioUrl: string | null;
  lessonSlug: string | null;
  timesCorrect: number;
  timesIncorrect: number;
  nextReviewAt: string;
  isMastered: boolean;
}

export interface UserProgress {
  id: string;
  userId: string;
  topicId: string;
  lessonsCompleted: number;
  avgPronunciation: number;
  avgFluency: number;
  avgComprehension: number;
  lastActivityAt: string;
  topic?: Topic;
}

// ─── AI Service Types ─────────────────────────────────────────────────────────

export interface GeneratedQuestion {
  text: string;
  type: QuestionType;
  expectedAnswer: string | null;
}

export interface AnswerEvaluation {
  isCorrect: boolean;
  confidence: number;
  feedback: string;
  correctedVersion: string | null;
}

export interface PronunciationFeedback {
  word: string;
  phonetic: string;
  tip: string;
  isCommonForLanguage: boolean;
}

// ─── STT / Scoring ────────────────────────────────────────────────────────────

export type WordLabel = "CORRECT" | "CLOSE" | "MISSED" | "ADDED";

export interface ScoredWord {
  word: string;
  label: WordLabel;
  confidence: number;
}

// ─── Lesson Player State ──────────────────────────────────────────────────────

export type LessonStep = "listen" | "read" | "questions" | "feedback" | "summary";

export interface LessonPlayerState {
  step: LessonStep;
  attemptId: string | null;
  replaysUsed: number;
  transcript: string | null;
  scoredWords: ScoredWord[];
  pronunciationScore: number | null;
  fluencyScore: number | null;
  questions: GeneratedQuestion[];
  questionIndex: number;
  questionResponses: QuestionResponse[];
  comprehensionScore: number | null;
  difficultWords: DifficultWord[];
  pronunciationTip: PronunciationFeedback | null;
  xpEarned: number;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface TopicProgress {
  topicId: string;
  topicName: string;
  topicIcon: string;
  topicSlug: string;
  lessonsCompleted: number;
  totalLessons: number;
  avgPronunciation: number;
}

export interface DashboardData {
  streakCount: number;
  totalXP: number;
  level: Level;
  difficultWordsCount: number;
  topicsProgress: TopicProgress[];
}

// ─── Settings ────────────────────────────────────────────────────────────────

export interface UserSettings {
  name: string | null;
  email?: string;
  nativeLanguage: string | null;
  preferredAccent: Accent;
  audioSpeed: number;
  level: Level;
}

// ─── Score Reading Response ───────────────────────────────────────────────────

export interface ScoreReadingResponse {
  attemptId: string;
  scoredWords: ScoredWord[];
  pronunciationScore: number;
  fluencyScore: number;
  transcript: string;
}

// ─── Complete Lesson Response ─────────────────────────────────────────────────

export interface CompleteLessonResponse {
  comprehensionScore: number;
  xpEarned: number;
  difficultWords: DifficultWord[];
  pronunciationTip: PronunciationFeedback | null;
}

// ─── API Response Wrappers ────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  data: T;
  ok: true;
}

export interface ApiError {
  error: string;
  code?: string;
  ok: false;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
