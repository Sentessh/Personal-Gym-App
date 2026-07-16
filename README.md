<div align="center">
  <img src="logo/logo.png" alt="Gym App logo" width="120" />
  <h1>Gym App</h1>
  <p><strong>Offline-first personal workout &amp; diet tracker.</strong><br/>
  Plan your training and nutrition, mark one of each as <em>active</em>, and your day builds itself.</p>

  <p>
    <img alt="Expo" src="https://img.shields.io/badge/Expo-SDK%2057-000?logo=expo&logoColor=fff" />
    <img alt="React Native" src="https://img.shields.io/badge/React%20Native-0.86-61DAFB?logo=react&logoColor=000" />
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=fff" />
    <img alt="Firebase" src="https://img.shields.io/badge/Firebase-Firestore-FFCA28?logo=firebase&logoColor=000" />
    <img alt="Platform" src="https://img.shields.io/badge/platform-Android-3DDC84?logo=android&logoColor=fff" />
    <img alt="License" src="https://img.shields.io/badge/license-MIT-blue" />
  </p>
</div>

> ⚠️ **Language note:** the app UI is in **Brazilian Portuguese (PT-BR)**. This README is in English; the concepts map 1:1 to the in-app screens.

---

## ✨ What it does

A mobile app for tracking gym workouts and diet, built for personal use. The core idea:

> You keep as many **workout plans** and **diet plans** as you want, but you mark **one active workout** and **one active diet** at a time. That active selection automatically drives the central **"My Day"** screen — today's meals to check off and today's training to execute.

Everything you actually do is saved to a **history** that powers the calendar and statistics — and edits to a plan never corrupt what's already been logged (past entries are snapshotted).

## 🧩 Features

- **Workouts** — create training plans → weekly blocks (A/B/C…) → muscle-group sections → exercises (sets + modality: Normal / Muscle Round / Low Volume), with target reps/load.
- **Diet** — build meal plans with foods searched from a bundled food database; live totals for **calories, macros (carbs/protein/fat)** and **protein per kg of body weight**.
- **My Day** — the hub, derived from your active plans: check off meals with live calorie progress, and run a training session marking each set's load/reps in real time.
- **Statistics** — charts for load progression per exercise, training consistency, calorie adherence, and body-weight evolution, over 30 / 90 days / all time.
- **Calendar** — a monthly grid coloring trained / rest / diet days; tap a day to see exactly what was done.
- **Accounts** — email/password login, so your data survives a reinstall and syncs across devices.
- **Offline-first** — the app is fully usable with no connection and syncs automatically when back online.
- **Backup** — export/import all your data as JSON from the profile screen.

## 🏗️ How it works

Three clear data layers keep planning and history separate:

| Layer | What it holds | Example |
|-------|---------------|---------|
| **Planning** | what *should* be done | workout plans, diet plans |
| **Active selection** | what's *current* right now | the active workout + active diet |
| **Execution / history** | what *actually* happened, by date | loads used, meals eaten, body weight |

The app talks to Firestore only through a **repositories** layer, so the UI never touches the database directly. Pure logic (nutrition math, stats aggregation, draft editing) lives in framework-free modules under `src/lib` and is unit-tested in Node.

**Stack:** Expo + React Native + TypeScript · Expo Router (file-based tabs) · Cloud Firestore with offline persistence (`@react-native-firebase`) · Firebase Auth · Zustand for global state.

## 📁 Project structure

```
src/
├─ app/               # screens & routes (Expo Router)
│  ├─ (tabs)/         # Treino · Dieta · Meu Dia · Estatísticas · Calendário
│  ├─ ficha/[id]      # workout plan editor
│  ├─ dieta/[id]      # diet plan editor
│  ├─ dia/[date]      # calendar day detail
│  ├─ sessao          # live training session
│  └─ onboarding, perfil
├─ components/        # reusable UI (charts, calendar, forms, auth screen…)
├─ repositories/      # the ONLY layer that talks to Firestore
├─ lib/               # pure logic: nutrition, stats, drafts, day-model, auth
├─ store/             # Zustand stores (auth, profile, active selection)
├─ data/              # bundled food database
└─ types/             # domain types
```

## 🚀 Getting started

### Prerequisites
- Node 18+ (developed on Node 22)
- A free [Firebase](https://console.firebase.google.com) project
- A free [Expo](https://expo.dev) account (for cloud builds)
- This app uses native Firebase modules, so it runs in a **development build / APK — not in Expo Go.**

### 1. Clone & install
```bash
git clone https://github.com/Sentessh/Personal-Gym-App.git
cd Personal-Gym-App
npm install
```

### 2. Configure Firebase
The Firebase config files are **not** committed (they hold your project's keys). Create your own:

1. In the Firebase console, create a project.
2. **Authentication → Sign-in method:** enable **Anonymous** and **Email/Password**.
3. **Firestore Database:** create it in production mode (the rules in `firestore.rules` restrict access to each user's own data).
4. Register an **Android app** with package `com.personalgymapp.app`, download `google-services.json`, and place it at `firebase/google-services.json`.
5. Copy `.firebaserc.example` → `.firebaserc` and set your project id.

There's a `google-services.example.json` in `firebase/` showing the expected shape.

### 3. Run (development)
```bash
# build a dev client once (cloud build via EAS):
npx eas-cli build --profile development --platform android
# then start the bundler and open the installed dev client:
npx expo start --dev-client
```

## 📦 Building the Android APK

Produces a standalone, installable `.apk` you can share directly (sideload — no app store needed):

```bash
npx eas-cli build --profile production --platform android
```

EAS builds in the cloud and returns a download link. The `production` profile is configured to output an **APK** (`buildType: apk`) rather than a store-only AAB. Your local `google-services.json` is bundled automatically at build time via `.easignore`, so it stays out of the repo.

## 🧪 Testing

```bash
npm test          # Jest unit tests (pure logic: nutrition, stats, drafts, day-model…)
npm run typecheck # tsc --noEmit
npm run lint      # ESLint
```

## 🔐 Security & privacy

- Every user's data lives under `users/{uid}` and is readable/writable only by that authenticated user (see `firestore.rules`).
- Firebase credentials and personal config are gitignored; only `.example` templates are committed.

## 📄 License

[MIT](LICENSE) © Sentessh
