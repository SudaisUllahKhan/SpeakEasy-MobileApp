# SpeakEasy Mobile App

AI-powered English speaking practice for ESL learners. Built with Expo / React Native.

---

## For Muneeb — How to run this on your Mac and iPhone

### Prerequisites

Install these once on your Mac:

| Tool | Install command | Why |
|---|---|---|
| **Node.js 18+** | Download from [nodejs.org](https://nodejs.org) | JavaScript runtime |
| **EAS CLI** | `npm install -g eas-cli` | Build & deploy |
| **Expo Go** (iPhone) | Download from App Store | Run the app instantly without a build |

Verify Node is installed:
```bash
node --version   # should print v18.x or higher
```

---

### Step 1 — Clone the repo

```bash
git clone https://github.com/SudaisUllahKhan/SpeakEasy-MobileApp.git
cd SpeakEasy-MobileApp
```

---

### Step 2 — Install dependencies

```bash
npm install
```

---

### Step 3 — Run on your iPhone with Expo Go (fastest, no build needed)

This is the quickest way to see the app running on your real iPhone.

1. Install **Expo Go** from the App Store on your iPhone
2. Run this on your Mac:
   ```bash
   npx expo start
   ```
3. A QR code appears in the terminal
4. Open the **Camera** app on your iPhone and scan the QR code
5. It opens automatically in Expo Go — the full app is running on your device

> **Note:** Expo Go works great for testing all screens. The only thing that won't work in Expo Go is Google Sign-In (OAuth requires a standalone build). Use the **DEV LOGIN** button at the bottom of the login screen to bypass auth during development.

---

### Step 4 — Build a proper standalone iOS app (TestFlight / direct install)

This creates a real IPA file that installs like a normal app (no Expo Go needed).

**Requirements:**
- An Apple Developer account (costs $99/year)
- Be added to the Expo project — ask Sudais to invite you via [expo.dev](https://expo.dev)

**Build command:**
```bash
eas login                          # log in with your Expo account
eas build --platform ios --profile preview
```

EAS builds it in the cloud (no Xcode needed locally). When done, you get a link to download the IPA or install via TestFlight.

---

### Step 5 — Run on iPhone via USB + Xcode (advanced, optional)

If you have Xcode installed and want to run directly via USB:

```bash
npx expo run:ios
```

This requires Xcode 15+ installed from the Mac App Store and your iPhone trusted on the machine.

---

## Environment

The `.env.local` file is already in the repo with the API URL pre-configured — you don't need to set up any environment variables. The app talks to the production backend at `https://speak-easy-khaki.vercel.app`.

---

## Project structure

```
app/
├── (auth)/          # Login screen
├── (app)/           # Main tabs: Dashboard, Topics, Progress, Review, Settings
│   └── topics/      # Topic list + lesson detail screens
└── auth/            # OAuth callback handler

components/
├── lesson-player/   # 5-step lesson flow (Listen → Read → Questions → Feedback → Summary)
└── ui/              # Shared components (SkeletonLoader, LoadingSpinner, etc.)

lib/
├── api.ts           # All API calls to the backend
├── authStore.ts     # Zustand auth state with SecureStore persistence
├── queryClient.ts   # React Query client config
└── types.ts         # Shared TypeScript types
```

---

## Common commands

```bash
npx expo start              # Start dev server + show QR code
npx expo start --tunnel     # If on different WiFi networks (uses ngrok)
npm run type-check           # TypeScript check
npm run lint                 # ESLint
eas build --platform android --profile preview   # Build Android APK
eas build --platform ios --profile preview       # Build iOS IPA
```

---

## Troubleshooting

**"Metro bundler not found" or module errors**
```bash
rm -rf node_modules
npm install
npx expo start --clear
```

**QR code won't scan / app won't load**
- Make sure your Mac and iPhone are on the same WiFi network
- If they're on different networks, use: `npx expo start --tunnel`

**Google Sign-In doesn't work in Expo Go**
- Expected — OAuth requires the `speakeasy://` scheme which only works in a standalone build
- Use the orange **DEV LOGIN** button at the bottom of the login screen instead

**"Unable to resolve module" error**
```bash
npx expo start --clear
```
