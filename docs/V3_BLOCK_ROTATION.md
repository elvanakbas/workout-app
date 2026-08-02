# V3 Block Rotation — Accessory Variation Across Two Training Blocks

**Program version:** `v3-program-identity` (unchanged)
**Scope:** `src/data/program.ts`, `src/lib/muscleVolume.ts`, `scripts/validate-v3-program.ts`

## Problem

The V3 program authored 32 workouts from four templates repeated eight times with
identical movements. The only week-to-week variation was the week 5 deload set
reduction. Eight catalog exercises — all with finished 800×600 WebP visuals
already in the registry — were never referenced by any workout.

## What changed

Weeks 1–4 (plus the week 5 deload) are **Block 1**. Weeks 6–8 are **Block 2**.
The `trainingBlock` field already existed on `Workout` and already split the
program this way, so no new scheduling concept was introduced.

Eight accessory slots now rotate to a different movement in Block 2:

| Day | Slot | Block 1 (weeks 1–5) | Block 2 (weeks 6–8) | Sets |
| --- | --- | --- | --- | ---: |
| Upper A — Push | 1 | Machine Chest Press *(Primary)* | *unchanged* | 4 |
| | 2 | Seated Dumbbell Shoulder Press | **Machine Shoulder Press** | 3 |
| | 3 | **Cable Fly** | **Flat Dumbbell Press** | 2 |
| | 4 | Rope Triceps Pushdown | **Cable Triceps Pushdown** | 3 |
| | 5 | Dumbbell Lateral Raise | *unchanged* | 3 |
| | 6 | Chest-Supported Dumbbell Row | *unchanged* | 3 |
| Lower A — Quad | 1 | Leg Press *(Primary)* | *unchanged* | 4 |
| | 2 | Leg Extension | *unchanged* | 3 |
| | 3 | Seated Calf Raise | *unchanged* | 4 |
| | 4 | Dumbbell Romanian Deadlift | Seated Leg Curl | 2 |
| | 5 | Dead Bug | **Cable Crunch** | 2 |
| Upper B — Pull | 1 | Chest-Supported Row *(Primary)* | *unchanged* | 4 |
| | 2 | Neutral-Grip Lat Pulldown | *unchanged* | 3 |
| | 3 | Seated Cable Row | *unchanged* | 3 |
| | 4 | Incline Dumbbell Press | *unchanged* | 3 |
| | 5 | Rear Delt Fly Machine | **Cable Face Pull** | 3 |
| | 6 | Incline Dumbbell Curl | **Alternating Dumbbell Curl** | 3 |
| | 7 | Dumbbell Hammer Curl | *unchanged* | 3 |
| | 8 | Overhead Cable Triceps Extension | *unchanged* | 3 |
| Lower B — Posterior | 1 | Hip Thrust *(Primary)* | *unchanged* | 4 |
| | 2 | Dumbbell Romanian Deadlift | *unchanged* | 3 |
| | 3 | Seated Leg Curl | *unchanged* | 3 |
| | 4 | Dumbbell Bulgarian Split Squat | **Hack Squat** | 3 |
| | 5 | Seated Hip Abduction Machine | *unchanged* | 3 |
| | 6 | Seated Calf Raise | *unchanged* | 4 |
| | 7 | Cable Pallof Press *(Stability)* | *unchanged* | 2 |

**Bold** movements were previously unreferenced catalog entries. All eight had
ready registry entries and WebP files, so the rotation required **no new visual
assets**. Referenced visual keys went from 32 to 40, closing the gap against the
40-entry registry.

## Design rules

1. **Primary Lifts never rotate.** Machine Chest Press, Leg Press,
   Chest-Supported Row and Hip Thrust are the same movement in both blocks, so
   double progression runs uninterrupted for the full eight weeks.
2. **Set counts are block-independent.** A rotating slot keeps its set count;
   only the movement (and where needed the rep range, rest and role) changes.
   One weekly volume table therefore stays valid for the whole program.
3. **The deload uses Block 1 movements.** Week 5 is `trainingBlock: 1`, so the
   lightest week is never also a movement-learning week.
4. **Workout IDs are untouched.** `w1`…`w32` and the identity/weekday sequence
   are unchanged, so progress, Recommended Next and the schedule are unaffected.

### Evidence base

- Baz-Valle et al. 2019, *PLOS One* — 19 trained men, 8 weeks, volume-equated.
  Randomly varied exercise selection matched fixed selection for muscle
  thickness and strength but produced a significant improvement in intrinsic
  motivation, while vastus intermedius growth reached significance only in the
  fixed group. The authors advise limiting variety on compound lifts and
  varying isolation work.
- Kassiano et al. 2022, *J Strength Cond Res* (systematic review) — systematic
  variation appears to help regional hypertrophy, whereas excessive random
  variation may compromise gains.

Together these support rotating accessories on a block boundary while holding
the compound Primary Lifts fixed — rather than varying movements weekly.

## Weekly volume change

Mandatory direct sets (primary muscles only), identical in Block 1 and Block 2:

| Muscle | Before | After |
| --- | ---: | ---: |
| Chest | 7 | **9** |
| Back | 12 | **13** |
| Shoulders | 8 | **9** |
| Biceps | 5 | **6** |
| Triceps | 5 | **6** |
| Quadriceps | 10 | 10 |
| Hamstrings | 8 | 8 |
| Glutes | 8 | **7** |
| Calves | 6 | **8** |
| Core | 4 | 4 |
| **Weekly total** | **73** | **80** |

This supersedes the earlier "Chest 7 is an accepted trade-off" decision. Chest,
biceps, triceps and calves previously sat below commonly cited minimum effective
weekly volume for hypertrophy; glutes moved down one set because the Hip Thrust
Primary already loads them heavily. `WEEKLY_MUSCLE_TARGETS` was retargeted to the
new numbers — the validator still fails on any miss, in either direction.

Session budgets:

| Day | Exercises | Sets (was) | Estimated main work |
| --- | ---: | ---: | --- |
| Upper A — Push (Tue) | 6 | 18 (16) | ~45–55 min (was 40–50) |
| Lower A — Quad (Wed) | 5 | 15 (15) | ~40–55 min (unchanged) |
| Upper B — Pull (Fri) | 8 | 25 (21) | ~75–95 min (was 70–90) |
| Lower B — Posterior (Sun) | 7 | 22 (21) | ~75–95 min (unchanged) |

The added volume is concentrated on Friday, an off day. Wednesday and Sunday are
unchanged; Tuesday grows by two sets. Biceps work moved off Tuesday onto the
Friday pull session, leaving Upper A a clean push session.

Week 5 deload is 48 sets against 80, a 40% reduction — inside the documented
35–45% band.

## Data safety

A block boundary changes which exercise IDs a workout contains, which affects
open drafts for `w21`–`w32`. No new migration code was required:
`migrateDraftToCurrentProgram` already moves entries whose exercise ID is no
longer live into `legacyEntries` rather than discarding them, initializes new
IDs empty, and is idempotent.

Verified in the browser with a pre-rotation draft injected for `w21`:

- retained movements kept their reps/kg and completion flags
- the three rotated-away movements moved to `legacyEntries` with values intact
- Block 2 movements were initialized empty
- `startedAt`, feedback and notes were preserved
- `updatedAt` bumped exactly once; a second load did not rewrite it

History is unaffected: completed logs snapshot immutable exercise names and IDs,
and nothing rewrites existing records.

New validator coverage in `scripts/validate-v3-program.ts` (checks 12b–12o):
every non-deload week hits its targets; Block 1 and Block 2 weekly volume are
identical per muscle; Primary Lifts and per-slot set counts match across blocks;
at least six slots actually rotate; and cross-block draft migration preserves
values, initializes new movements and stays idempotent.
