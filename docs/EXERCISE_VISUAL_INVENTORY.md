# Exercise Visual Inventory

Preparation-only document. **No images were added, generated, downloaded, or
embedded in any pass.** This inventory has gone through two phases:

1. **Inventory phase** - catalogued every unique movement in the 32-workout
   program by stable ID.
2. **Naming-normalization + visual-mapping phase** (this update) - added a
   stable `visualAssetKey` to every movement in `src/data/program.ts`,
   normalized the 5 ambiguous exercise names flagged in phase 1, and
   introduced a typed registry (`src/data/exerciseVisuals.ts`) as the single
   source of truth for the 27 reusable visual assets. This document has been
   updated to match that registry exactly.

## Methodology

- Inspected [`src/data/program.ts`](../src/data/program.ts), the related
  types in [`src/types.ts`](../src/types.ts) (`Exercise`, `WarmupItem`,
  `CardioBlock`), and the registry in
  [`src/data/exerciseVisuals.ts`](../src/data/exerciseVisuals.ts).
- The program is generated from 4 weekly session templates (Workday A,
  Workday B, Off Day A, Off Day B) repeated once per week for 8 weeks, in a
  fixed rotation (`VARIANT_SEQUENCE`). Because the rotation is fixed, each
  template's movements land on a predictable, fully-enumerable set of
  workout numbers (e.g. Workday A is always workouts 1, 5, 9, 13, ... 29).
- Movements are grouped **by stable `id`** (per `Exercise.id` /
  `WarmupItem.id`), not just by display name. `CardioBlock` still has no
  `id` field - cardio rows use the `machine` value as the effective stable
  identifier (unchanged data-model gap, noted below).
- Every movement's `visualAssetKey` is now cross-checked against
  `src/data/exerciseVisuals.ts` using `src/lib/visualAssetValidation.ts`.
  See [Validation](#validation) below.
- Workout training intent (sets, reps, duration, week structure,
  progression, safety notes) was **not** changed. Only display names,
  `notes`, and the new `visualAssetKey` field were added/edited.

## Summary

| Metric | Count |
| --- | --- |
| Workouts scanned | 32 |
| Unique movement **IDs** (strict `id`-based grouping) | 35 |
| &nbsp;&nbsp;- Warm-up IDs | 13 |
| &nbsp;&nbsp;- Strength IDs | 12 |
| &nbsp;&nbsp;- Core IDs | 7 |
| &nbsp;&nbsp;- Cardio machines | 3 |
| Duplicate-ID-with-different-name issues found | 0 |
| Duplicate-name-with-different-ID groups found (now sharing one `visualAssetKey`) | 5 |
| Ambiguous names normalized | 5 |
| Movements needing more than one static frame (`two-position`) | 11 |
| **Final visual asset registry entries** | **27** |

The gap between 35 IDs and 27 registry entries is intentional and now
codified in `visualAssetKey`: several IDs point at the same registry entry
because they are visually identical movements (see
[Shared visual asset keys](#shared-visual-asset-keys) below).

## Warm-Up Movements

| ID | Name | Visual Asset Key | Equipment | Body Position | Primary Muscles | # Workouts | Workout Numbers | Suggested Visual Type | Safety Emphasis |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `warmup-bike-easy` | Easy Stationary Bike Warm-Up | `stationary-bike` | Stationary bike | Seated | Full-body (light aerobic) | 8 | 1, 5, 9, 13, 17, 21, 25, 29 | Machine (shared with cardio) | None |
| `warmup-arm-circles` | Arm Circles | `arm-circles` | None (bodyweight) | Standing | Shoulders | 8 | 1, 5, 9, 13, 17, 21, 25, 29 | Two-position | Shoulder |
| `warmup-glute-bridge` | Glute Bridge Activation | `glute-bridge-activation` | None (mat) | Lying on back | Glutes, hamstrings | 16 | 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31 | Two-position | Lower back |
| `warmup-elliptical-easy` | Easy Elliptical Warm-Up | `elliptical` | Elliptical | Standing | Full-body (light aerobic) | 8 | 3, 7, 11, 15, 19, 23, 27, 31 | Machine (shared with cardio) | None |
| `warmup-band-pull-apart` | Band Pull-Aparts | `band-pull-apart` | Resistance band | Standing | Rear delts, upper back | 8 | 3, 7, 11, 15, 19, 23, 27, 31 | Two-position | Shoulder |
| `warmup-elliptical-easy-long` | Easy Elliptical Warm-Up | `elliptical` | Elliptical | Standing | Full-body (light aerobic) | 8 | 2, 6, 10, 14, 18, 22, 26, 30 | Machine (shared with cardio) | None |
| `warmup-leg-swings` | Leg Swings (Controlled, Holding Support) | `leg-swings` | Wall/rail for support | Standing | Hips | 8 | 2, 6, 10, 14, 18, 22, 26, 30 | Two-position | Knee |
| `warmup-glute-bridge-long` | Glute Bridge Activation | `glute-bridge-activation` | None (mat) | Lying on back | Glutes, hamstrings | 8 | 2, 6, 10, 14, 18, 22, 26, 30 | Two-position (shared asset) | Lower back |
| `warmup-band-pull-apart-long` | Band Pull-Aparts | `band-pull-apart` | Resistance band | Standing | Rear delts, upper back | 8 | 2, 6, 10, 14, 18, 22, 26, 30 | Two-position (shared asset) | Shoulder |
| `warmup-bike-easy-long` | Easy Stationary Bike Warm-Up | `stationary-bike` | Stationary bike | Seated | Full-body (light aerobic) | 8 | 4, 8, 12, 16, 20, 24, 28, 32 | Machine (shared with cardio) | None |
| `warmup-cat-cow` | Cat-Cow | `cat-cow` | Mat | Kneeling (quadruped) | Spinal mobility | 8 | 4, 8, 12, 16, 20, 24, 28, 32 | Two-position | Lower back |
| `warmup-glute-bridge-long2` | Glute Bridge Activation | `glute-bridge-activation` | None (mat) | Lying on back | Glutes, hamstrings | 8 | 4, 8, 12, 16, 20, 24, 28, 32 | Two-position (shared asset) | Lower back |
| `warmup-face-pull-light` | Cable Face Pull (Light) | `cable-face-pull` | Cable machine | Standing | Rear delts, rotator cuff | 8 | 4, 8, 12, 16, 20, 24, 28, 32 | Two-position (shared asset) | Shoulder |

## Strength Movements

Names marked **(normalized)** were changed in this phase; the previous name
is shown for traceability. IDs were **not** changed, to preserve weight
history continuity in existing `localStorage` logs.

| ID | Name | Visual Asset Key | Equipment | Body Position | Primary Muscles | # Workouts | Workout Numbers | Suggested Visual Type | Safety Emphasis |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `chest-press-machine` | Chest Press Machine | `chest-press-machine` | Chest press machine | Seated | Chest, triceps | 16 | 1, 2, 5, 6, 9, 10, 13, 14, 17, 18, 21, 22, 25, 26, 29, 30 | Machine | Shoulder |
| `leg-press` | Leg Press | `leg-press` | Leg press machine | Seated/reclined | Quads, glutes | 16 | 1, 2, 5, 6, 9, 10, 13, 14, 17, 18, 21, 22, 25, 26, 29, 30 | Machine | Knee |
| `seated-cable-row` | Seated Cable Row | `seated-cable-row` | Cable row machine | Seated | Mid-back, biceps | 8 | 1, 5, 9, 13, 17, 21, 25, 29 | Machine | Shoulder |
| `leg-curl-machine` | **Seated Leg Curl (Machine)** (normalized, was "Leg Curl (Seated or Lying Machine)") | `seated-leg-curl` | Seated leg curl machine | Seated | Hamstrings | 24 | 1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 14, 16, 17, 18, 20, 21, 22, 24, 25, 26, 28, 29, 30, 32 | Machine | None |
| `lat-pulldown` | Lat Pulldown (Cable) | `lat-pulldown` | Cable/lat pulldown machine | Seated | Lats, biceps | 16 | 3, 4, 7, 8, 11, 12, 15, 16, 19, 20, 23, 24, 27, 28, 31, 32 | Machine | Shoulder |
| `hip-thrust-glute-bridge` | **Hip Thrust Machine (Pad-Supported)** (normalized, was "Hip Thrust or Glute Bridge (Machine or Pad-Supported)") | `hip-thrust-machine` | Hip thrust machine or bench + pad | Supine, hips extending | Glutes, hamstrings | 24 | 2, 3, 4, 6, 7, 8, 10, 11, 12, 14, 15, 16, 18, 19, 20, 22, 23, 24, 26, 27, 28, 30, 31, 32 | Two-position | Lower back |
| `chest-supported-row` | Chest-Supported Row (Machine) | `chest-supported-row` | Chest-supported row machine | Prone, chest on pad | Mid-back, rear delts | 16 | 3, 4, 7, 8, 11, 12, 15, 16, 19, 20, 23, 24, 27, 28, 31, 32 | Machine | Shoulder |
| `leg-extension-machine` | Leg Extension (Machine) | `leg-extension-machine` | Leg extension machine | Seated | Quads | 8 | 3, 7, 11, 15, 19, 23, 27, 31 | Machine | Knee |
| `cable-lateral-raise` | Cable Lateral Raise (Light-Moderate) | `cable-lateral-raise` | Cable machine | Standing | Side delts | 8 | 2, 6, 10, 14, 18, 22, 26, 30 | Two-position | Shoulder |
| `seated-calf-raise-machine` | Seated Calf Raise (Machine) | `seated-calf-raise-machine` | Seated calf raise machine | Seated | Calves | 8 | 2, 6, 10, 14, 18, 22, 26, 30 | Machine | None |
| `cable-face-pull` | Cable Face Pull (Light) | `cable-face-pull` | Cable machine | Standing | Rear delts, rotator cuff | 8 | 4, 8, 12, 16, 20, 24, 28, 32 | Two-position (shared asset) | Shoulder |
| `hip-abduction-machine` | **Seated Hip Abduction Machine** (normalized, was "Hip Abduction Machine (or Standing Cable)") | `seated-hip-abduction-machine` | Seated hip abduction machine | Seated | Glute medius | 8 | 4, 8, 12, 16, 20, 24, 28, 32 | Machine | None |

## Core Movements

| ID | Name | Visual Asset Key | Equipment | Body Position | Primary Muscles | # Workouts | Workout Numbers | Suggested Visual Type | Safety Emphasis |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `dead-bug` | Dead Bug | `dead-bug` | Mat | Lying on back | Deep core | 16 | 1, 4, 5, 8, 9, 12, 13, 16, 17, 20, 21, 24, 25, 28, 29, 32 | Two-position | Lower back |
| `cable-crunch-kneeling` | Cable Crunch (Kneeling) | `cable-crunch-kneeling` | Cable machine | Kneeling | Abdominals | 16 | 1, 2, 5, 6, 9, 10, 13, 14, 17, 18, 21, 22, 25, 26, 29, 30 | Machine | Lower back |
| `side-plank` | **Side Plank** (normalized, was "Side Plank (Knee-Supported Option Available)"; modification moved to `notes`) | `side-plank` | Mat | Side-lying, propped on forearm | Obliques | 16 | 3, 4, 7, 8, 11, 12, 15, 16, 19, 20, 23, 24, 27, 28, 31, 32 | Single-position | Shoulder |
| `bird-dog` | Bird Dog | `bird-dog` | Mat | Kneeling (quadruped) | Deep core, glutes | 8 | 3, 7, 11, 15, 19, 23, 27, 31 | Two-position | Lower back |
| `standing-cable-woodchopper` | Standing Cable Woodchopper (Moderate Load) | `standing-cable-woodchopper` | Cable machine | Standing | Obliques | 8 | 2, 6, 10, 14, 18, 22, 26, 30 | Two-position | Lower back |
| `machine-ab-crunch` | Machine Ab Crunch (Controlled) | `machine-ab-crunch` | Ab crunch machine | Seated | Abdominals | 8 | 4, 8, 12, 16, 20, 24, 28, 32 | Machine | Lower back |
| `forearm-plank` | **Forearm Plank** (normalized, was "Forearm Plank (Knees-Down Option Available)"; modification moved to `notes`) | `forearm-plank` | Mat | Prone, propped on forearms | Deep core | 8 | 2, 6, 10, 14, 18, 22, 26, 30 | Single-position | Lower back |

## Cardio Movements

`CardioBlock` still has no `id` field (see [Data-model gap](#data-model-gap-cardio-has-no-stable-id)),
so these rows are keyed by `machine`. Its new `visualAssetKey` field is now
populated via `CARDIO_VISUAL_KEY` in `program.ts`.

| Key | Name | Visual Asset Key | Equipment | Body Position | Primary Muscles | # Workouts | Workout Numbers | Suggested Visual Type | Safety Emphasis |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `cardio-stationary-bike` | Stationary Bike | `stationary-bike` | Stationary bike | Seated | Quads, calves (light aerobic) | 8 | 1, 5, 9, 13, 17, 21, 25, 29 | Machine | None |
| `cardio-rowing` | Rowing Machine | `rowing-machine` | Rowing machine | Seated, sliding | Full-body (legs, back, arms) | 8 | 2, 6, 10, 14, 18, 22, 26, 30 | Machine | Lower back, shoulder |
| `cardio-elliptical` | Elliptical | `elliptical` | Elliptical machine | Standing | Full-body (light aerobic) | 16 | 3, 4, 7, 8, 11, 12, 15, 16, 19, 20, 23, 24, 27, 28, 31, 32 | Machine | None |

## Shared Visual Asset Keys

These `visualAssetKey` values are intentionally referenced by more than one
movement ID, because the movements are visually identical:

| Visual Asset Key | IDs that share it |
| --- | --- |
| `glute-bridge-activation` | `warmup-glute-bridge`, `warmup-glute-bridge-long`, `warmup-glute-bridge-long2` |
| `band-pull-apart` | `warmup-band-pull-apart`, `warmup-band-pull-apart-long` |
| `elliptical` | `cardio-elliptical` (machine), `warmup-elliptical-easy`, `warmup-elliptical-easy-long` |
| `stationary-bike` | `cardio-stationary-bike` (machine), `warmup-bike-easy`, `warmup-bike-easy-long` |
| `cable-face-pull` | `cable-face-pull` (strength), `warmup-face-pull-light` |

Every other `visualAssetKey` is referenced by exactly one movement ID.

## Naming Normalization (Resolved)

The 5 ambiguous names flagged in the inventory phase were normalized to one
clearly specified movement. Only `name` and `notes` changed - `id`,
`targetSets`, `targetReps`, `restSeconds`, `optional`, and `safetyNote` are
untouched, so history, progression, and training intent are unaffected.

| ID | Previous name | Final name | Substitution guidance moved to `notes` |
| --- | --- | --- | --- |
| `hip-thrust-glute-bridge` | Hip Thrust or Glute Bridge (Machine or Pad-Supported) | Hip Thrust Machine (Pad-Supported) | "If a hip thrust machine isn't available, substitute a pad-supported glute bridge using the same setup." |
| `leg-curl-machine` | Leg Curl (Seated or Lying Machine) | Seated Leg Curl (Machine) | "If a seated leg curl machine isn't available, a lying leg curl machine works the same muscles." |
| `hip-abduction-machine` | Hip Abduction Machine (or Standing Cable) | Seated Hip Abduction Machine | "If unavailable, a standing cable hip abduction is an equivalent substitute." |
| `side-plank` | Side Plank (Knee-Supported Option Available) | Side Plank | "Beginner modification: bend the knees and support on the forearm and knee instead of the feet." |
| `forearm-plank` | Forearm Plank (Knees-Down Option Available) | Forearm Plank | "Beginner modification: lower the knees to the ground while keeping the torso straight." |

No remaining ambiguous names in the program data.

## Movements that should not be represented with a single static image

Unchanged finding from the inventory phase - these 11 movements involve
motion through a range or alternating sides, so the registry marks them
`visualType: "two-position"` rather than `"single-position"`:

`warmup-arm-circles`, `warmup-glute-bridge` (+ its 2 duplicate IDs),
`warmup-band-pull-apart` (+ its duplicate ID), `warmup-leg-swings`,
`warmup-cat-cow`, `warmup-face-pull-light` / `cable-face-pull`,
`hip-thrust-glute-bridge`, `cable-lateral-raise`,
`standing-cable-woodchopper`, `bird-dog`, `dead-bug`.

`side-plank` and `forearm-plank` remain the only two movements where a
single static posture image (`visualType: "single-position"`) is
sufficient.

## Data-model gap: cardio has no stable `id`

`CardioBlock` (in [`src/types.ts`](../src/types.ts)) has `machine`,
`durationMinutes`, `intensity`, `optional`, `safetyNote`, and now
`visualAssetKey`, but still no `id` field, unlike `Exercise` and
`WarmupItem`. This remains fine today because there are only 3 machines and
each cardio block always uses exactly one of them consistently. Not changed
in this pass, per the "do not change storage, history, feedback, routing,
PWA, deployment, or workout-order behavior" instruction.

## Visual Asset Registry

The authoritative registry now lives in
[`src/data/exerciseVisuals.ts`](../src/data/exerciseVisuals.ts) (27
entries, `status: "planned"` for all - no image files exist yet). This
table mirrors it for quick reference:

| Visual Asset Key | Display Name | Filename | Visual Type | Safety Emphasis |
| --- | --- | --- | --- | --- |
| `chest-press-machine` | Chest Press Machine | `chest-press-machine.webp` | machine | shoulder |
| `leg-press` | Leg Press | `leg-press.webp` | machine | knee |
| `seated-cable-row` | Seated Cable Row | `seated-cable-row.webp` | machine | shoulder |
| `seated-leg-curl` | Seated Leg Curl (Machine) | `seated-leg-curl.webp` | machine | none |
| `lat-pulldown` | Lat Pulldown (Cable) | `lat-pulldown.webp` | machine | shoulder |
| `hip-thrust-machine` | Hip Thrust Machine (Pad-Supported) | `hip-thrust-machine.webp` | two-position | lower-back |
| `chest-supported-row` | Chest-Supported Row (Machine) | `chest-supported-row.webp` | machine | shoulder |
| `leg-extension-machine` | Leg Extension (Machine) | `leg-extension-machine.webp` | machine | knee |
| `cable-lateral-raise` | Cable Lateral Raise (Light-Moderate) | `cable-lateral-raise.webp` | two-position | shoulder |
| `seated-calf-raise-machine` | Seated Calf Raise (Machine) | `seated-calf-raise-machine.webp` | machine | none |
| `cable-face-pull` | Cable Face Pull (Light) | `cable-face-pull.webp` | two-position | shoulder |
| `seated-hip-abduction-machine` | Seated Hip Abduction Machine | `seated-hip-abduction-machine.webp` | machine | none |
| `dead-bug` | Dead Bug | `dead-bug.webp` | two-position | lower-back |
| `cable-crunch-kneeling` | Cable Crunch (Kneeling) | `cable-crunch-kneeling.webp` | machine | lower-back |
| `side-plank` | Side Plank | `side-plank.webp` | single-position | shoulder |
| `bird-dog` | Bird Dog | `bird-dog.webp` | two-position | lower-back |
| `standing-cable-woodchopper` | Standing Cable Woodchopper (Moderate Load) | `standing-cable-woodchopper.webp` | two-position | lower-back |
| `machine-ab-crunch` | Machine Ab Crunch (Controlled) | `machine-ab-crunch.webp` | machine | lower-back |
| `forearm-plank` | Forearm Plank | `forearm-plank.webp` | single-position | lower-back |
| `arm-circles` | Arm Circles | `arm-circles.webp` | two-position | shoulder |
| `glute-bridge-activation` | Glute Bridge Activation | `glute-bridge-activation.webp` | two-position | lower-back |
| `band-pull-apart` | Band Pull-Aparts | `band-pull-apart.webp` | two-position | shoulder |
| `leg-swings` | Leg Swings (Controlled, Holding Support) | `leg-swings.webp` | two-position | knee |
| `cat-cow` | Cat-Cow | `cat-cow.webp` | two-position | lower-back |
| `elliptical` | Elliptical | `elliptical.webp` | machine | none |
| `stationary-bike` | Stationary Bike | `stationary-bike.webp` | machine | none |
| `rowing-machine` | Rowing Machine | `rowing-machine.webp` | machine | lower-back-and-shoulder |

**Corrected asset-count total: still 27** - inspection during this phase
confirmed the phase-1 estimate was exactly right; no correction was needed.

## Validation

`src/lib/visualAssetValidation.ts` exports `validateVisualAssets(workouts,
registry)`, which checks:

- **Missing key references** - a movement with no `visualAssetKey` set.
  Structurally prevented at compile time: `CatalogEntry.visualAssetKey` and
  the `warmupItem()` options parameter are both required (non-optional)
  TypeScript fields, and `cardioBlock()` always sets one from
  `CARDIO_VISUAL_KEY`.
- **Unknown key references** - a movement pointing at a key absent from
  `EXERCISE_VISUALS`.
- **Duplicate registry keys** - two registry entries with the same
  `visualAssetKey`.
- **Duplicate filenames** - two registry entries with the same `filename`.
- **Unreferenced registry entries** - a registry entry no movement in the
  program points at.

Manually cross-checking the full set of `visualAssetKey` values used across
all 32 workouts against the 27 registry keys (both enumerated in this
document) confirms the sets are identical: zero missing, zero unknown,
zero duplicate keys/filenames in the registry, and zero unreferenced
registry entries. This utility is not wired into the build or UI yet -
it's a standalone function available for a future automated check.

## Remaining Ambiguity

None identified. All 5 previously-flagged ambiguous names are normalized,
all 35 movement IDs have a `visualAssetKey`, and all 27 registry entries
are referenced by at least one movement. The only open item is the
pre-existing `CardioBlock` "no `id` field" data-model gap, which is
low-risk (only 3 machines, each used consistently) and intentionally left
unchanged in this pass.
