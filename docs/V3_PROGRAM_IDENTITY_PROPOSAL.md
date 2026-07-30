# V3 Program Identity & Schedule UX — Design Proposal (Phase 7A → 7B)

**Status:** Approved decisions locked below; implementation on `phase-7-program-identity`.  
**Program version:** `v3-program-identity`  
**See also:** `docs/V3_PROGRAM_IDENTITY_IMPLEMENTATION.md`

---

## Approved decisions (Phase 7B gate)

1. **UX:** Concept A — Today’s Plan / Recommended Next hero + This Week strip + quieter week-collapsed 32-list.  
2. **Structure:** 8×4, consistent exercises weeks 1–8, week 5 deload (~35–45% set cut).  
3. **Schedule:** Preferred Tue/Wed/Fri/Sun fixed in UI; optional “Week 1 Upper A date”; offsets 0/1/3/5.  
4. **Roles:** Presentation mapping only (`isolation`→Accessory, `core`→Stability); `optional: true` separate.  
5. **Primary Lifts:** Chest Press / Leg Press / CS Row Machine / Hip Thrust — exactly one, first after warm-up, LEM-safe.  
6. **Optional blocks:** Fri Dead Bug+Pallof; Sun Plank+Side Plank; Cardio elliptical/bike; collapsed add actions.  
7. **Volume targets:** chest 7–8, back 11–12, shoulders 8–10, arms 5–6, quads 10, ham 8, glutes 8–10, calves 6, core 4–6 mandatory.  
8. **No new exercises/visuals.**  
9. **Cloud:** schedule namespaced inside `user_settings`; no new tables/RLS.  

---

## 1. Product goal

Make the 8-week Upper/Lower plan feel intentionally designed around a real work week (Mon–Thu 07:30–19:30), without locking the user into a calendar.

The app should answer, at a glance:

1. What is **today’s preferred session** (if any)?
2. What is **Recommended Next** (lowest incomplete order — unchanged)?
3. What is this day’s **identity** (Push / Quad / Pull / Posterior)?
4. What is **required** vs **optional add-on** time?

Creativity is constrained to reduce friction: clearer hierarchy, identity, schedule cues, role scanning, optional-block ergonomics, and honest duration — not social, streaks, gamification, or dashboard clutter.

---

## 2. User schedule (preferred, not enforced)

| Preferred day | Workout | Main duration | Identity |
| --- | --- | --- | --- |
| Tuesday | Upper A | ~40–50 min | Push emphasis |
| Wednesday | Lower A | ~40–55 min | Quad emphasis |
| Friday | Upper B | ~70–90 min | Pull emphasis |
| Sunday | Lower B | ~75–95 min | Posterior-chain emphasis |

Still allowed: open any workout, train on another day, miss a preferred day, keep flexible ordering, use Recommended Next as lowest incomplete order, use the app with **no** calendar configuration.

Neutral missed-day language only (never “failed” / streak-break guilt):

- “Planned for Tuesday”
- “Ready when you are”
- “Next recommended”

---

## 3. Phase 0 — Repository audit (current `main`)

### 3.1 Reusable types (`src/types.ts`)

| Concept | Current | Notes |
| --- | --- | --- |
| `ExerciseRole` | `primary` \| `secondary` \| `isolation` \| `core` \| `cardio` | Used in data + deload math; **not shown in UI** |
| `Exercise.optional` | boolean | Wired for LEM; **no prescriptions set it today** |
| `WorkoutVariant` | `upper-a` \| `lower-a` \| `upper-b` \| `lower-b` | Keep |
| `SessionLength` | `short` \| `long` | Maps to Workday / Off Day |
| `FocusArea` | `upper` \| `lower` | Keep |
| Schedule / preferred weekday / planned date | **absent** | No program calendar |
| `WorkoutLog` | schema 1\|2 | Snapshots title/variant/length/entries/cardio; **no role, optional, planned date, program version** |
| `UserSettingsPayload` (cloud) | nutrition only | Natural home for schedule settings |

### 3.2 Current program identities (`docs/V2_PROGRAM_SPEC.md` + `program.ts`)

| Day | Label | Duration estimate | Main exercises | Sets (approx) | Identity today |
| --- | --- | --- | --- | --- | --- |
| Upper A | Workday | 35–45 | 6 | 17 | Balanced upper (press + pull + arms) |
| Lower A | Workday | 35–45 | 5 | 15 | Quads + RDL + curl + calves + dead bug |
| Upper B | Off Day | 70–90 | 8 | 26 | Heavy press-led upper + arms |
| Lower B | Off Day | 70–90 | 8 + cardio | 26 | Quad + hip thrust + core + **required** cardio |

Gaps vs V3 intent:

- Upper A is **not** push-led (three primaries include pulldown + row).
- Upper B is **press-led**, not pull-led.
- Lower A/B identities overlap (both heavy quad + posterior).
- Cardio is only on Lower B and authored **required** (`optional: false`).
- Optional Core / Optional Cardio as first-class add-ons do not exist.
- Roles unused in UI; LEM copy (“Trims to core exercises”) does not match LEM code (drops `optional`, caps sets).

### 3.3 Current weekly direct volume (normal weeks)

From validator / spec targets: Chest 10–12, Back 12–14, Shoulders 7–10, Biceps/Triceps/Calves 6, Quads 10–14, Ham 8–10, Glutes 8–12, Core 6–9.  
Warm-ups excluded; `primaryMuscles` only; cardio not counted.

### 3.4 Duration assumptions

Rest defaults ~75–90s strength / 45s core; Off Day estimates 70–90 min are long vs the new 60–75 **main** budget (optional add-ons separate).

### 3.5 Schedule / date support

- Recommended Next = lowest incomplete `order` (`src/lib/progress.ts`) — **preserve**.
- Nutrition links via `startedAt` / `completedAt` → local `YYYY-MM-DD` (`localDate.ts`) — **preserve**.
- No preferred weekday, no program start date, no planned-date calculation.

### 3.6 Migration / cloud risks

- Never rewrite existing History; freeze titles/entries.
- Progression hints key on `exerciseId` — prefer **stable IDs**.
- Active drafts keyed by `workoutId`; exercise-ID drift leaves orphan draft entries (safe if UI ignores unknown IDs).
- Progress = completed **orders** (1–32); order sequence stays A→B→A→B within weeks — mapping remains valid if 32-slot structure preserved.
- Cloud `user_settings` can absorb schedule without a new table; `mergeSettings` must learn schedule conflict rules.
- Do not change RLS / Auth / Supabase schema in V3 program work.

### 3.7 Visual registry

40 ready keys under `public/exercise-visuals/` (see `exerciseVisuals.ts`). Prefer catalog reuse; **this proposal needs no new visuals**.

### 3.8 Files likely to change in a later implementation phase (not now)

`src/data/program.ts`, `src/types.ts`, `src/lib/muscleVolume.ts`, `src/lib/programValidation.ts`, `src/lib/progress.ts`, `src/lib/localDate.ts` (schedule helpers), `src/lib/sessionTracking.ts`, `src/lib/workoutLogBuilder.ts`, `src/state/AppDataContext.tsx`, `src/cloud/cloudTypes.ts`, `src/cloud/mergeRules.ts`, `src/cloud/syncEngine.ts`, Home / Detail / ActiveSession (+ CSS), History Detail (additive snapshot display), `activeSessionDraft.ts` (compat), validators/scripts, docs (`V2_PROGRAM_SPEC` → V3, migration note).  
**Not in this phase:** any of the above except this proposal file.

---

## 4. Phase 1 — Creative UX exploration

### Concept A — “Today’s Plan” + This Week strip (recommended)

**Home**

1. Hero: **Today’s Plan** (preferred identity for local weekday) **or** “No preferred session today” + soft cue to Recommended Next.
2. Primary CTA: **Recommended Next** (order + identity badge + duration).
3. **This Week** strip: four compact cells (Tue Push · Wed Quad · Fri Pull · Sun Posterior) with planned label / completed check / “Ready when you are”.
4. Collapsed week list below (orders 1–32), visually quieter than today.

**Schedule:** Preferred weekday labels + optional planned dates if start date set.  
**Identity:** Push / Quad / Pull / Posterior chips (not only “Upper A”).  
**Roles:** Detail + session show compact role labels; Primary Lift elevated.  
**Optional blocks:** On Fri/Sun detail & session — secondary actions “Add 10 min Core” / “Add 20 min Cardio”; not in mandatory checklist.  
**Mobile advantages:** One decision surface; life-shaped without calendar guilt.  
**Drawbacks:** Hero needs careful empty states (weekend Mon/Thu).  
**Complexity:** Medium (Home rewrite + schedule helpers + optional UX).

### Concept B — Calendar-first week board

Home becomes a week grid first; 32-list buried. Stronger calendar feel, weaker “program order” story. Higher risk of implying hard day locks. **Complexity:** Medium–high. **Rejected** for V1 — too easy to read as rigid.

### Concept C — Identity color rails only

Keep flat 32-list; add color stripes and renamed titles. Low complexity, weak “designed around your life” signal. **Rejected** as insufficient creativity / hierarchy.

### Selected concept: **A — Today’s Plan + This Week strip**

Best balance of intentional schedule feel, preserved flexibility, and maintainable scope.

---

## 5. Chosen UX concept — wireframes (text)

### 5.1 Mobile Home

```
┌─────────────────────────────────────┐
│  8-Week Strength Plan               │
│  Week 3 · Block 1 · 11 of 32 done   │
├─────────────────────────────────────┤
│  TODAY’S PLAN                       │
│  Tuesday · Push · Upper A           │
│  ~30–45 min · Planned for Tue       │
│  [ Start Upper A ]                  │
│  or: Ready when you are (if missed) │
├─────────────────────────────────────┤
│  RECOMMENDED NEXT                   │
│  Workout 11 · Lower A · Quad        │
│  [ Continue program → ]             │
├─────────────────────────────────────┤
│  THIS WEEK                          │
│  Tu Push ✓ │ We Quad · │ Fr Pull · │ Su Post · │
├─────────────────────────────────────┤
│  Week 1                             │
│  1 Upper A  Push   Tue   Done       │
│  2 Lower A  Quad   Wed   Done       │
│  … quieter list …                   │
└─────────────────────────────────────┘
```

Mon/Thu (no preferred session): hero becomes “Recovery / workday — no preferred lift” + Recommended Next as primary.

### 5.2 Workout Detail

```
┌─────────────────────────────────────┐
│  ← Program                          │
│  Upper A · Push emphasis            │
│  Preferred: Tuesday · Workday       │
│  ~30–45 min · Week 3 · Technique    │
│  RIR 2–3 · Recommended Next badge   │
│  Chest · Shoulders · Triceps        │
├─────────────────────────────────────┤
│  MAIN WORKOUT                       │
│  ★ Machine Chest Press  Primary     │
│    3×8–12 · last: 40×10 (if known)  │
│  Seated DB Shoulder Press  Secondary│
│  …                                  │
├─────────────────────────────────────┤
│  ADD-ONS (optional)     Fri/Sun     │
│  [ + Add 10 min Core ]              │
│  [ + Add 20 min Cardio ]            │
│  Skipping is fine.                  │
├─────────────────────────────────────┤
│  [ Start Workout ]                  │
└─────────────────────────────────────┘
```

Workday details omit add-on section (or show disabled “Available on Pull / Posterior days”).

### 5.3 Active Session

```
┌─────────────────────────────────────┐
│  Upper A · Push          LEM toggle │
│  Autosaved · Leave anytime          │
├─────────────────────────────────────┤
│  MAIN                               │
│  ★ Chest Press  Primary   [done]    │
│  sets…                              │
│  Shoulder Press Secondary           │
│  …                                  │
├─────────────────────────────────────┤
│  ADD-ONS                            │
│  Core not added          [Add]      │
│  or expanded plank/dead bug/…       │
│  Cardio not added        [Add]      │
├─────────────────────────────────────┤
│  Feedback → Complete Workout        │
└─────────────────────────────────────┘
```

LEM: hide/collapse add-ons (draft data retained); trim optional accessories; never delete stored optional entries.

### 5.4 Optional block interaction

- Default: collapsed chips — **Add 10 min Core** / **Add 20 min Cardio**.
- Tap Add → expands checklist; user can complete independently.
- Tap Remove / “Not today” → collapses; not marked incomplete on main workout.
- Completion flags stored on log: `optionalCoreCompleted`, `optionalCardioCompleted` (or cardio snapshot + core entry statuses).
- Volume validators **exclude** optional sets from mandatory weekly totals.

### 5.5 Schedule settings (compact, recommended)

Place under Account or a small “Program schedule” link from Home header — **not** bottom-nav redesign.

```
┌─────────────────────────────────────┐
│  Program schedule                   │
│  Preferred days (defaults)          │
│  Tue Push · Wed Quad · Fri Pull · Su│
│  [Edit days — V1.1 later]           │
│                                     │
│  Program start date (optional)      │
│  [ Not set ]  or  [ 2026-07-28 ]    │
│  Planned dates appear when set.     │
│  Clear start date → labels only.    │
└─────────────────────────────────────┘
```

**V1 decision:** Preferred weekdays **fixed defaults in UI**; architecturally stored so a later edit UI is cheap. Optional **Program Start Date** editable in V1.

### 5.6 History Detail additions (new logs only)

```
Identity: Push · Upper A
Preferred day: Tuesday
Planned: 2026-08-04 (if known) · Actual: 2026-08-05
Main workout: complete · Core add-on: skipped · Cardio: done
Primary Lift: Machine Chest Press · best set …
```

Old logs: omit missing fields; never fabricate planned dates.

---

## 6. Role semantics (reuse / extend)

### 6.1 Mapping from current `ExerciseRole`

| Current value | V3 display | V3 stored value | Semantics |
| --- | --- | --- | --- |
| `primary` | Primary Lift | `primary` | Central progression; early; last performance surfaced when reliable |
| `secondary` | Secondary Lift | `secondary` | High-value compound / identity support |
| `isolation` | Accessory | `accessory` | Focused volume / balance / aesthetics (**rename type**) |
| `core` | Stability | `stability` | Core, anti-rotation, controlled activation (**rename type**) |
| `cardio` | Cardio | `cardio` | Remains on `CardioBlock` |
| — | Optional | flag `optional: true` **or** role `optional` for add-on-only rows | Not required for workout completion |

**Recommendation:** Rename type members `isolation`→`accessory`, `core`→`stability` in authored V3 data (one-time program rewrite). Keep `optional: boolean` for LEM + completion rules so Optional is not a second overlapping taxonomy. UI label “Optional” when `optional === true`.

Exactly **one** Primary Lift per workout (validated).

---

## 7. Block structure choice

### Options

- **A.** Weeks 1–4 Block 1 selection · week 5 deload · weeks 6–8 Block 2 selection (current pattern).  
- **B.** One consistent exercise structure; progression via load/reps/RIR; limited or zero Block 2 substitutions.

### Decision: **Option B (consistent structure)**

**Why**

- Primary Lift continuity → meaningful “last performance” and History comparison.
- Exercise mastery across 8 weeks.
- Visual-asset reuse and simpler code (one template × deload modifiers).
- Boredom addressed by **identity clarity + optional add-ons + RIR progression**, not novelty swaps that break comparison.

**Week 5:** same movements; Primary −1 set (min 1); other roles → 2 sets; 3–4 RIR; lighter loads; no failure.  
**Weeks 6–8:** same exercises; resume loads carefully; progression continues.  
**No Block 2 exercise substitutions in V3** unless a later approved micro-variation phase.

Training-block field: keep `trainingBlock: 1 | 2` for weeks 1–5 vs 6–8 **phase labeling only** (not different catalogs).

---

## 8. Exact program proposal (V3)

> **Superseded for set counts, duration, and exercise lists.**  
> The tables in §8.2–§8.7 below were the Phase 7A design sketch.  
> **Authoritative final templates:** `docs/V3_PROGRAM_IDENTITY_IMPLEMENTATION.md` and `src/data/program.ts`.  
>
> Final mandatory budgets: **Upper A 6/16 · Lower A 5/15 · Upper B 7/21 · Lower B 7/21**.  
> Final main durations: **~40–50 / ~40–55 / ~70–90 / ~75–95** min.  
> Face-pull is **not** in the mandatory Upper B list (catalog only).  
> Chest **7** direct sets is an intentional accepted trade-off.  
> Deload uses `round(sets×0.6)` primary / `round(sets×0.55)` other (min 1); weekly ~42.5%; per-day rounding may slightly exceed 45%.

All exercise IDs and visual keys exist in the current catalog unless noted.  
`mandatory` = counts for completion + mandatory volume.  
`optional` = add-on block only.

### 8.1 Shared warmup (all days, not in volume)

| ID | Name | Duration | Visual |
| --- | --- | --- | --- |
| `arm-circles` or `cat-cow` / `leg-swings` / `glute-bridge-activation` / `band-pull-apart` | Keep current short warmups per upper/lower | 3–5 min total | existing |

(Implementation may retain current warmup lists per focus area.)

### 8.2 Weeks 1–4 — Main workouts

#### Upper A — Push · Preferred Tuesday · Workday · 30–45 min

| # | ID | Name | Role | Sets | Target | Rest | Meas. | Uni. | Primary muscles | Secondary | Mand. | Visual | Why |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `chest-press-machine` | Machine Chest Press | Primary | 3 | 8–12 | 90s | reps-weight | no | chest | triceps, shoulders | yes | `chest-press-machine` | Primary push progression |
| 2 | `seated-dumbbell-shoulder-press` | Seated Dumbbell Shoulder Press | Secondary | 3 | 8–12 | 90s | reps-weight | no | shoulders | triceps | yes | `seated-dumbbell-shoulder-press` | Anterior delt / press identity |
| 3 | `rope-triceps-pushdown` | Rope Triceps Pushdown | Accessory | 3 | 10–12 | 60s | reps-weight | no | triceps | — | yes | `rope-triceps-pushdown` | Direct triceps exposure #1 |
| 4 | `dumbbell-lateral-raise` | Dumbbell Lateral Raise | Accessory | 2 | 12–15 | 60s | reps-weight | no | shoulders | — | yes | `dumbbell-lateral-raise` | Side-delt push finish |
| 5 | `chest-supported-dumbbell-row` | Chest-Supported Dumbbell Row | Secondary | 2 | 10–12 | 75s | reps-weight | no | back | biceps | yes | `chest-supported-dumbbell-row` | Small back balance |
| 6 | `dumbbell-hammer-curl` | Dumbbell Hammer Curl | Accessory | 2 | 10–12 | 60s | reps-weight | no | biceps | — | yes | `dumbbell-hammer-curl` | Second weekly biceps exposure without diluting Friday pull |

- **Main exercises:** 6  
- **Mandatory sets:** 15  
- **Estimated duration:** 30–40 min (incl. warmup + ~75–90s rests; no optional block)

#### Lower A — Quad · Preferred Wednesday · Workday · 30–45 min

| # | ID | Name | Role | Sets | Target | Rest | Meas. | Uni. | Primary | Secondary | Mand. | Visual | Why |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `leg-press` | Leg Press | Primary | 3 | 10–12 | 90s | reps-weight | no | quadriceps | glutes | yes | `leg-press` | Quad primary progression |
| 2 | `leg-extension-machine` | Leg Extension | Secondary | 3 | 12–15 | 60s | reps-weight | no | quadriceps | — | yes | `leg-extension-machine` | Quad isolation support |
| 3 | `seated-calf-raise-machine` | Seated Calf Raise | Accessory | 3 | 12–15 | 45s | reps-weight | no | calves | — | yes | `seated-calf-raise-machine` | Calf exposure #1 |
| 4 | `dumbbell-romanian-deadlift` | Dumbbell Romanian Deadlift | Secondary | 2 | 8–12 | 90s | reps-weight | no | hamstrings | glutes | yes | `dumbbell-romanian-deadlift` | Controlled posterior touch |
| 5 | `dead-bug` | Dead Bug | Stability | 3 | 8–12 / side | 45s | reps-only | yes | core | — | yes | `dead-bug` | Core exposure; workday-friendly |

- **Main exercises:** 5  
- **Mandatory sets:** 14  
- **Estimated duration:** 30–40 min  

#### Upper B — Pull · Preferred Friday · Off day · 60–75 min main

| # | ID | Name | Role | Sets | Target | Rest | Meas. | Uni. | Primary | Secondary | Mand. | Visual | Why |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `chest-supported-row` | Chest-Supported Row Machine | Primary | 4 | 8–10 | 90s | reps-weight | no | back | biceps | yes | `chest-supported-row` | Primary pull progression |
| 2 | `lat-pulldown` | Neutral-Grip Lat Pulldown | Secondary | 3 | 8–12 | 90s | reps-weight | no | back | biceps | yes | `lat-pulldown` | Vertical pull / lats |
| 3 | `seated-cable-row` | Seated Cable Row | Secondary | 3 | 10–12 | 75s | reps-weight | no | back | biceps | yes | `seated-cable-row` | Mid-back volume |
| 4 | `reverse-pec-deck` | Rear Delt Fly Machine | Accessory | 3 | 12–15 | 60s | reps-weight | no | shoulders | back | yes | `reverse-pec-deck` | Rear delt / upper-back |
| 5 | `incline-dumbbell-curl` | Incline Dumbbell Curl | Accessory | 3 | 10–12 | 60s | reps-weight | no | biceps | — | yes | `incline-dumbbell-curl` | Biceps exposure #1 (long) |
| 6 | `incline-dumbbell-press` | Incline Dumbbell Press | Secondary | 3 | 8–10 | 90s | reps-weight | no | chest | shoulders, triceps | yes | `incline-dumbbell-press` | Modest chest 2nd exposure |
| 7 | `overhead-cable-triceps-extension` | Overhead Cable Triceps Extension | Accessory | 2 | 10–12 | 60s | reps-weight | no | triceps | — | yes | `overhead-cable-triceps-extension` | Triceps 2nd exposure |
| 8 | `cable-face-pull` | Cable Face Pull | Accessory | 2 | 12–15 | 60s | reps-weight | no | shoulders | back | yes | `cable-face-pull` | Upper-back / scapular health |

- **Main exercises:** 8  
- **Mandatory sets:** 23  
- **Estimated main duration:** 60–75 min  
- **Optional add-ons:** Core (~10) + Cardio (~15–20) — see §8.5

#### Lower B — Posterior · Preferred Sunday · Off day · 60–75 min main

| # | ID | Name | Role | Sets | Target | Rest | Meas. | Uni. | Primary | Secondary | Mand. | Visual | Why |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `hip-thrust-glute-bridge` | Hip Thrust | Primary | 4 | 8–12 | 90s | reps-weight | no | glutes | hamstrings | yes | `hip-thrust-machine` | Primary hip-dominant lift |
| 2 | `dumbbell-romanian-deadlift` | Dumbbell Romanian Deadlift | Secondary | 3 | 8–10 | 90s | reps-weight | no | hamstrings | glutes | yes | `dumbbell-romanian-deadlift` | Hinge volume |
| 3 | `leg-curl-machine` | Seated Leg Curl | Secondary | 3 | 10–12 | 60s | reps-weight | no | hamstrings | — | yes | `seated-leg-curl` | Knee-flexion hamstrings |
| 4 | `dumbbell-bulgarian-split-squat` | Dumbbell Bulgarian Split Squat | Secondary | 3 | 8–10 / side | 75s | reps-weight | yes | quadriceps | glutes | yes | `dumbbell-bulgarian-split-squat` | Controlled quad 2nd exposure |
| 5 | `hip-abduction-machine` | Seated Hip Abduction | Accessory | 3 | 12–15 | 45s | reps-weight | no | glutes | — | yes | `seated-hip-abduction-machine` | Glute med / stability |
| 6 | `seated-calf-raise-machine` | Seated Calf Raise | Accessory | 3 | 12–15 | 45s | reps-weight | no | calves | — | yes | `seated-calf-raise-machine` | Calf exposure #2 |
| 7 | `pallof-press` | Cable Pallof Press | Stability | 3 | 10–12 / side | 45s | reps-weight | yes | core | — | yes | `pallof-press` | Anti-rotation; main-day stability |

- **Main exercises:** 7  
- **Mandatory sets:** 22  
- **Estimated main duration:** 60–75 min  
- **Optional add-ons:** Core + Cardio (§8.5)

### 8.3 Week 5 — Deload (same exercises)

| Rule | Application |
| --- | --- |
| Primary Lift | `targetSets - 1` (min 1) |
| Secondary / Accessory / Stability | 2 sets |
| RIR | 3–4; lighter loads; no failure |
| Optional blocks | Still optional; shorter cardio (10 min) if added |
| Duration estimates | Lower by ~15–25% vs normal |

Approximate mandatory sets after deload: Upper A ~10, Lower A ~10, Upper B ~16, Lower B ~15.

### 8.4 Weeks 6–8 — Same structure (Option B)

Identical exercise lists and normal set counts as §8.2. Phase labels / intensity guidance only:

| Week | Phase label | RIR intent |
| --- | --- | --- |
| 6 | Block 2 — Resume | 2–3 RIR |
| 7 | Block 2 — Progression | 1–2 RIR; add reps or small load |
| 8 | Block 2 — Performance | ~2 RIR; no reckless failure |

### 8.5 Optional blocks (Friday Upper B & Sunday Lower B only)

#### Optional Core (~10 min) — choose 2–3 movements; all `optional: true`

| ID | Name | Role | Sets | Target | Meas. | Visual |
| --- | --- | --- | --- | --- | --- | --- |
| `forearm-plank` | Forearm Plank | Stability | 2 | 30–45 sec | duration | `forearm-plank` |
| `side-plank` | Side Plank | Stability | 2 | 20–40 sec / side | duration | `side-plank` |
| `dead-bug` | Dead Bug | Stability | 2 | 8–10 / side | reps-only | `dead-bug` |
| `pallof-press` | Cable Pallof Press | Stability | 2 | 8–10 / side | reps-weight | `pallof-press` |
| `cable-crunch-kneeling` | Cable Crunch | Accessory | 2 | 10–15 | reps-weight | `cable-crunch-kneeling` |

**Interaction:** “Add 10 min Core” expands a short picker (2–3 items pre-checked defaults: Plank + Dead Bug + Cable Crunch). Not required. LEM collapses section.

**Note:** Pallof appears in Lower B main **and** optional library; optional picker should **de-duplicate** if already in main (Sunday: prefer Plank / Side Plank / Crunch; Friday: full list OK).

#### Optional Cardio (~15–20 min)

| Field | Value |
| --- | --- |
| Machines | Elliptical (default) or Stationary Bike (alternate) |
| Duration | 15–20 min normal; 10 min deload |
| `optional` | **true** (always) |
| Incline walk | **Not in V3** — avoid new assets/complexity |
| UI | “Add 20 min Cardio” |

### 8.6 Volume calculations (mandatory only, normal week)

Direct sets = sum of `targetSets` for each exercise’s `primaryMuscles` (same rule as today). Optional blocks excluded.

| Muscle | Upper A | Lower A | Upper B | Lower B | **Week total** | Exposures |
| --- | --- | --- | --- | --- | --- | --- |
| Chest | 3 | 0 | 3 | 0 | **6** | 2 |
| Back | 2 | 0 | 4+3+3=10 | 0 | **12** | 2 |
| Shoulders | 3+2=5 | 0 | 3+2=5 | 0 | **10** | 2 |
| Biceps | 2 | 0 | 3 | 0 | **5** | 2 |
| Triceps | 3 | 0 | 2 | 0 | **5** | 2 |
| Quadriceps | 0 | 3+3=6 | 0 | 3 | **9** | 2 |
| Hamstrings | 0 | 2 | 0 | 3+3=6 | **8** | 2 |
| Glutes | 0 | 0* | 0 | 4+3=7 | **7** | 2† |
| Calves | 0 | 3 | 0 | 3 | **6** | 2 |
| Core | 0 | 3 | 0 | 3 | **6** | 2 mandatory (+ optional Fri/Sun → 3–4) |

\* Lower A RDL lists `hamstrings` primary / `glutes` secondary — glute touch is intentional secondary (not double-counted).  
† Glute exposures: Lower A (secondary via RDL) + Lower B primary work.

**Proposed V3 mandatory weekly targets** (replace V2 ranges in validators):

| Muscle | Target sets |
| --- | --- |
| Chest | 5–7 |
| Back | 10–13 |
| Shoulders | 8–11 |
| Biceps | 4–6 |
| Triceps | 4–6 |
| Quadriceps | 8–10 |
| Hamstrings | 7–9 |
| Glutes | 6–8 |
| Calves | 5–7 |
| Core (mandatory) | 5–7 |

**Mandatory weekly set total (all roles, count once per exercise):**  
15+14+23+22 = **74** working sets.  
**Optional weekly set total (if both Core+Cardio on both long days):** Core ~12–18 sets + cardio time (not set-counted).

### 8.7 Duration model (assumptions)

| Component | Assumption |
| --- | --- |
| Warmup | 4–5 min |
| Working set | ~30–40s |
| Rest Primary/Secondary | 75–90s |
| Rest Accessory/Stability | 45–60s |
| Transitions | ~3–5 min |

| Workout | Mandatory sets | Est. main | +Opt Core | +Opt Cardio | Honest UI range |
| --- | --- | --- | --- | --- | --- |
| Upper A | 15 | 30–40 | — | — | **30–45** |
| Lower A | 14 | 30–40 | — | — | **30–45** |
| Upper B | 23 | 60–75 | +8–12 | +15–20 | **60–75 main** |
| Lower B | 22 | 60–75 | +8–12 | +15–20 | **60–75 main** |

Do **not** advertise 70–90 as “main” if that includes optional work.

### 8.8 Movement-pattern balance

| Pattern | Coverage |
| --- | --- |
| Horizontal push | Chest Press (A), Incline Press (B) |
| Vertical/horizontal pull | Row machine, Lat PD, Cable row, CS DB row |
| Knee-dominant | Leg Press, Leg Ext, BSS |
| Hip-dominant | Hip Thrust, RDL |
| Arms | Hammer / Incline curl; Pushdown / OH extension |
| Lateral / rear shoulder | Lateral raise, Reverse pec, Face pull |
| Anti-extension / anti-rotation | Dead Bug, Pallof (+ optional plank variants) |

### 8.9 Substitutions vs current V2

| Area | Change |
| --- | --- |
| Upper A | Remove Lat PD as co-primary; push-led; keep small row; add laterals; shorten arms |
| Lower A | Drop equal RDL co-primary; add Leg Ext; RDL as 2-set touch |
| Upper B | Flip from press-primary to **row-primary**; press becomes modest touch; add face pull; drop fly as mandatory |
| Lower B | Hip Thrust primary (not Hack); remove Hack as lead; BSS as quad touch; cardio → optional |
| Block 2 | No separate catalog |
| New exercises | **None** |
| New visuals | **None** |

### 8.10 Role distribution (normal week, mandatory)

| Role | Approx. exercise slots / week |
| --- | --- |
| Primary Lift | 4 (one per day) |
| Secondary Lift | ~10 |
| Accessory | ~9 |
| Stability | 2 (Dead Bug, Pallof) |
| Optional (add-on only) | Core library + Cardio on Fri/Sun |

---

## 9. Progression model

| Week | Intent | RIR |
| --- | --- | --- |
| 1 | Establish controlled working weights | 2–3 |
| 2 | Add valid reps in range | 2–3 |
| 3 | Add reps or small load | 1–2 |
| 4 | Hardest controlled week | 1–2 |
| 5 | Deload | 3–4 |
| 6 | Resume | 2–3 |
| 7 | Progress | 1–2 |
| 8 | Performance week | ~2 |

**App surfacing (no charts):**

- On Detail / Session for **Primary Lift only**: “Last time: {weight}×{reps}” from prior log with same `exerciseId` (existing helper pattern).
- Week phase label + `intensityGuidance` under title.
- Double progression: hit top of rep range cleanly → small load increase next time (microcopy, not an engine).

---

## 10. Schedule / date behavior

### 10.1 Distinctions

| Concept | Definition |
| --- | --- |
| Workout order | 1–32 sequential slot (source of Recommended Next) |
| Preferred weekday | Tue/Wed/Fri/Sun defaults per variant |
| Planned local date | Computed only if Program Start Date set |
| Actual completion date | From `startedAt` ?? `completedAt` → local date (Nutrition link unchanged) |

### 10.2 V1 schedule product decision

**Architecturally configurable preferred weekdays; fixed in UI for V1.**  
Optional Program Start Date editable.  
Rationale: lowest friction; avoids settings sprawl; still teaches preferred rhythm via Home.

### 10.3 Planned-date calculation (when start date set)

1. Store `programStartDate` as local `YYYY-MM-DD` (first **Tuesday** aligned start recommended in UI copy; allow any date).  
2. Map order → week index + variant index.  
3. Planned date = start week’s preferred weekday for that variant, advancing week by week.  
4. Missed planned date → neutral copy; workout remains Available / Recommended Next by order.  
5. Completing early/late does not rewrite planned date on the log (snapshot planned-at-completion if known).

### 10.4 Without start date

Show preferred weekday labels only (“Tue · Push”). No planned ISO dates. Program fully usable.

---

## 11. Data & migration proposal (design only)

### 11.1 Types to add/change

```ts
// Extend / rename roles
export type ExerciseRole =
  | "primary"
  | "secondary"
  | "accessory"  // was isolation
  | "stability"  // was core
  | "cardio";

export type PreferredWeekday =
  | "monday" | "tuesday" | "wednesday" | "thursday"
  | "friday" | "saturday" | "sunday";

export type WorkoutIdentity =
  | "push" | "quad" | "pull" | "posterior";

// On Workout
preferredWeekday: PreferredWeekday; // default mapping
identity: WorkoutIdentity;
identityLabel: string; // "Push emphasis"
programVersion: "v3";

// Optional blocks as first-class fields (preferred over burying in strength[])
optionalCore?: Exercise[];   // all optional:true
// cardio already exists → set optional:true on Fri/Sun

// Schedule settings (local + cloud user_settings)
interface ProgramScheduleSettings {
  preferredWeekdays: Record<WorkoutVariant, PreferredWeekday>; // defaults
  programStartDate: string | null; // YYYY-MM-DD local
  updatedAt: string;
}

// WorkoutLog additive (schemaVersion 3 for new logs; v2 still valid)
programVersion?: "v3";
identity?: WorkoutIdentity;
preferredWeekday?: PreferredWeekday;
plannedDate?: string; // only if known at completion
actualDate?: string;  // local YYYY-MM-DD from timestamps
optionalCoreCompleted?: boolean;
mainWorkoutCompleted?: boolean;
// per-entry: role?: ExerciseRole; optional?: boolean
```

### 11.2 Program versioning

- Authored program constant `PROGRAM_VERSION = "v3"`.  
- Validators target V3 structure.  
- History never backfilled.

### 11.3 Local storage

| Key | Change |
| --- | --- |
| `workout-app:v1:logs` | Append-only; new fields on new logs only |
| Drafts `v2:active-drafts` | Keep; reconcile by exerciseId; unknown IDs ignored |
| Progress orders | Unchanged semantics |
| New: schedule inside settings | Prefer single settings object: nutrition + `schedule` |
| Cloud metadata keys | Unchanged |

**Proposal:** extend local nutrition settings storage **or** add `workout-app:program:settings:v1` mirrored into `UserSettingsPayload.schedule`. Prefer **one** `user_settings` cloud payload:

```ts
interface UserSettingsPayload {
  nutrition: NutritionSettings;
  schedule?: ProgramScheduleSettings;
  updatedAt: string;
}
```

### 11.4 Cloud sync impact

- No new tables / RLS changes.  
- `mergeSettings`: if both sides have schedule and differ → same explicit device-vs-cloud choice (or field-level: start date newer `updatedAt` wins; document one rule). Prefer **one settings conflict** covering nutrition+schedule for V1 simplicity.  
- Logs merge by ID unchanged.  
- Drafts: newer `updatedAt` wins; V3 optional section fields additive.

### 11.5 Active drafts

- Old drafts for same `workoutId` may reference removed exercise IDs → session shows main list from live program; orphan draft entries retained in JSON but not required for completion.  
- Do not auto-delete drafts on program upgrade.

### 11.6 Old progress

- Completed orders remain completed.  
- No remap of order numbers (structure still 32 = 8×4 UpperA→LowerA→UpperB→LowerB).

### 11.7 Rollback

- Keep V2 program module recoverable via git.  
- Feature-flag not required if single authored `program.ts`; rollback = revert release.  
- Local data remains valid either way.

---

## 12. Validation plan (`validate:program-identity` / extend `validate:v2`)

1. 32 workouts, 8×4 structure  
2. Variant order UpperA→LowerA→UpperB→LowerB each week  
3. Preferred weekday defaults Tue/Wed/Fri/Sun  
4. Identity push/quad/pull/posterior mapping  
5. Every exercise has exactly one role  
6. Exactly one Primary Lift per workout  
7. Workday: 5–6 main exercises; set budget ≤16; duration 30–45  
8. Off-day main: 7–8 exercises; duration 60–75 before optional  
9. Optional only on Upper B / Lower B; flagged optional; excluded from mandatory volume  
10. Week 5 deload rules  
11. Direct weekly muscle volume vs V3 targets  
12. Visual key coverage; no new missing keys  
13. Unique workout IDs / exercise instance sanity  
14. Planned-date helper unit tests (local, not UTC slice)  
15. Missed-day copy helpers neutral  
16. Recommended Next still lowest incomplete order  
17. Old History fixtures still normalize  
18. Draft with stale exercise IDs does not crash  
19. Settings payload serializes schedule round-trip  
20. Cloud merge does not drop log IDs  
21. No service-role / unrelated scope creep  

---

## 13. Implementation phases (after approval only)

| Phase | Work |
| --- | --- |
| 7B | Types + schedule helpers + settings shape (no UI polish) |
| 7C | Author `program.ts` V3 + validators + volume targets |
| 7D | Home / Detail / Session optional UX (Concept A) |
| 7E | Log builder snapshot fields + History Detail additive UI |
| 7F | Cloud settings merge for schedule |
| 7G | Docs update + acceptance |

---

## 14. Explicit out of scope

- Paid features, social, streaks, leaderboards, coach accounts  
- Charts / analytics dashboards  
- Apple/Google Health, push notifications  
- Incline-walk cardio asset  
- Full preferred-day editor UI (architecture only in V1)  
- Rewriting old History / fabricating planned dates  
- New Supabase tables / RLS / Auth changes  
- Automatic deletion of local data or drafts  
- Implementing production code in Phase 7A  

---

## 15. Unresolved decisions (need user approval)

1. **Accept Concept A** (Today’s Plan + This Week) as the UX direction?  
2. **Accept Option B** (consistent exercises weeks 1–8; deload-only structural change)?  
3. **Accept exact four-day templates** in §8 (including Hammer Curl on Push day for biceps frequency)?  
4. **Accept no new exercises / visuals**?  
5. **Fixed preferred days in UI** + optional Program Start Date in V1?  
6. **Rename roles** `isolation`→`accessory`, `core`→`stability` in types?  
7. **V3 weekly volume targets** lowered vs V2 set-count targets (frequency-first)?  
8. **Optional Core picker defaults** (which 2–3 movements pre-selected)?  
9. Proceed to implementation phase 7B+ after approval?

---

## 16. Security / sync reminder

- Local-first unchanged.  
- Cloud sync continues to merge History by ID; empty never wipes non-empty.  
- Schedule settings ride `user_settings` JSON; publishable key only; no service-role.  
- Sign-out / ownership rules unchanged.
