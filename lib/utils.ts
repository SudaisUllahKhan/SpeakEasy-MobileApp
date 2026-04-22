// Utility helpers for SpeakEasy Mobile

import type { ScoredWord, WordLabel, Level } from "./types";

// ─── Greeting ────────────────────────────────────────────────────────────────

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// ─── Level colours ────────────────────────────────────────────────────────────

export function getLevelColor(level: Level): string {
  switch (level) {
    case "A1":
      return "#10B981";
    case "A2":
      return "#3B82F6";
    case "B1":
      return "#8B5CF6";
    default:
      return "#6B7280";
  }
}

// ─── Score colour ────────────────────────────────────────────────────────────

export function getScoreColor(score: number): string {
  if (score >= 8) return "#22C55E";
  if (score >= 6) return "#F59E0B";
  if (score >= 4) return "#F97316";
  return "#EF4444";
}

// ─── Word label colour ────────────────────────────────────────────────────────

export function getWordLabelColor(label: WordLabel): string {
  switch (label) {
    case "CORRECT":
      return "#22C55E";
    case "CLOSE":
      return "#F59E0B";
    case "MISSED":
      return "#EF4444";
    case "ADDED":
      return "#3B82F6";
    default:
      return "#6B7280";
  }
}

export function getWordLabelBg(label: WordLabel): string {
  switch (label) {
    case "CORRECT":
      return "#DCFCE7";
    case "CLOSE":
      return "#FEF3C7";
    case "MISSED":
      return "#FEE2E2";
    case "ADDED":
      return "#DBEAFE";
    default:
      return "#F3F4F6";
  }
}

// ─── Simple client-side pronunciation scoring ─────────────────────────────────
// Used as fallback when audio upload fails

export function scoreWordsByDiff(
  expectedText: string,
  spokenText: string
): ScoredWord[] {
  const expected = expectedText
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);
  const spoken = spokenText
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);

  const spokenSet = new Set(spoken);
  const results: ScoredWord[] = [];

  for (const word of expected) {
    if (spokenSet.has(word)) {
      results.push({ word, label: "CORRECT", confidence: 0.95 });
    } else {
      // Check for close match (edit distance ≤ 2)
      const isClose = spoken.some((s) => levenshtein(word, s) <= 2);
      results.push({
        word,
        label: isClose ? "CLOSE" : "MISSED",
        confidence: isClose ? 0.6 : 0.1,
      });
    }
  }

  return results;
}

export function calcPronunciationScore(words: ScoredWord[]): number {
  if (words.length === 0) return 5;
  const correct = words.filter((w) => w.label === "CORRECT").length;
  const close = words.filter((w) => w.label === "CLOSE").length;
  const ratio = (correct + close * 0.5) / words.length;
  return Math.max(1, Math.min(10, Math.round(ratio * 10)));
}

export function calcFluencyScore(wpm: number, level: Level): number {
  const targets: Record<Level, number> = { A1: 90, A2: 110, B1: 130 };
  const target = targets[level];
  const ratio = wpm / target;
  if (ratio >= 0.9 && ratio <= 1.2) return 9;
  if (ratio >= 0.75 && ratio <= 1.4) return 7;
  if (ratio >= 0.5) return 5;
  return 3;
}

// ─── Levenshtein edit distance ────────────────────────────────────────────────

function levenshtein(a: string, b: string): number {
  const matrix: number[][] = Array.from({ length: b.length + 1 }, (_, i) =>
    Array.from({ length: a.length + 1 }, (__, j) => (i === 0 ? j : j === 0 ? i : 0))
  );

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] =
        b[i - 1] === a[j - 1]
          ? matrix[i - 1][j - 1]
          : Math.min(
              matrix[i - 1][j - 1] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j] + 1
            );
    }
  }

  return matrix[b.length][a.length];
}

// ─── XP display ───────────────────────────────────────────────────────────────

export function formatXP(xp: number): string {
  if (xp >= 1000) return `${(xp / 1000).toFixed(1)}k`;
  return xp.toString();
}

// ─── Motivational quotes ──────────────────────────────────────────────────────

const QUOTES = [
  "Every expert was once a beginner. Keep speaking!",
  "The best time to learn English is now. The second best time is still now.",
  "Mistakes are proof that you are trying.",
  "Fluency comes from practice, not perfection.",
  "You don't have to be great to start, but you have to start to be great.",
  "One lesson a day keeps language barriers away.",
  "Your accent is beautiful — keep talking!",
  "Progress, not perfection.",
  "A different language is a different vision of life.",
  "The more you practice, the luckier you get.",
];

export function getDailyQuote(): string {
  const day = new Date().getDate();
  return QUOTES[day % QUOTES.length];
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}

export function pluralize(
  count: number,
  singular: string,
  plural?: string
): string {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}
