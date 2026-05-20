# CLAUDE.md — SpeakEasy Mobile

Instructions for Claude Code when working in this repository.

## What this project is

React Native / Expo app (SDK 52) for AI-powered English speaking practice.
It talks exclusively to a deployed Next.js backend: `https://speak-easy-khaki.vercel.app`

## How to run (Expo Go + Metro — the only supported dev method)

### One-command start
```bash
npm install && npx expo start --tunnel
```

### If port 8081 is busy
```bash
npx kill-port 8081 8082 && npx expo start --tunnel
```

### If tunnel fails (ngrok error)
```bash
npm install @expo/ngrok@^4.0.1 --save-dev && npx expo start --tunnel
```

After Metro starts, a **QR code** appears in the terminal.
- Android: open Expo Go → Scan QR Code
- iPhone: open the **Camera app** → point at the QR code → tap the Expo Go banner

### Sign in — DEV LOGIN only (Google OAuth does NOT work in Expo Go)
1. On the login screen, scroll to the bottom — you will see a DEV LOGIN section
2. The email field is pre-filled — keep it or type your own email
3. Tap **DEV LOGIN (skip auth)**

Pre-approved emails (server allows these without any config change):
- `sudais.khan@consult-first.com`
- `sudaiskhan1@gmail.com`
- `muneeb.iqbal@consult-first.com`
- `dev@speakeasy.test`
- `test@speakeasy.test`

To use a different email, add it to the allowlist in:
`speakeasy/app/api/auth/dev-login/route.ts` → `ALLOWED_DEV_EMAILS` set.

## Environment variables

`.env.local` is committed. It contains only one variable:
```
EXPO_PUBLIC_API_URL=https://speak-easy-khaki.vercel.app
```
No other env setup is needed to run the app.

## Key commands

```bash
npm install          # install dependencies
npx expo start --tunnel   # start Metro with tunnel (works over any network)
npx expo start --lan      # start Metro on LAN (phone must be on same Wi-Fi)
npm run type-check   # tsc --noEmit — must pass before any commit
npm run lint         # ESLint
```

## Project structure

```
app/
  (auth)/login.tsx         # Login screen — Google OAuth + DEV LOGIN
  (app)/dashboard.tsx      # Home tab
  (app)/settings.tsx       # Settings (level, language, playback speed)
  (app)/lessons/[slug].tsx # 5-step lesson player (Listen→Read→Questions→Feedback→Summary)
  (app)/topics/            # Topic list + topic detail
  (app)/progress.tsx       # Progress charts
  (app)/review.tsx         # Spaced-repetition word review
  auth/callback.tsx        # OAuth deep-link handler
components/ui/
  SkeletonLoader.tsx        # Branded loading screen (ModernLoader) — shown while data loads
lib/
  api.ts                   # All API calls (uses Bearer token + EXPO_PUBLIC_API_URL)
  authStore.ts             # Zustand auth — token in SecureStore, user profile in memory
  queryClient.ts           # React Query config (staleTime: 5 min)
  theme.ts                 # Design tokens (colors, spacing, typography)
```

## Architecture notes

- **Auth**: session token stored in `expo-secure-store`. Sent as `Authorization: Bearer <token>` on every API call.
- **Offline**: React Query caches data for 5 minutes. No offline writes.
- **Audio**: `expo-av` plays TTS audio from the backend. Speed is applied client-side via `setRateAsync`.
- **Recording**: `expo-av` records audio → uploaded to `/api/attempts/:id/reading` for Whisper scoring.
- **New arch disabled**: `newArchEnabled: false` in app.json for compatibility with all packages.

## Known Expo Go limitations

| Feature | Expo Go | Real APK |
|---------|---------|----------|
| Google OAuth | Opens web browser (broken) | Works ✓ |
| Apple Sign-In | Not available | Works on iOS ✓ |
| DEV LOGIN | Works ✓ | Not shown in prod |
| Audio recording | Works ✓ | Works ✓ |
| Push notifications | Limited | Works ✓ |

## TypeScript

Strict mode. Run `npm run type-check` before committing. No `any` without a comment explaining why.
