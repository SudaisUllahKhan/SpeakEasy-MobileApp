// SpeakEasy Mobile — Zustand auth store with SecureStore persistence

import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import type { UserProfile, Level, Accent } from "./types";

const SESSION_TOKEN_KEY = "sessionToken";

interface AuthState {
  token: string | null;
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthActions {
  setToken: (token: string | null) => Promise<void>;
  setUser: (user: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  loadFromStorage: () => Promise<void>;
  logout: () => Promise<void>;
  updateUserSettings: (
    settings: Partial<Pick<UserProfile, "name" | "nativeLanguage" | "preferredAccent" | "audioSpeed" | "level">>
  ) => void;
}

export type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>((set, get) => ({
  token: null,
  user: null,
  isLoading: true,
  isAuthenticated: false,

  setToken: async (token: string | null) => {
    try {
      if (token) {
        await SecureStore.setItemAsync(SESSION_TOKEN_KEY, token);
      } else {
        await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
      }
      set({ token, isAuthenticated: !!token });
    } catch (err) {
      console.error("[authStore] setToken error:", err);
    }
  },

  setUser: (user: UserProfile | null) => {
    set({ user, isAuthenticated: !!get().token });
  },

  setLoading: (isLoading: boolean) => {
    set({ isLoading });
  },

  loadFromStorage: async () => {
    set({ isLoading: true });
    try {
      const token = await SecureStore.getItemAsync(SESSION_TOKEN_KEY);
      if (token) {
        set({ token, isAuthenticated: true });

        // Try to hydrate user profile from the API
        try {
          const { getUserSettings } = await import("./api");
          const settings = await getUserSettings();
          const user: UserProfile = {
            id: "",
            email: settings.email ?? "",
            name: settings.name,
            image: null,
            role: "STUDENT",
            level: settings.level as Level,
            nativeLanguage: settings.nativeLanguage,
            preferredAccent: settings.preferredAccent as Accent,
            audioSpeed: settings.audioSpeed,
            streakCount: 0,
            totalXP: 0,
            onboardingDone: true,
            isPremium: false,
            badges: [],
            createdAt: new Date().toISOString(),
          };
          set({ user });
        } catch {
          // Token may be expired — clear it
          await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
          set({ token: null, isAuthenticated: false, user: null });
        }
      } else {
        set({ token: null, isAuthenticated: false, user: null });
      }
    } catch (err) {
      console.error("[authStore] loadFromStorage error:", err);
      set({ token: null, isAuthenticated: false, user: null });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    try {
      await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
    } catch (err) {
      console.error("[authStore] logout error:", err);
    }
    set({ token: null, user: null, isAuthenticated: false });
  },

  updateUserSettings: (
    settings: Partial<Pick<UserProfile, "name" | "nativeLanguage" | "preferredAccent" | "audioSpeed" | "level">>
  ) => {
    const currentUser = get().user;
    if (!currentUser) return;
    set({
      user: { ...currentUser, ...settings },
    });
  },
}));
