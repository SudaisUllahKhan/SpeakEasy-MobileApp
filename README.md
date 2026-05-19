# SpeakEasy Mobile App

AI-powered English speaking practice for ESL learners.

---

## Muneeb — Run the app on your iPhone (3 steps)

### Step 1 — Install Expo Go on your iPhone

Open the App Store on your iPhone and download **Expo Go**.

---

### Step 2 — Set up on your Mac

Open **Terminal** on your Mac and run these three commands one by one:

```bash
git clone https://github.com/SudaisUllahKhan/SpeakEasy-MobileApp.git
```
```bash
cd SpeakEasy-MobileApp
```
```bash
npm install
```

---

### Step 3 — Start the app and scan the QR code

```bash
npx expo start
```

A QR code will appear in the terminal. Open the **Camera** app on your iPhone, point it at the QR code, and tap the notification that pops up. The SpeakEasy app opens in Expo Go.

> **Make sure your Mac and iPhone are on the same WiFi network.**
> If they're on different networks, run `npx expo start --tunnel` instead.

---

### Logging in

Google Sign-In doesn't work in Expo Go (it needs a standalone build). Use the **DEV LOGIN** button at the bottom of the login screen to skip straight into the app.

---

### Troubleshooting

**App won't load after scanning**
- Check both devices are on the same WiFi
- Or use: `npx expo start --tunnel`

**Module errors / blank screen**
```bash
npx expo start --clear
```
