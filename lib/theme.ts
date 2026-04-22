// SpeakEasy design system — colour tokens and spacing

export const colors = {
  primary: "#7C3AED",
  primaryLight: "#A78BFA",
  primaryDark: "#5B21B6",
  primaryBg: "#EDE9FE",
  accent: "#F97316",
  success: "#22C55E",
  successBg: "#DCFCE7",
  danger: "#EF4444",
  dangerBg: "#FEE2E2",
  warning: "#F59E0B",
  warningBg: "#FEF3C7",
  bg: "#FAF8FF",
  surface: "#FFFFFF",
  border: "#E9D5FF",
  text: "#1A0533",
  textSecondary: "#6B7280",
  muted: "#9CA3AF",
  white: "#FFFFFF",
  black: "#000000",
  // Level colours
  a1: "#10B981",
  a2: "#3B82F6",
  b1: "#8B5CF6",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const borderRadius = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  xxl: 30,
  xxxl: 36,
} as const;

export const fontWeight = {
  normal: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
  extrabold: "800" as const,
};

export const shadow = {
  sm: {
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

export const levelColors: Record<string, string> = {
  A1: colors.a1,
  A2: colors.a2,
  B1: colors.b1,
};

export const levelBgColors: Record<string, string> = {
  A1: "#D1FAE5",
  A2: "#DBEAFE",
  B1: "#EDE9FE",
};

export type ColorToken = keyof typeof colors;
