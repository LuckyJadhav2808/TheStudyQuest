# StudyQuest

A gamified, offline-first study operating system. Focus time, quests, habits, notes and code runs earn XP and coins, grow a mascot (Strobi) and pets, and unlock skills. Guest Mode works instantly with no login. Data stays in the browser (IndexedDB) unless you export it.

## Setup

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```

No environment variables are required. Copy `.env.example` to `.env` to enable optional features.

## Environment variables (all optional)

| Variable | Enables |
| --- | --- |
| `OPENROUTER_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY` | Server-side AI fallback keys. Users can instead paste their own key in Settings (stored locally, sent per request in the `x-user-key` header, never logged). |
| `NEXT_PUBLIC_FIREBASE_*` (API_KEY, AUTH_DOMAIN, PROJECT_ID, STORAGE_BUCKET, MESSAGING_SENDER_ID, APP_ID) | Optional Google or email sign-in. |
| `ADMIN_EMAILS` | Reported on the `/admin` telemetry card. |

Variables are validated with zod in `src/core/env.ts`. Missing values only disable features, they never throw.

## Architecture

```
src/
  app/                 thin server-component route shells (+ /api/ai/chat, /api/leetcode, /api/admin/info, /api/health)
  components/
    ui/                hand-built primitives (cva + tailwind-merge), Modal, Segmented, Card, PageFrame
    shapes/            BlobBackdrop, NotchTab, CurvedCorner, StickerCard, DashedAddTile
    shell/             Rail, TabBar, Header, Launcher, CommandPalette, QuickAdd, Panels, Providers
  core/
    db.ts              Dexie schema (versioned) for all 25 tables
    repos/             typed repositories; the only place that touches tables for writes
    events.ts          typed event bus. Features only emit(); nothing calls another feature
    gamification.ts    pure XP/level formulas
    engine.ts          event handlers: XP, coins, streaks, buffs, skills, confetti, toasts
    flags.ts           feature flags (toggle in Settings)
    settings.ts, env.ts, firebase.ts
  features/<name>/     self-contained feature modules
  content/             toast messages, DSA sheets, ML curriculum, syllabus presets, shop, skills, questions
  lib/                 audio (Web Audio SFX), binaural, ambient (synthesised loops via howler), markdown pipeline, AI client, Pyodide worker/kernel
```

Key decisions:

- **Event-driven gamification.** `emit("task.completed", ...)` is all a feature does. `core/engine.ts` awards XP (`50 * L * (L + 1)` per level, 0..20), coins, drops, streak updates, buff and skill multipliers, then fires Strobi's mood, toast, sound and confetti.
- **Layout.** The page never scrolls (`100dvh`). Cards manage their own overflow. On mobile, `Panels` shows one card at a time with swipeable notch tabs.
- **Strobi.** One persistent React Three Fiber canvas (`frameloop="demand"` with a 30fps tick, dpr capped at 1.75). If WebGL is unavailable or the canvas throws, a 2D SVG Strobi with the same moods is used.
- **Timer.** Stores end timestamps in localStorage (zustand persist), so it survives route changes and reloads. A global watcher handles completion, tab title and Focus Defense.
- **Python.** Pyodide loads lazily from the jsDelivr CDN inside a Web Worker, bridged with comlink. "Interrupt" and "Restart" terminate the worker.
- **Audio.** SFX, binaural beats (two sine oscillators plus StereoPanner) and ambient loops are synthesised at runtime. There are no audio assets.
- **PWA.** `public/manifest.webmanifest` and a hand-written `public/sw.js` (app shell caching, network-first pages).

## Feature flags

`src/core/flags.ts`: `tracker, dsa, ml, notebook, code, ide, whiteboard, pets, shop, alchemy, skills, arcade, groups, admin, cloudSync`. All are on by default except `admin` and `cloudSync`. Toggle them in Settings. A disabled route renders a friendly `FeatureGuard` card.

## Notes on scope

- DSA sheets are curated subsets of the public lists (Blind 75 is complete). They are static data in `src/content/dsa.ts`.
- C++, Java and Rust are editor-only in `/code` and `/ide` (no fake execution).
- PPTX preview is a placeholder card in `/reader`.
- Groups need Firebase for real shared guilds. Without it a local demo guild is shown. Realtime Firestore sync is not implemented yet.
- shadcn/ui was not initialised, to avoid its default gray look. See `MISSING_PACKAGES.md`.

## First deploy note

`next.config.ts` sets `typescript.ignoreBuildErrors = true` for the first deploy. The project currently passes `tsc --noEmit`, so turn this flag off once CI runs the type check.

## Deploy

```bash
npx vercel --prod --yes
```

Or push to GitHub, import the repo on vercel.com, and add any optional env vars.
