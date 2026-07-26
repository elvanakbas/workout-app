# V2 Program Migration Notes

Branch: `v2-rebuild`  
Base tag: `v1.0.0` @ `46b8aba`  
Phase: program + data-model only (no visual regeneration, no UI redesign, no deploy)

## Historical-data compatibility

- Completed `WorkoutLog`s under `workout-app:v1:logs` are **not** rewritten or deleted.
- History UI continues to show `workoutTitle` and set counts from the stored log.
- `getLastWeightForExercise` still keys by `exerciseId`. Retained IDs keep progression hints; new IDs start fresh.
- Unknown legacy exercise IDs in old logs do not crash the app (History does not look up current catalog by ID for display).
- Active-session drafts are unchanged in this phase; opening a V2 workout with an old draft ID may reconcile by exercise ID (entries for removed IDs are simply unused).

## Retained exercise IDs (15)

| ID | V2 display name |
| --- | --- |
| `chest-press-machine` | Machine Chest Press |
| `lat-pulldown` | Neutral-Grip Lat Pulldown |
| `chest-supported-row` | Chest-Supported Row Machine |
| `leg-press` | Leg Press |
| `leg-curl-machine` | Seated Leg Curl |
| `seated-calf-raise-machine` | Seated Calf Raise |
| `dead-bug` | Dead Bug |
| `hip-thrust-glute-bridge` | Hip Thrust |
| `leg-extension-machine` | Leg Extension |
| `pallof-press` | Cable Pallof Press |
| `forearm-plank` | Forearm Plank |
| `side-plank` | Side Plank |
| `seated-cable-row` | Seated Cable Row |
| `hip-abduction-machine` | Seated Hip Abduction Machine |
| `cable-crunch-kneeling` | Cable Crunch |

## New exercise IDs (17)

| ID | Display name |
| --- | --- |
| `chest-supported-dumbbell-row` | Chest-Supported Dumbbell Row |
| `seated-dumbbell-shoulder-press` | Seated Dumbbell Shoulder Press |
| `dumbbell-hammer-curl` | Dumbbell Hammer Curl |
| `rope-triceps-pushdown` | Rope Triceps Pushdown |
| `dumbbell-romanian-deadlift` | Dumbbell Romanian Deadlift |
| `incline-dumbbell-press` | Incline Dumbbell Press |
| `cable-fly` | Cable Fly |
| `dumbbell-lateral-raise` | Dumbbell Lateral Raise |
| `reverse-pec-deck` | Reverse Pec Deck |
| `incline-dumbbell-curl` | Incline Dumbbell Curl |
| `overhead-cable-triceps-extension` | Overhead Cable Triceps Extension |
| `hack-squat` | Hack Squat |
| `dumbbell-bulgarian-split-squat` | Dumbbell Bulgarian Split Squat |
| `flat-dumbbell-press` | Flat Dumbbell Press |
| `machine-shoulder-press` | Machine Shoulder Press |
| `alternating-dumbbell-curl` | Alternating Dumbbell Curl |
| `cable-triceps-pushdown` | Cable Triceps Pushdown |

## Removed / obsolete for the active V2 program

These are no longer prescribed in the 32-workout V2 templates (registry/image files intentionally kept this phase):

| ID / key | Notes |
| --- | --- |
| `machine-ab-crunch` | Already removed in V1; remains absent in V2 |
| `cable-lateral-raise` | Replaced by `dumbbell-lateral-raise` |
| `bird-dog` | Not in V2 templates |
| `standing-cable-woodchopper` | Not in V2 templates |
| Rowing as Lower B cardio | Lower B now elliptical **or** stationary bike |

Warm-up movements still used: arm circles, band pull-apart, glute bridge activation, leg swings, cat-cow, cable face pull, elliptical, stationary bike.

## Visuals that can be reused (23 referenced keys already in registry)

Examples: `chest-press-machine`, `lat-pulldown`, `chest-supported-row`, `leg-press`, `seated-leg-curl`, `seated-calf-raise-machine`, `dead-bug`, `hip-thrust-machine`, `leg-extension-machine`, `pallof-press`, `forearm-plank`, `side-plank`, `seated-cable-row`, `seated-hip-abduction-machine`, `cable-crunch-kneeling`, plus warm-up/cardio keys (`elliptical`, `stationary-bike`, `arm-circles`, `band-pull-apart`, `glute-bridge-activation`, `leg-swings`, `cat-cow`, `cable-face-pull`).

## Visuals that must be newly created (17)

All new V2 catalog keys (see New exercise IDs above). Registry entries and WebP assets are **not** added in this phase — keys are authored on exercises for a later visual batch.

## Existing inconsistent visuals (later phase)

A later visual-consistency pass should replace any remaining mixed-style or inconsistent male/female handbook illustrations so the full V2 set matches one style. This phase does not regenerate or delete assets.

## Counts

| Category | Count |
| --- | --- |
| Active V2 catalog exercises | 32 |
| Retained IDs | 15 |
| New IDs | 17 |
| Referenced visual keys | 40 |
| Reusable registry keys | 23 |
| Missing visual keys | 17 |

## Weekly muscle volume (direct primary sets)

Block 1 normal weeks hit targets. Block 2 weekly volume was corrected by reducing Lower B2 Bulgarian Split Squat from 3 → 2 sets per side so glutes and quads stay within target ranges.

| Week | Chest | Back | Shoulders | Biceps | Triceps | Quads | Hams | Glutes | Calves | Core |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1–4 | 10 | 13 | 8 | 6 | 6 | 13 | 9 | 10 | 6 | 9 |
| 5 deload | 7 | 9 | 6 | 4 | 4 | 9 | 6 | 7 | 4 | 6 |
| 6–8 | 10 | 13 | 8 | 6 | 6 | 12 | 10 | 12 | 6 | 9 |
