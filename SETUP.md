# SpeakEasy Mobile — Setup Guide

Run the app on your iPhone using **Expo Go**. No APK build, no Xcode needed.

---

## What you need (install these first)

| | Download |
|---|---|
| **Node.js 18 or 20 LTS** | https://nodejs.org — pick the LTS version |
| **Expo Go (iPhone)** | App Store → search "Expo Go" → install |
| **Git** | https://git-scm.com (already installed on Mac/Linux) |

---

## Step 1 — Clone the repo

```bash
git clone https://github.com/SudaisUllahKhan/SpeakEasy-MobileApp.git
cd SpeakEasy-MobileApp
```

---

## Step 2 — Install dependencies

```bash
npm install
```

> No `.env` setup needed — the API URL is already committed in `.env.local`.

---

## Step 3 — Start Metro

```bash
npx expo start --tunnel
```

This starts the Metro bundler and creates a **tunnel** so your iPhone can connect
even if it's on a different network than your computer.

Wait for this line in the terminal:
```
Metro waiting on exp://...
```
Then a **QR code** appears.

---

## Step 4 — Open on your iPhone

1. Open your iPhone **Camera app**
2. Point it at the QR code in the terminal
3. Tap the yellow **"Open in Expo Go"** banner at the top of the screen
4. Wait ~30 seconds while the JS bundle downloads

> If the Camera doesn't show the banner: open **Expo Go** app → tap **Scan QR Code**

---

## Step 5 — Sign in

Google sign-in does **not** work in Expo Go. Use **DEV LOGIN** instead:

1. Scroll to the bottom of the login screen
2. You'll see a small email input and **"DEV LOGIN (skip auth)"** button
3. Type your email address in the box
4. Tap **DEV LOGIN**

This creates a real account for you on the server. Your email must be on the
approved list — ask Sudais to add it if you get a "Not available" error.

---

## Everyday use (after first setup)

Each time you want to run:
```bash
npx expo start --tunnel
```
Rescan the QR code **only** if Expo Go shows an error. Otherwise it reconnects automatically.

Code changes apply instantly via **Fast Refresh** — no rescan needed.

---

## Troubleshooting

**"CommandError: failed to start tunnel" or ngrok error**
```bash
npm install @expo/ngrok@^4.0.1 --save-dev
npx expo start --tunnel
```

**"Port 8081 already in use"**
```bash
npx kill-port 8081 8082
npx expo start --tunnel
```

**"Dev Login Error: Not available"**
Your email isn't on the allowlist. Ask Sudais to add it to
`app/api/auth/dev-login/route.ts` → `ALLOWED_DEV_EMAILS`.

**Expo Go shows a blank white screen or old content**
Shake your iPhone → tap **Reload**

**QR code opens the wrong app (old SpeakEasy APK)**
Delete any old SpeakEasy app from your phone, then rescan.

---

## Using Claude Code to run this

If you have **Claude Code** installed, open this folder and just say:

> "Run the app via Expo Go so I can test on my iPhone"

Claude will read `CLAUDE.md` and execute the correct commands automatically.
