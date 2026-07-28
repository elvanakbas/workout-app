# V2 Nutrition V1 (Phase 5)

## Product scope

A lightweight, date-based Nutrition module alongside the existing sequential Workout program.

V1 lets the user:

- set a daily calorie target and daily protein target
- add / edit / delete simple food entries
- see daily calorie and protein totals and remaining (or over-target) amounts
- view another local calendar date
- see whether a completed workout exists on that same local date
- view that day’s nutrition summary from History Detail
- export Nutrition JSON (read-only)

Workout and Nutrition remain separate concepts, linked only by local `YYYY-MM-DD`.

## Out of scope (V1)

- barcode scanning, food database, external autocomplete
- AI food analysis / photo recognition
- Apple Health / Google Fit
- exercise calorie estimates or calories-burned adjustments
- macros beyond calories and protein
- meal categories, recipes, body-weight tracking
- weekly charts / nutrition recommendations
- account / cloud sync / notifications
- safe-merge import (deferred)
- unrelated UI redesign

## Routes / navigation

HashRouter (refresh-safe on GitHub Pages):

| Route | Screen |
|---|---|
| `#/` | Program (workouts) |
| `#/nutrition` | Nutrition for today |
| `#/nutrition/:dateKey` | Nutrition for a local `YYYY-MM-DD` |
| `#/history` | History list |
| `#/history/:logId` | History Detail (+ Nutrition that day) |

Primary bottom nav: **Program · Nutrition · History**. Nutrition is not nested under a workout screen.

## Data model

```ts
type NutritionEntry = {
  id: string;
  name: string;           // trimmed as entered
  calories: number;       // non-negative; UI uses integers
  proteinGrams: number;   // non-negative; decimals allowed
  createdAt: string;      // ISO
  updatedAt?: string;
};

type NutritionDay = {
  dateKey: string;        // local YYYY-MM-DD
  entries: NutritionEntry[];
};

type NutritionSettings = {
  calorieTarget: number;
  proteinTargetGrams: number;
};

type NutritionExport = {
  schemaVersion: 1;
  exportedAt: string;
  settings: NutritionSettings;
  days: NutritionDay[];
};
```

- Entry IDs stay stable across edits; `createdAt` is preserved.
- Empty days are not stored permanently.
- Days are independent; editing one date never rewrites another.
- Food names are never used to infer nutrition values.

**List order:** entries are stored and shown oldest first (newest last).

## Canonical storage keys

| Key | Role |
|---|---|
| `workout-app:nutrition:settings:v1` | Global calorie / protein targets |
| `workout-app:nutrition:days:v1` | Array of `NutritionDay` records |
| `workout-app:nutrition:migration-version` | Marker; current value `1` |
| `workout-app:nutrition:backup:v1` | Raw pre-migration snapshot (written once) |
| `workout-app:nutrition:recovery` | Quarantine for malformed records |

Keys are stable across bundle hashes and app version metadata. New builds must not invent a new Nutrition namespace.

Modules:

- `src/storage/nutritionStorage.ts` — public CRUD API
- `src/storage/nutritionMigration.ts` — migration, backup, recovery, normalize
- `src/storage/nutritionExport.ts` — read-only JSON export

Screens must not touch Nutrition `localStorage` keys directly. Never call `localStorage.clear()`.

`resetAllData()` does **not** clear Nutrition keys.

History discovery treats Nutrition keys as non-History (`KNOWN_NON_HISTORY_KEYS`).

## Migration / backup / recovery

- Migration version: **1**
- Idempotent: safe on every launch; second run is a no-op when the marker is present
- V1 has no legacy Nutrition keys; migration still normalizes settings/days defensively
- Raw settings + days are backed up once before the first migration write
- Marker is set only after successful write + read-back validation
- Malformed entries are dropped from a day; valid siblings remain
- Malformed days are quarantined; other days remain
- Recovery stores recent malformed payloads for forensics

Service-worker / PWA updates only precache static assets (`globPatterns`); they do not read or clear Nutrition storage.

## Local date semantics

- `dateKey` is always device-local `YYYY-MM-DD`
- Helpers live in `src/lib/localDate.ts`
- **Never** derive a calendar day with `iso.slice(0, 10)` (UTC shift risk near midnight)

## Workout–date matching

Completed History logs only. Matching uses local calendar date:

1. Prefer `WorkoutLog.startedAt` when present and parseable
2. Else `WorkoutLog.completedAt`
3. Convert with local getters (not UTC slicing)

Multiple workouts on the same date all match. Nutrition never writes into `WorkoutLog` and workouts never write into `NutritionDay`.

Targets are **not** adjusted on workout days. No exercise calorie credit.

## Calculation rules

Utilities in `src/lib/nutritionMath.ts`:

- `totalCaloriesForDay` / `totalProteinForDay` — ignore malformed entries; never return NaN
- Decimal protein supported; calorie UI prefers integers
- `remaining = target - consumed`
- When over target, remaining is negative; UI shows a neutral “X over target” (no guilt language)
- Zero entries → totals 0

## History Detail relationship

History Detail shows a **Nutrition that day** section for the workout’s local date:

- Reads the current `NutritionDay` (mutable; may have been edited after the workout)
- Shows totals vs **current** global targets (not historical target snapshots)
- Labels this honestly
- Links to `#/nutrition/:dateKey`
- Does not duplicate full food entry lists into History

## Export format

Filename: `workout-app-nutrition-YYYY-MM-DD.json` (local date).

```json
{
  "schemaVersion": 1,
  "exportedAt": "<ISO>",
  "settings": { "calorieTarget": 2100, "proteinTargetGrams": 140 },
  "days": [ /* valid NutritionDay[] */ ]
}
```

Export is read-only and does not mutate storage. Malformed records are omitted; valid ones still export.

## Known limitations

- Targets are global current settings, not per-day historical snapshots
- No import / safe-merge restore in V1
- No food database or barcode support
- Native `<input type="date">` only (no full calendar UI)
- Nutrition empty days are not persisted

## Deferred: safe-merge import

Future work may add a safe-merge Nutrition import that:

- never calls `localStorage.clear()`
- backs up before write
- merges by `dateKey` / entry `id` without wiping unrelated days
- quarantines malformed records

## Future analytics possibilities

Reusable helpers already exist for day totals, remaining/over-target, local date keys, and same-day workout lookup. Weekly averages, charts, and recommendations are deliberately deferred.
