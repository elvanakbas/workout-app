# V2 History Detail (Phase 4 + 4B)

## Goal

Every History entry is openable and shows the full completed workout when data exists. New completions store an immutable, analysis-ready snapshot so future renames or program edits cannot rewrite the past.

Phase 4B guarantees genuine V1/V2 History is never silently lost after an app update, storage schema change, program change, or service-worker update.

## Routes

| Route | Screen |
|---|---|
| `#/history` | History list (each row links to detail) + Export History JSON |
| `#/history/:logId` | History Detail |
| Missing / deleted `logId` | Safe not-found state with Back to History |

HashRouter keeps refresh-safe deep links on GitHub Pages. Routes do not change storage ownership.

## Storage keys (audit)

### Canonical History

| Key | Role |
|---|---|
| `workout-app:v1:logs` | **Canonical** completed History array (only key ever written for logs in git history) |

Despite the `v1` name, this key remains canonical so production data is not hidden by a rename.

### Discovered / scanned legacy History candidates

Git history shows no alternate completed-log key was ever written. These candidates are still scanned so a mistaken namespace or manual restore cannot strand records:

| Key |
|---|
| `workout-app:v2:logs` |
| `workout-app:logs` |
| `workout-app:history` |
| `workout-app:v1:history` |
| `workout-app:v2:history` |
| any runtime `workout-app:*logs` / `workout-app:*history` key |

### Related non-History keys (never treated as History)

| Key | Role |
|---|---|
| `workout-app:v1:progress` | Legacy progress; no longer written |
| `workout-app:v1:active-drafts` | Legacy active drafts (migrated to v2 drafts) |
| `workout-app:v2:active-drafts` | Current active session drafts |

### Migration metadata

| Key | Role |
|---|---|
| `workout-app:history-migration-version` | Marker; current value `1` |
| `workout-app:history-backup:v1-to-phase4b` | Raw pre-migration snapshot of History source keys (written once) |
| `workout-app:history-recovery` | Quarantine for malformed individual records |

### Why V1 History may have “disappeared”

Most likely causes (not a logs key rename):

1. **Different origins** — `localhost` / `127.0.0.1` vs production `https://elvanakbas.github.io` are separate `localStorage` origins.
2. **Intentional reset** — README documents `localStorage.removeItem("workout-app:v1:logs")` for testing.
3. **Not** caused by app/program version bumps, HashRouter, or bundle hash changes (those do not change the History key).

## Canonical module

All History reads/writes go through:

- `src/storage/historyStorage.ts` — public API (`getLogs`, `appendLog`, `getLogsForExport`, `ensureHistoryReady`)
- `src/storage/historyMigration.ts` — migration, backup, recovery, dedupe
- `src/storage/historyExport.ts` — JSON export (read-only)

`src/storage/localStorage.ts` re-exports History APIs for call-site stability and never calls `localStorage.clear()`.

A malformed unrelated key must never reset History. Malformed individual logs are skipped/quarantined; valid siblings are kept. Migration never replaces a non-empty History collection with `[]`.

## Schema / version strategy

| `schemaVersion` | Meaning |
|---|---|
| omitted / `1` | Legacy V1/V2 logs |
| `2` | Phase 4 rich immutable snapshot |

Optional migration marker on logs: `historySource?: "legacy-v1" | "legacy-unknown"`.

Old logs are **never rewritten** by normal completion. Migration may normalize/merge into the canonical collection while preserving original titles, timestamps, IDs, set data, and obsolete exercise IDs. Missing fields are never fabricated from the live V2 program.

### Legacy shape (still valid)

```ts
{
  id: string;              // `${workoutId}-${Date.now()}` or deterministic `legacy-<hash>`
  workoutId: string;
  order: number;
  workoutTitle: string;
  completedAt: string;     // ISO
  entries: {
    exerciseId: string;
    sets: { reps: number; weight: number; durationSeconds?: number }[];
    completed?: boolean;
  }[];
  cardioCompleted?: boolean;
  lowEnergyMode?: boolean;
  feedback?: SessionFeedback;
}
```

### Phase 4 rich shape (additive)

Same base fields, plus:

- `schemaVersion: 2`
- `startedAt`, `durationSeconds`
- classification: `variantLabel`, `variant`, `focusArea`, `length`
- per-entry snapshot: `name`, `measurementType`, `unilateral`, `targetUnitLabel`, `plannedSets`, `plannedReps`, `visualAssetKey`, `status`
- `cardio` snapshot: planned minutes, machine, completion (actual minutes only if explicitly recorded)

## Migration algorithm (version `1`)

1. If `history-migration-version` ≥ `1`, return (idempotent early exit).
2. Discover canonical + known legacy + runtime History-like keys.
3. Parse each source array; coerce records individually.
4. Assign stable IDs (`id` if present, else deterministic fingerprint hash).
5. Dedupe confident duplicates; richer record wins; merge only clearly compatible missing fields.
6. If no existing backup → write raw source snapshot to backup key.
7. Write merged collection to canonical key.
8. Read back and validate parseable count.
9. Quarantine malformed items into recovery key.
10. Only then write migration version marker.

### Deterministic duplicate detection

Prefer existing stable `id`.

For records without usable IDs, fingerprint:

`completedAt | workoutId | workoutTitle | order | durationSeconds | entryCount | setCount`

Confident duplicates require same `id`, **or** same `completedAt` + `workoutId` + `workoutTitle` + `order` + matching exercise/set counts.

Two workouts on the same calendar day remain separate when timestamps (or other identity fields) differ.

Never merge uncertain records merely because they share a date.

## Export

History screen: **Export History JSON** (does not modify History).

Filename: `workout-app-history-YYYY-MM-DD.json`

Document shape:

```ts
{
  exportSchemaVersion: 1,
  exportedAt: string,
  appVersion: string,
  programVersion: string,
  historyMigrationVersion: number,
  canonicalKey: "workout-app:v1:logs",
  logCount: number,
  logs: WorkoutLog[]  // valid normalized only
}
```

### Deferred import (safe-merge plan)

Import is deferred. When added, it must:

1. Parse the export document; reject unknown/unsafe schemas.
2. Normalize each incoming log individually; quarantine malformed.
3. Merge into canonical via the same dedupe rules (richer wins; never replace-all).
4. Backup current canonical before write; validate read-back before any marker update.
5. Never wipe existing History on partial failure.

Do **not** ship an unsafe replace-all import.

## Service worker / version safety

| Change | Clears History? |
|---|---|
| App version / package version | No |
| Program content / V2 program edits | No |
| Bundle hash / Vite build | No |
| HashRouter route changes | No |
| Service worker activate / cache cleanup | No — Cache Storage only (`globPatterns` js/css/html/svg/webp) |

`vite-plugin-pwa` / Workbox never touch `localStorage`.

### Production origin

- Origin: `https://elvanakbas.github.io`
- App path: `/workout-app/`

Changing the app path away from `/workout-app/` would require an explicit export/import or origin migration plan (`localStorage` is origin-scoped; path changes within the same origin still share storage, but moving hosts or sites does not).

## Immutable snapshot behavior

On **Complete Workout**, `buildCompletedWorkoutLog()` freezes:

- workout title and classification
- every strength/core exercise id + display name + measurement type + planned targets
- actual sets
- exercise status: `completed` | `incomplete` | `skipped` (LEM-hidden → skipped)
- feedback / note
- timestamps and duration
- Low Energy Mode
- cardio planned minutes + completion (no fabricated actual minutes)

History Detail prefers these stored fields and does **not** require the live program catalog.

## Volume calculation

For **reps-weight** sets only:

`sum(reps × kg)` across sets where `reps > 0` and `weight > 0`.

Excluded from kg volume:

- reps-only
- duration
- cardio
- bodyweight / non-reps-weight measurement types

Legacy logs without `measurementType` only count sets that already have both reps and weight &gt; 0.

## Fallback behavior

| Log type | Detail UI |
|---|---|
| Rich v2 | Full exercises, sets, summary, optional previous-session comparison |
| Current V2 (sets, no names) | Shows stored set values; uses `Exercise (id)` when name missing |
| Older V1 (title/counts/sparse) | Shows available title/date/counts; notice when no set detail |
| Obsolete exercise IDs | Render safely from stored id/name; never crash |
| Malformed individual log | Skipped by normalize; other history untouched |

When no usable set detail exists:

> Detailed set data was not recorded for this workout.

Missing fields are never invented (no fake sets, reps, kg, or duration).

## Previous session comparison

Utilities in `src/lib/workoutLogAnalytics.ts`:

- total reps-weight volume
- completed exercise / working-set counts
- previous comparable log (same `workoutId`, else same variant+length, else same order)
- per-exercise best valid set / volume

History Detail shows a small **Previous session** block only when both the current and previous logs are analytics-capable. Otherwise the block is hidden.

No weekly/monthly charts in Phase 4.

## Validation

```bash
npm run typecheck
npm run build
npm run validate:v2
npm run validate:session
npm run validate:history
npm run validate:history-migration
```

`validate:history` covers rich log creation, name snapshot, volume exclusions, unilateral metadata, V1/V2 fallbacks, obsolete IDs, malformed siblings, missing id lookup, and duplicate-completion guard.

`validate:history-migration` covers legacy→canonical merge, idempotent re-run, same-day preservation, richer-wins dedupe, title/timestamp preservation, obsolete IDs, malformed quarantine, backup once, marker-after-validate, version-metadata safety, SW/localStorage inspection, rich log passthrough, and export metadata.

## Future analytics roadmap

- Weekly / monthly volume trends by muscle group
- Per-exercise progression charts (best set / e1RM estimates)
- Deload detection from difficulty + volume deltas
- Safe-merge History import (see deferred plan above)
- Optional actual cardio minutes input in the session UI
