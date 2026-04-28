// SpeakEasy Mobile — API client
// All requests include the session token from SecureStore

import * as SecureStore from "expo-secure-store";
import type {
  UserProfile,
  UserSettings,
  Topic,
  LessonWithStatus,
  Lesson,
  DashboardData,
  ScoreReadingResponse,
  GeneratedQuestion,
  AnswerEvaluation,
  CompleteLessonResponse,
  DifficultWord,
  Level,
  QuestionType,
} from "./types";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "https://your-speakeasy-domain.com";

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync("sessionToken");
  } catch {
    return null;
  }
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
    // Also pass as cookie for NextAuth session strategy
    headers["Cookie"] = `next-auth.session-token=${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    try {
      const json = (await response.json()) as { error?: string };
      errorMessage = json.error ?? errorMessage;
    } catch {
      // ignore JSON parse errors
    }
    throw new ApiError(errorMessage, response.status);
  }

  return response.json() as Promise<T>;
}

async function apiFetchFormData<T>(
  path: string,
  formData: FormData
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {};

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
    headers["Cookie"] = `next-auth.session-token=${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers,
    body: formData,
    credentials: "include",
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    try {
      const json = (await response.json()) as { error?: string };
      errorMessage = json.error ?? errorMessage;
    } catch {
      // ignore
    }
    throw new ApiError(errorMessage, response.status);
  }

  return response.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function sendMagicLink(email: string): Promise<void> {
  // Call NextAuth's email sign-in endpoint (CSRF token required)
  const csrfResponse = await fetch(`${API_URL}/api/auth/csrf`);
  const { csrfToken } = (await csrfResponse.json()) as { csrfToken: string };

  const formBody = new URLSearchParams({
    email,
    csrfToken,
    callbackUrl: `${API_URL}/api/auth/callback/email`,
    json: "true",
  });

  const response = await fetch(`${API_URL}/api/auth/signin/email`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formBody.toString(),
  });

  if (!response.ok) {
    throw new ApiError("Failed to send magic link", response.status);
  }
}

export async function getGoogleAuthUrl(): Promise<string> {
  const csrfResponse = await fetch(`${API_URL}/api/auth/csrf`);
  const { csrfToken } = (await csrfResponse.json()) as { csrfToken: string };

  const params = new URLSearchParams({
    callbackUrl: `${API_URL}/api/auth/mobile-token`,
    csrfToken,
  });

  return `${API_URL}/api/auth/signin/google?${params.toString()}`;
}

export async function exchangeSessionToken(
  token: string
): Promise<{ sessionToken: string }> {
  // Store the session cookie as a token
  return { sessionToken: token };
}

// ─── User ─────────────────────────────────────────────────────────────────────

export async function getUserSettings(): Promise<UserSettings> {
  const data = await apiFetch<{ user: UserSettings }>("/api/user/settings-read");
  return data.user;
}

export async function getUser(): Promise<UserProfile> {
  const settings = await getUserSettings();
  return {
    id: "",
    email: settings.email ?? "",
    name: settings.name ?? null,
    image: null,
    role: "STUDENT",
    level: settings.level,
    nativeLanguage: settings.nativeLanguage,
    preferredAccent: settings.preferredAccent,
    audioSpeed: settings.audioSpeed,
    streakCount: 0,
    totalXP: 0,
    onboardingDone: true,
    isPremium: false,
    badges: [],
    createdAt: new Date().toISOString(),
  };
}

export async function saveSettings(
  settings: Partial<UserSettings>
): Promise<UserSettings> {
  const data = await apiFetch<{ user: UserSettings }>("/api/user/settings", {
    method: "PATCH",
    body: JSON.stringify(settings),
  });
  return data.user;
}

export async function deleteAccount(): Promise<void> {
  await apiFetch("/api/user/delete", { method: "DELETE" });
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export async function getDashboard(): Promise<DashboardData> {
  return apiFetch<DashboardData>("/api/dashboard");
}

// ─── Topics ───────────────────────────────────────────────────────────────────

export async function getTopics(): Promise<Topic[]> {
  const data = await apiFetch<{ data: Topic[]; ok: boolean }>("/api/topics");
  return data.data;
}

export async function getTopicLessons(slug: string): Promise<{
  topic: Topic;
  lessons: LessonWithStatus[];
}> {
  return apiFetch(`/api/topics/${slug}`);
}

// ─── Lessons ─────────────────────────────────────────────────────────────────

export async function getLesson(slug: string): Promise<Lesson> {
  const data = await apiFetch<{ data: Lesson }>(`/api/lessons/${slug}`);
  return data.data;
}

// ─── Score Reading (JSON path — client-scored) ────────────────────────────────

export async function scoreReadingJson(payload: {
  lessonId: string;
  passageText: string;
  level: Level;
  nativeLanguage: string;
  transcript: string;
  durationMs: number;
  scoredWords: { word: string; label: string; confidence: number }[];
  pronunciationScore: number;
  fluencyScore: number;
}): Promise<ScoreReadingResponse> {
  return apiFetch<ScoreReadingResponse>("/api/lessons/score-reading", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ─── Score Reading (FormData path — Whisper) ──────────────────────────────────

export async function scoreReadingAudio(
  audioUri: string,
  lessonId: string,
  passageText: string,
  level: Level
): Promise<ScoreReadingResponse> {
  const formData = new FormData();

  formData.append("audio", {
    uri: audioUri,
    type: "audio/m4a",
    name: "recording.m4a",
  } as unknown as Blob);
  formData.append("lessonId", lessonId);
  formData.append("passageText", passageText);
  formData.append("level", level);

  return apiFetchFormData<ScoreReadingResponse>(
    "/api/lessons/score-reading",
    formData
  );
}

// ─── Questions ────────────────────────────────────────────────────────────────

export async function generateQuestions(
  lessonId: string,
  level: Level
): Promise<GeneratedQuestion[]> {
  const data = await apiFetch<{ questions: GeneratedQuestion[] }>(
    "/api/lessons/generate-questions",
    {
      method: "POST",
      body: JSON.stringify({ lessonId, level }),
    }
  );
  return data.questions;
}

export async function evaluateAnswer(payload: {
  attemptId: string;
  questionText: string;
  questionType: QuestionType;
  expectedAnswer: string | null;
  studentTranscript: string;
  nativeLanguage: string | null;
  passageText?: string;
}): Promise<AnswerEvaluation & { id: string }> {
  return apiFetch<AnswerEvaluation & { id: string }>(
    "/api/lessons/evaluate-answer",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

// ─── Complete Lesson ──────────────────────────────────────────────────────────

export async function completeLesson(
  attemptId: string,
  pronunciationScore: number | null,
  fluencyScore: number | null
): Promise<CompleteLessonResponse> {
  return apiFetch<CompleteLessonResponse>("/api/lessons/complete", {
    method: "POST",
    body: JSON.stringify({ attemptId, pronunciationScore, fluencyScore }),
  });
}

// ─── Review ───────────────────────────────────────────────────────────────────

export async function getReviewWords(): Promise<DifficultWord[]> {
  const data = await apiFetch<{ words: DifficultWord[] }>("/api/review/words");
  return data.words;
}

export async function submitReviewResult(
  wordId: string,
  isCorrect: boolean
): Promise<DifficultWord> {
  const data = await apiFetch<{ word: DifficultWord }>("/api/review/words", {
    method: "POST",
    body: JSON.stringify({ wordId, isCorrect }),
  });
  return data.word;
}

// ─── Progress ────────────────────────────────────────────────────────────────

export async function getProgress(): Promise<{
  streakCount: number;
  totalXP: number;
  level: Level;
  difficultWordsCount: number;
  topicsProgress: {
    topicId: string;
    topicName: string;
    topicIcon: string;
    topicSlug: string;
    lessonsCompleted: number;
    totalLessons: number;
    avgPronunciation: number;
  }[];
}> {
  return apiFetch("/api/dashboard");
}
