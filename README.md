# Workout Tracker

A mobile-first, local-only Progressive Web App for tracking a sequential
32-workout program. All data (progress and logged sets) is stored in the
browser's `localStorage` on your device. There is no backend, no account,
and no external service of any kind.

## Status: v0.1

All **32 workouts** of the real 8-week program are authored (4 workouts per
week: 2 short "Workday" sessions of ~30-40 min and 2 longer "Off Day"
sessions of ~70-90 min). Exercises favor supported machines, cable work,
leg press/leg curl, hip thrust/glute bridge, and low-impact cardio
(elliptical, stationary bike, or rowing only), with concise safety notes on
movements that are lower-back, knee, or shoulder-sensitive. Weight is always
recorded in kilograms.

## Getting started

Requires [Node.js](https://nodejs.org/) 20.19+ or 22.12+.

```bash
npm install
npm run dev
```

Open the printed local URL (typically `http://localhost:5173`) in a browser.
For a realistic mobile test, open your browser's device toolbar/emulator, or
visit the same URL from your phone while it's on the same network (Vite will
print a "Network" URL when run with `npm run dev -- --host`).

Other scripts:

```bash
npm run build     # Type-check and produce a production build in dist/
npm run preview   # Serve the production build locally
npm run typecheck # Type-check only, no build output
```

## Project structure

```
src/
  data/program.ts        8-week / 32-workout program (exercise catalog + weekly templates + phase table)
  types.ts               Shared TypeScript types
  storage/localStorage.ts Local persistence (progress + logs)
  state/AppDataContext.tsx React context wrapping local storage
  lib/progress.ts         Sequential lock/unlock status logic
  lib/history.ts          Looks up the most recent logged weight for an exercise
  screens/                Home, Workout Detail, Active Session, History
  components/             Shared UI (bottom nav, status badge)
```

## Editing the program

Each workout has `warmup`, `strength`, `core`, and an optional `cardio`
section (see [src/types.ts](src/types.ts)). [src/data/program.ts](src/data/program.ts)
builds all 32 workouts from a small, reusable exercise catalog, 4 weekly
session templates (Workday A/B, Off Day A/B), and an 8-week phase table
that drives sets/reps/rest/cardio duration per week. Exercise `id`s are
kept stable across the weeks they recur in, so the "last weight" hint on
the session screen keeps tracking the same movement correctly - keep that
in mind if you rename or replace a catalog entry.

## How progression works

Scheduling is flexible, not strictly locked: every workout in the 32-workout
program can be opened and started at any time, in any order (see
[src/lib/progress.ts](src/lib/progress.ts)). This matters because the 4-session
weekly cycle (2 short Workday + 2 long Off Day sessions) can land on
different weekdays depending on your week - you might need to do a short
Workday session before an earlier long Off Day session, and that's fine.

- **Recommended Next** is always the lowest-numbered workout you haven't
  completed yet - it's a suggestion, not a gate.
- **Completed** workouts stay visible and can be revisited/redone; doing so
  doesn't change any other workout's status.
- **Available** covers everything else - not yet done, not the current
  recommendation, but always open.
- Completing a later workout never marks earlier ones complete. Completion
  is derived directly from your logged history (`WorkoutLog.order` in
  `localStorage`), not from a separate "furthest unlocked" counter, so it
  can't drift out of sync with what you actually did.
- History ([src/screens/HistoryScreen.tsx](src/screens/HistoryScreen.tsx)) is
  sorted by the actual completion timestamp, not by workout number, so it
  reflects the real order you did things in.
- There's no skip/mark-as-done shortcut - the only way a workout shows as
  Completed is by actually finishing a logged session for it.

## Resetting local data

All data lives under the `workout-app:v1:*` keys in `localStorage`. To reset
your progress and history during testing, open your browser's dev tools
console on the app's page and run:

```js
localStorage.removeItem("workout-app:v1:progress");
localStorage.removeItem("workout-app:v1:logs");
```

then reload the page.

## Installing as an app (PWA)

The production build is installable. After `npm run build && npm run preview`
(or after deploying, see below), open the URL on your phone in Chrome/Edge
(Android) or Safari (iOS) and use "Add to Home Screen" / the install prompt.
Once installed, the app works fully offline after its first load.

## Deploying to GitHub Pages

A workflow at [.github/workflows/deploy.yml](.github/workflows/deploy.yml) is
included. To use it:

1. Push this project to a new GitHub repository.
2. In the repository settings, under **Pages**, set the source to
   **GitHub Actions**.
3. Push to `main` (or run the workflow manually) - it builds the app and
   deploys `dist/` automatically. The correct `base` path for your repo name
   is set automatically by the workflow.
4. Your app will be available at `https://<your-username>.github.io/<repo-name>/`.

This is entirely static hosting - no server, database, or account system is
involved at any point.

## Postponed beyond v0.1

See the implementation plan for the full list. Notably: in-app workout
editing, rest timers, progress charts, editing/deleting past logs,
backup/export of data, multiple programs, and dark mode/theming (dark theme
is simply the only theme for now).
