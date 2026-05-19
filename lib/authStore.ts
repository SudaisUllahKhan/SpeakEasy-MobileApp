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
      // Clear any stale user immediately so previous user's data never shows
      set({ token, isAuthenticated: !!token, user: null });

      // Fetch fresh profile for the new token right away
      if (token) {
        void import("./api").then(async ({ getUserSettings }) => {
          try {
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
            // Non-fatal — user stays null until next refresh
          }
        });
      }
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
    const alreadyHasToken = !!get().token;
    if (!alreadyHasToken) set({ isLoading: true });
    try {
      // Read from SecureStore only — fast (<100ms), never blocks on network.
      const token = alreadyHasToken
        ? get().token
        : await SecureStore.getItemAsync(SESSION_TOKEN_KEY);

      if (token) {
        set({ token, isAuthenticated: true });

        // Fetch user profile in the background — never block the splash screen on a
        // network call. If the server is slow to start the user still sees the app.
        void import("./api").then(async ({ getUserSettings }) => {
          try {
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
            // Network unavailable — user is still authenticated, they'll see fresh
            // data on next successful API call.
          }
        });
      } else {
        // SecureStore returned null — only clear auth if setToken() didn't win a race.
        if (!get().token) {
          set({ token: null, isAuthenticated: false, user: null });
        }
      }
    } catch (err) {
      console.error("[authStore] loadFromStorage error:", err);
      if (!get().token) {
        set({ token: null, isAuthenticated: false, user: null });
      }
    } finally {
      // Always unblock the UI after the SecureStore read — never wait for network.
      if (!alreadyHasToken) set({ isLoading: false });
    }
  },

  logout: async () => {
    const currentToken = get().token;
    // Kill the server-side session so Chrome Custom Tabs' shared cookie
    // doesn't return the old user's token on the next Google OAuth flow.
    if (currentToken) {
      void import("./api").then(({ mobileSignout }) => mobileSignout(currentToken));
    }
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
