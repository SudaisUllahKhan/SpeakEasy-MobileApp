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
    // Try in-memory Zustand store first (more reliable on Android new arch)
    const { useAuthStore } = await import("./authStore");
    const storeToken = useAuthStore.getState().token;
    if (storeToken) return storeToken;
    return await SecureStore.getItemAsync("sessionToken");
  } catch {
    return null;
  }
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  timeoutMs = 10000
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
    headers["Cookie"] = `next-auth.session-token=${token}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      credentials: "include",
      signal: controller.signal,
    });
  } catch (err: unknown) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Request timed out. Check your connection.");
    }
    throw new Error("Network request failed. Is the server running?");
  }
  clearTimeout(timer);

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    try {
      const json = (await response.json()) as { error?: string };
      errorMessage = json.error ?? errorMessage;
    } catch {
      // ignore JSON parse errors
    }
    // Auto-logout on 401 so user sees login screen instead of endless errors
    if (response.status === 401) {
      const { useAuthStore } = await import("./authStore");
      void useAuthStore.getState().logout();
    }
    throw new ApiError(errorMessage, response.status);
  }

  return response.json() as Promise<T>;
}

async function apiFetchFormData<T>(
  path: string,
  formData: FormData,
  timeoutMs = 90000
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {};

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
    headers["Cookie"] = `next-auth.session-token=${token}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers,
      body: formData,
      credentials: "include",
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === "AbortError") {
      throw new ApiError("Scoring timed out. Please try again.", 408);
    }
    throw err;
  }
  clearTimeout(timer);

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

export async function getGoogleAuthUrl(mobileRedirect: string): Promise<string> {
  // /google-auth handles CSRF in the browser's own cookie context (avoids cookie jar mismatch).
  // mobileRedirect tells mobile-token which scheme to use:
  //   - Expo Go:   exp://localhost:8090/--/auth/callback
  //   - Standalone: speakeasy://auth/callback
  return `${API_URL}/google-auth?mobileRedirect=${encodeURIComponent(mobileRedirect)}`;
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
  const response = await apiFetch<{
    data: Array<
      Lesson & {
        completed: boolean;
        available: boolean;
        bestScores: {
          pronunciationScore: number | null;
          fluencyScore: number | null;
          comprehensionScore: number | null;
        } | null;
      }
    >;
    topic: Topic;
  }>(`/api/topics/${slug}/lessons`);

  const lessons: LessonWithStatus[] = response.data.map((l) => ({
    ...l,
    status: l.completed ? "completed" : l.available ? "available" : "locked",
    bestPronunciation: l.bestScores?.pronunciationScore ?? undefined,
    bestFluency: l.bestScores?.fluencyScore ?? undefined,
    bestComprehension: l.bestScores?.comprehensionScore ?? undefined,
  }));

  return { topic: response.topic, lessons };
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
