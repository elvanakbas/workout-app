# V3 Program Identity — Implementation Notes

**Branch:** `phase-7-program-identity`  
**Program version:** `v3-program-identity`  
**Status:** Phase 7C fixes applied locally — not committed until requested.

## Final four templates (normal weeks)

| Day | Identity | Exercises | Mandatory sets | Main duration | Primary Lift |
| --- | --- | ---: | ---: | --- | --- |
| Tue Upper A | Push | 6 | 16 | ~40–50 min | Machine Chest Press |
| Wed Lower A | Quad | 5 | 15 | ~40–55 min | Leg Press |
| Fri Upper B | Pull | 7 | 21 | ~70–90 min | Chest-Supported Row Machine |
| Sun Lower B | Posterior | 7 | 21 | ~75–95 min | Hip Thrust |

Optional add-ons (Fri/Sun only) sit **outside** main duration: Core ~+10 min, Cardio ~+15–20 min (combined wall-clock often +25–35 min).

### Upper A — Push (mandatory)

1. Machine Chest Press — Primary — 4×8–12  
2. Seated DB Shoulder Press — Secondary — 3×8–12  
3. Rope Triceps Pushdown — Accessory — 3×10–12  
4. DB Lateral Raise — Accessory — 2×12–15  
5. CS Dumbbell Row — Secondary — 2×10–12 (balance)  
6. DB Hammer Curl — Accessory — 2×10–12 (end-of-session biceps touch)

### Lower A — Quad (mandatory)

1. Leg Press — Primary — 4×10–12  
2. Leg Extension — Secondary — 4×12–15  
3. Seated Calf Raise — Accessory — 3×12–15  
4. DB RDL — Secondary — 2×8–12 (hamstring touch; glutes secondary only)  
5. Dead Bug — Stability — 2×8–12/side

### Upper B — Pull (mandatory)

1. CS Row Machine — Primary — 4×8–10  
2. Neutral-Grip Lat Pulldown — Secondary — 3×8–12  
3. Seated Cable Row — Secondary — 3×10–12  
4. Rear Delt Fly Machine — Accessory — 3×12–15  
5. Incline DB Curl — Accessory — 3×10–12  
6. Incline DB Press — Secondary — 3×8–10 (modest chest exposure)  
7. Overhead Cable Triceps — Accessory — 2×10–12  

**Face-pull removed** from the mandatory Upper B list (stays in catalog/visuals only) to keep Off-Day main duration honest while prioritizing pull volume.

**Chest weekly total = 7** (A4 + B3). Intentional accepted trade-off vs aspirational 8: keep Off-Day main realistic while second chest exposure remains 3 hard incline sets.

### Lower B — Posterior (mandatory)

1. Hip Thrust — Primary — 4×8–12  
2. DB RDL — Secondary — 3×8–10  
3. Seated Leg Curl — Secondary — 3×10–12  
4. DB Bulgarian Split Squat — Secondary — 2×8–10/side (quad touch)  
5. Hip Abduction — Accessory — 4×12–15  
6. Seated Calf Raise — Accessory — 3×12–15  
7. Pallof Press — Stability — 2×10–12/side  

### Optional add-ons (Fri / Sun)

| Day | Core defaults (2 sets each) | Cardio |
| --- | --- | --- |
| Friday | Dead Bug, Pallof Press | Elliptical / Bike 15–20 min (10 deload) |
| Sunday | Forearm Plank, Side Plank | Same |

Collapsed by default: **Add 10 min Core** / **Add 20 min Cardio**.

## Direct weekly volume (mandatory)

| Muscle | Sets |
| --- | ---: |
| Chest | 7 |
| Back | 12 |
| Shoulders | 8 |
| Biceps | 5 |
| Triceps | 5 |
| Quads | 10 |
| Hamstrings | 8 |
| Glutes | 8 |
| Calves | 6 |
| Core | 4 |

Optional core (if both long days added): +8 direct core sets / week (reported separately).

## Duration assumptions

- Warm-up 4–5 min  
- Primary/Secondary rest 75–90s; Accessory/Stability 45–60s  
- Unilateral side changes and machine transitions included in estimates  
- Long-day metadata is **main only**; optionals outside that range  

## Deload (week 5)

Implemented rule (`deloadSets`):

- Primary: `round(sets × 0.6)`, min 1  
- Other roles: `round(sets × 0.55)`, min 1  

Weekly mandatory reduction is ~42.5% (within 35–45%). **Per-day rounding may slightly exceed the 45% band** (e.g. Lower A ~46.7%) while the weekly total stays in target. Primary Lift never drops below 1 set.

## Role display mapping

Stored roles unchanged: `primary` / `secondary` / `isolation` / `core` / `cardio`.  
UI: Primary Lift / Secondary Lift / Accessory / Stability / Cardio.  
`optional: true` for add-ons.

## Schedule + Home (Concept A)

- Preferred days fixed: Tue / Wed / Fri / Sun  
- Start date = Week 1 Upper A date (Workout 1)  
- Offsets: 0 / 1 / 3 / 5 + 7×(week−1)  
- **Today** context (preferred identity / “No preferred session”) is independent of **Next recommended** (lowest incomplete order)  
- Storage: `workout-app:program:settings:v1` + cloud `user_settings.schedule`  
- Nutrition links via actual local date only (`startedAt` ?? `completedAt`) — never `plannedDateKey`

## Migration + sync (Phase 7C)

- Workout IDs `w1`…`w32` preserved → progress maps naturally  
- Drafts: match by exercise ID; removed IDs → `legacyEntries`; material V3 migration bumps `updatedAt` once; merge prefers V3 program rank over pre-V3 LWW  
- History: schemaVersion 3 additive fields survive normalize + sync; old logs never rewritten as V3  
- Settings: nutrition choice uses empty-start-safe schedule merge independently

## Validation

`npm run validate:v3-program` (includes Phase 7C round-trip / merge / Today context checks) plus existing validators.

## Known limitations

- Full preferred-day editor not in V3 UI  
- Chest at 7 vs aspirational 8 (documented intentional)  
- Two-browser cloud acceptance requires live Supabase secrets  
- Manual browser matrix still required after Phase 7C  

## Rollback

Revert `program.ts` / types / UI on this branch; local History and Nutrition remain valid.
