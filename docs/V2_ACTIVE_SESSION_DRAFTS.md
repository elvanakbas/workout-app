# V2 Active Session Drafts

Branch: `v2-rebuild`  
Phase: 2 — persistent drafts + per-exercise completion (program data unchanged)

## Storage key and schema version

| Item | Value |
| --- | --- |
| Storage key | `workout-app:v2:active-drafts` |
| Legacy key (migrated once) | `workout-app:v1:active-drafts` |
| Document schema `version` | `1` |
| Completed history key (unchanged) | `workout-app:v1:logs` |

Drafts are a map of `workoutId → ActiveSessionDraft`. Each workout keeps an independent draft. Completing or discarding one workout never deletes another workout’s draft.

On first read of the v2 key, any **valid** drafts under the legacy v1 key are copied into v2, then the legacy key is removed. Malformed legacy entries are skipped.

## Draft data shape

```ts
interface ActiveSessionDraft {
  version: 1;
  workoutId: string;
  updatedAt: string; // ISO 8601
  lowEnergyMode: boolean;
  cardioCompleted: boolean;
  entries: ExerciseLog[]; // includes completed?: boolean per exercise
  feedback: SessionFeedback; // difficulty, energy, pain scores, note
}
```

`ExerciseLog.sets` always uses the shared `SetLog` shape (`reps`, `weight`, optional `durationSeconds`). Which fields the UI shows is driven by the exercise’s authored `measurementType`, never by name inference.

## Save / restore behavior

- The active session screen auto-saves whenever hydrated session state changes: set values, exercise completion, cardio checkbox, low-energy mode, and feedback fields.
- Opening `/workout/:id/session` restores that workout’s draft if present; otherwise it seeds empty entries for the full strength + core list.
- Drafts survive route navigation, browser refresh, and PWA close/reopen (localStorage).
- Entries are stored for the **full** authored strength/core catalog. Low Energy Mode only changes what is **shown** (optional exercises hidden; set count capped at 2). Hidden or capped values remain in the draft so toggling the mode off restores them.

## Completion lifecycle

1. **Complete Exercise** marks one strength/core card complete (persisted on the draft). Empty-value completion asks for a lightweight confirm; it does not hard-block.
2. Completed cards show a Completed badge, de-emphasize visually, keep values visible (read-only), and offer **Edit Exercise** to reopen.
3. Completing an exercise does **not** complete the workout.
4. **Complete Workout** creates exactly one `WorkoutLog`, clears **only** that workout’s draft, and navigates home. A completion guard blocks duplicate logs from double-clicks / repeated handlers in the same mount.
5. **Discard Workout Draft** requires explicit confirmation, then clears only that workout’s draft and resets the on-screen session.

## Measurement-aware logging

| `measurementType` | UI fields |
| --- | --- |
| `reps-weight` | reps + kg per set |
| `reps-only` | reps only |
| `duration` | seconds only |
| `cardio-duration` | planned minutes + completion checkbox (no reps/kg). Actual minutes are not modeled yet. |

Unilateral exercises expose `targetUnitLabel` (typically `per side`) on the session card and column headers.

## Backward compatibility

- Completed `WorkoutLog` history under `workout-app:v1:logs` is never rewritten or deleted by draft code.
- Older logs without `feedback`, `completed` on entries, or `lowEnergyMode` still render in History.
- Unknown / obsolete exercise IDs inside old logs do not crash History (History displays stored `workoutTitle` and counts, not live catalog lookups).
- Draft documents with `version !== 1`, wrong `workoutId`, or non-array `entries` fail normalize and are dropped **for that workout only**.

## Reset / discard behavior

| Action | Effect |
| --- | --- |
| Discard Workout Draft | Clears one draft after confirm; other drafts untouched |
| Complete Workout | Appends one log; clears one draft |
| `resetAllData()` | Clears logs, legacy progress key, and all active drafts (v1 + v2 keys) |

## Known limitations

- Cardio logging is completion + planned minutes only; there is no separate “actual minutes” field in the current model.
- The V2 program currently marks no strength/core exercises as `optional`; Low Energy Mode still caps sets at 2 and treats cardio as optional when enabled. Preservation logic for hidden optionals is implemented for when optionals are authored.
- Seventeen new V2 visual keys still lack registry assets (deferred visual phase) — unrelated to drafts.
- No large test framework; focused checks live in `npm run validate:session`.

## Validation

```bash
npm run typecheck
npm run build
npm run validate:v2
npm run validate:session
```
