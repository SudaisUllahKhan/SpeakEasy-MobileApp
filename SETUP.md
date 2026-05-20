# SpeakEasy Mobile — Dev Setup (Expo Go)

This guide gets the app running on your phone using **Expo Go** and Metro bundler.
No APK build needed.

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 18 or 20 LTS | https://nodejs.org |
| npm | bundled with Node | — |
| Expo Go | latest | [Android](https://play.google.com/store/apps/details?id=host.exp.exponent) · [iOS](https://apps.apple.com/app/expo-go/id982107779) |

---

## 1 — Clone the repo

```bash
git clone https://github.com/SudaisUllahKhan/SpeakEasy-MobileApp.git
cd SpeakEasy-MobileApp
```

---

## 2 — Install dependencies

```bash
npm install
```

> The `.env.local` file is already committed and pre-configured with the correct
> API URL (`https://speak-easy-khaki.vercel.app`). No manual env setup needed.

---

## 3 — Start Metro

**Option A — Tunnel (works on any network, phone doesn't need same Wi-Fi):**
```bash
npx expo start --tunnel
```

**Option B — LAN (faster, requires phone and PC on same Wi-Fi):**
```bash
npx expo start --lan
```

Metro will start and display a QR code in the terminal.

---

## 4 — Open on your phone

1. Open the **Expo Go** app on your phone
2. Tap **Scan QR Code**
3. Point it at the QR code in your terminal
4. Wait ~30 seconds for the JS bundle to download

---

## 5 — Sign in

Google OAuth does **not** work inside Expo Go (it redirects to the web app).
Use **DEV LOGIN** instead:

1. On the login screen scroll down — you'll see a **DEV LOGIN** box
2. The email field is pre-filled — change it to your own email if you want
3. Tap **DEV LOGIN (skip auth)**
4. You're in ✓

> DEV LOGIN creates a real account in the database for whichever email you enter.
> It works for these emails out of the box:
> - `sudais.khan@consult-first.com`
> - `sudaiskhan1@gmail.com`
> - `dev@speakeasy.test`
> - `test@speakeasy.test`
>
> To add your own email, ask Sudais to add it to the allowlist on the server.

---

## 6 — Hot reload

Any code change you save is automatically reflected in Expo Go via **Fast Refresh**.
To force a full reload: **shake the phone → Reload**.

---

## Common Issues

### `CommandError: failed to start tunnel`
```bash
npm install @expo/ngrok@^4.0.1 --save-dev
npx expo start --tunnel
```

### Port 8081 already in use
```bash
npx kill-port 8081 8082
npx expo start --tunnel
```

### Old APK interfering (QR code opens wrong app)
Uninstall any existing SpeakEasy APK from your phone, then rescan.

### "Dev Login Error: Not available"
The web backend needs to be deployed with the latest code.
Ask Sudais to push and redeploy to Vercel.

---

## Project Structure (mobile)

```
speakeasy-mobile/
├── app/
│   ├── (auth)/        # Login screen
│   ├── (app)/         # Main tabs: Dashboard, Topics, Review, Progress, Settings
│   │   └── lessons/   # Lesson player (5-step flow)
│   └── auth/callback  # OAuth deep-link handler
├── components/ui/     # Shared UI: SkeletonLoader, Button, etc.
├── lib/
│   ├── api.ts         # All API calls to the Next.js backend
│   ├── authStore.ts   # Zustand auth state + SecureStore persistence
│   └── queryClient.ts # React Query client (5-min staleTime)
└── .env.local         # EXPO_PUBLIC_API_URL (committed, no secrets)
```

---

## Backend (for reference)

The mobile app talks to the Next.js web app deployed on Vercel:
`https://speak-easy-khaki.vercel.app`

Web app repo: `https://github.com/muneebiqbalcf/SpeakEasy2`
