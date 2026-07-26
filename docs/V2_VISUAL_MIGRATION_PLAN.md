# V2 Visual Migration Plan

Branch: `v2-rebuild`  
Phase: **3G — Final regeneration Batch 6 + obsolete cleanup — COMPLETE**  
Status: **Phase 3 complete** — all 40 active V2 visuals ready with locked character; obsolete V1 entries/files removed; full visual registry `isValid = true`

Sources inspected:

- `src/data/program.ts`
- `src/data/exerciseVisuals.ts`
- `docs/V2_PROGRAM_MIGRATION.md`
- `docs/EXERCISE_VISUAL_INVENTORY.md`
- `docs/EXERCISE_VISUAL_ASSET_PRODUCTION.md`
- `public/exercise-visuals/` (**40** WebP files — final steady state)
- `src/lib/visualAssetValidation.ts`
- `vite.config.ts` (PWA `webp` precache)
- Read-only helper: `scripts/inventory-v2-visuals.ts` (uncommitted)
- Locked character reference: `docs/visual-reference/v2-male-character-reference.webp` (not in exercise registry / not PWA-precache target)

---

## 0. Approved Phase 3 decisions

| Decision | Choice |
| --- | --- |
| Existing active assets | **Regenerate all 23** for full identity/style consistency |
| Cardio visual | Keep **Elliptical** as the only active cardio visual for now — no bike selector / no new UI |
| Obsolete registry + files | Delete only in the **final cleanup batch** |
| This sub-phase (3A) | Character reference sheet only — **complete** |
| Batch 1 (3B) | **Complete** — 6 new ready assets (no regenerations, no obsolete deletes) |
| Batch 2 (3C) | **Complete** — 6 additional new ready assets (no regenerations, no obsolete deletes) |
| Batch 3 (3D) | **Complete** — 5 final create-new assets; display-name clarification for Rear Delt Fly Machine |
| Batch 4 (3E) | **Complete** — 7 regenerations in place (chest press, lat pulldown, seated leg curl, seated calf, dead bug, forearm plank, pallof) |
| Batch 5 (3F) | **Complete** — 8 regenerations in place (leg press, hip thrust, seated cable row, chest-supported row, leg extension, hip abduction, cable crunch, side plank) |
| Batch 6 (3G) | **Complete** — final 8 regenerations + obsolete cleanup; Phase 3 visual migration finished |

### Locked male character specification

| Attribute | Spec |
| --- | --- |
| Age look | ~30–35 |
| Skin | Medium / light olive |
| Hair | Short dark-brown |
| Face | Clean-shaven or extremely light consistent stubble; neutral, approachable expression |
| Build | Athletic, realistic, moderately muscular — not bodybuilder-sized; balanced proportions |
| Shirt | Turquoise short-sleeve athletic shirt (no logos) |
| Shorts | Dark charcoal athletic shorts (no logos) |
| Shoes | White and grey training shoes (no logos) |
| Consistency | Same face, hair, skin, body proportions, and clothing in every future exercise image |

### Reference sheet artifact

| Field | Value |
| --- | --- |
| Path | `docs/visual-reference/v2-male-character-reference.webp` |
| Contents | Front, side, rear, three-quarter standing; face close-up; clothing/shoe detail |
| Labels in image | None |
| Production registry | Not added |
| PWA precache | Not included (lives under `docs/`, outside `public/`) |

Use this sheet as the identity lock for all 40 final exercise illustrations (17 new + 23 regenerations).

---

## 1. Final visual style standard (target)

Every active V2 asset must eventually match:

| Rule | Requirement |
| --- | --- |
| Character | Same male character on every asset |
| Identity | Same face, hair, body proportions, skin tone, clothing |
| Environment | Same neutral gym (simple wall + floor), not a blank void |
| Style | Flat fitness-handbook illustration |
| Format | 800×600 WebP |
| Branding | No text, logo, watermark, or brand marks |
| Form | Anatomically plausible; clear start/end where relevant |

**Implication:** under this standard, **no current on-disk asset qualifies as keep-as-is**. Existing files mix male and female characters, clothing variants, and environments (gym floor vs white void). Treat all 23 currently ready *active* keys as **regenerate for style consistency**. Treat all 17 missing keys as **create new**.

---

## 2. Counts summary

| Metric | Count |
| --- | ---: |
| Active V2 catalog exercises (strength/core unique IDs) | **32** |
| Active V2 unique `visualAssetKey`s (strength + core + warmup + cardio) | **40** |
| Registry entries today | 27 |
| WebP files on disk today | 27 |
| Reusable as-is | **0** |
| Regenerate (active + ready, style consistency) | **23** |
| New assets required (active keys missing registry/file) | **17** |
| Obsolete registry entries (not referenced by V2) | **4** |
| Obsolete files (same 4 keys; delete after registry cleanup) | **4** |
| No visual required | **0** |
| Final target registry/file count after migration | **40** |

---

## 3. Classification of every unique active V2 visual key

### 3.1 Create new (17) — missing from registry and disk

| visualAssetKey | Approx. program refs | Workday refs | Proposed visualType | Equipment |
| --- | ---: | ---: | --- | --- |
| `alternating-dumbbell-curl` | 3 | 3 | two-position | dumbbell |
| `cable-fly` | 8 | 0 | two-position | cable |
| `cable-triceps-pushdown` | 3 | 3 | two-position | cable |
| `chest-supported-dumbbell-row` | 8 | 5 | machine / two-position | dumbbell |
| `dumbbell-bulgarian-split-squat` | 8 | 0 | two-position | dumbbell |
| `dumbbell-hammer-curl` | 5 | 5 | two-position | dumbbell |
| `dumbbell-lateral-raise` | 8 | 0 | two-position | dumbbell |
| `dumbbell-romanian-deadlift` | 8 | 5 | two-position | dumbbell |
| `flat-dumbbell-press` | 3 | 3 | two-position | dumbbell |
| `hack-squat` | 8 | 3 | machine | machine |
| `incline-dumbbell-curl` | 8 | 0 | two-position | dumbbell |
| `incline-dumbbell-press` | 8 | 0 | two-position | dumbbell |
| `machine-shoulder-press` | 3 | 3 | machine | machine |
| `overhead-cable-triceps-extension` | 8 | 0 | two-position | cable |
| `reverse-pec-deck` | 8 | 0 | machine | machine |
| `rope-triceps-pushdown` | 5 | 5 | two-position | cable |
| `seated-dumbbell-shoulder-press` | 5 | 5 | two-position | dumbbell |

### 3.2 Regenerate (23) — referenced by V2, ready file exists, style inconsistent

| visualAssetKey | Refs | Workday refs | Observed character (sample) | Final action |
| --- | ---: | ---: | --- | --- |
| `elliptical` | 24 | 8 | female | regenerate |
| `lat-pulldown` | 16 | 8 | male (not locked identity) | regenerate |
| `seated-leg-curl` | 16 | 8 | (mixed batch family) | regenerate |
| `seated-calf-raise-machine` | 16 | 8 | (mixed batch family) | regenerate |
| `stationary-bike` | 16 | 8 | (mixed batch family) | regenerate |
| `arm-circles` | 16 | 8 | female | regenerate |
| `band-pull-apart` | 16 | 8 | (warmup family) | regenerate |
| `glute-bridge-activation` | 16 | 8 | female | regenerate |
| `leg-swings` | 16 | 8 | (warmup family) | regenerate |
| `leg-press` | 8 | 5 | female | regenerate |
| `hip-thrust-machine` | 8 | 3 | female | regenerate |
| `leg-extension-machine` | 8 | 3 | (mixed) | regenerate |
| `pallof-press` | 8 | 0 | male / white void | regenerate |
| `cable-face-pull` | 8 | 0 | (mixed) | regenerate |
| `cat-cow` | 8 | 0 | female | regenerate |
| `chest-press-machine` | 5 | 5 | male (not locked identity) | regenerate |
| `chest-supported-row` | 5 | 0 | (batch 1) | regenerate |
| `dead-bug` | 5 | 5 | female | regenerate |
| `forearm-plank` | 5 | 0 | male / white void | regenerate |
| `seated-cable-row` | 3 | 3 | (mixed) | regenerate |
| `side-plank` | 3 | 3 | female | regenerate |
| `cable-crunch-kneeling` | 3 | 0 | (mixed) | regenerate |
| `seated-hip-abduction-machine` | 3 | 0 | (mixed) | regenerate |

### 3.3 Obsolete registry + files (4) — not referenced by active V2

| visualAssetKey | Filename | Why obsolete in V2 |
| --- | --- | --- |
| `cable-lateral-raise` | `cable-lateral-raise.webp` | Replaced by `dumbbell-lateral-raise` |
| `bird-dog` | `bird-dog.webp` | Not in V2 templates |
| `standing-cable-woodchopper` | `standing-cable-woodchopper.webp` | Not in V2 templates |
| `rowing-machine` | `rowing-machine.webp` | Lower B cardio is elliptical **or** stationary bike; rowing unused |

`machine-ab-crunch` is already absent from both registry and disk (prior Pallof replacement). No further action.

### 3.4 Intentional ID → key remaps (not mismatches)

These exercise IDs correctly share a different `visualAssetKey`:

| Exercise ID | visualAssetKey |
| --- | --- |
| `hip-thrust-glute-bridge` | `hip-thrust-machine` |
| `leg-curl-machine` | `seated-leg-curl` |
| `hip-abduction-machine` | `seated-hip-abduction-machine` |

No filename/key typos found among registry entries. No duplicate keys or filenames.

---

## 4. Active V2 exercise inventory (32 catalog exercises)

| Exercise ID | Display name | visualAssetKey | Equipment | Measurement | Visual type (current/proposed) | Registry | File | Workouts | Asset exists | Matches final male style | Final action |
| --- | --- | --- | --- | --- | --- | --- | --- | ---: | --- | --- | --- |
| `alternating-dumbbell-curl` | Alternating Dumbbell Curl | `alternating-dumbbell-curl` | dumbbell | reps-weight | two-position (proposed) | missing | no | 3 | no | no | **create new** |
| `cable-crunch-kneeling` | Cable Crunch | `cable-crunch-kneeling` | cable | reps-weight | machine | ready | yes | 3 | yes | no | **regenerate** |
| `cable-fly` | Cable Fly | `cable-fly` | cable | reps-weight | two-position (proposed) | missing | no | 8 | no | no | **create new** |
| `cable-triceps-pushdown` | Cable Triceps Pushdown | `cable-triceps-pushdown` | cable | reps-weight | two-position (proposed) | missing | no | 3 | no | no | **create new** |
| `chest-press-machine` | Machine Chest Press | `chest-press-machine` | machine | reps-weight | machine | ready | yes | 5 | yes | partial male only | **regenerate** |
| `chest-supported-dumbbell-row` | Chest-Supported Dumbbell Row | `chest-supported-dumbbell-row` | dumbbell | reps-weight | two-position (proposed) | missing | no | 8 | no | no | **create new** |
| `chest-supported-row` | Chest-Supported Row Machine | `chest-supported-row` | machine | reps-weight | machine | ready | yes | 5 | yes | no | **regenerate** |
| `dead-bug` | Dead Bug | `dead-bug` | bodyweight | reps-only | two-position | ready | yes | 5 | yes | female | **regenerate** |
| `dumbbell-bulgarian-split-squat` | Dumbbell Bulgarian Split Squat | `dumbbell-bulgarian-split-squat` | dumbbell | reps-weight | two-position (proposed) | missing | no | 8 | no | no | **create new** |
| `dumbbell-hammer-curl` | Dumbbell Hammer Curl | `dumbbell-hammer-curl` | dumbbell | reps-weight | two-position (proposed) | missing | no | 5 | no | no | **create new** |
| `dumbbell-lateral-raise` | Dumbbell Lateral Raise | `dumbbell-lateral-raise` | dumbbell | reps-weight | two-position (proposed) | missing | no | 8 | no | no | **create new** |
| `dumbbell-romanian-deadlift` | Dumbbell Romanian Deadlift | `dumbbell-romanian-deadlift` | dumbbell | reps-weight | two-position (proposed) | missing | no | 8 | no | no | **create new** |
| `flat-dumbbell-press` | Flat Dumbbell Press | `flat-dumbbell-press` | dumbbell | reps-weight | two-position (proposed) | missing | no | 3 | no | no | **create new** |
| `forearm-plank` | Forearm Plank | `forearm-plank` | bodyweight | duration | single-position | ready | yes | 5 | yes | partial male only | **regenerate** |
| `hack-squat` | Hack Squat | `hack-squat` | machine | reps-weight | machine (proposed) | missing | no | 8 | no | no | **create new** |
| `hip-abduction-machine` | Seated Hip Abduction Machine | `seated-hip-abduction-machine` | machine | reps-weight | machine | ready | yes | 3 | yes | no | **regenerate** |
| `hip-thrust-glute-bridge` | Hip Thrust | `hip-thrust-machine` | machine | reps-weight | two-position | ready | yes | 8 | yes | female | **regenerate** |
| `incline-dumbbell-curl` | Incline Dumbbell Curl | `incline-dumbbell-curl` | dumbbell | reps-weight | two-position (proposed) | missing | no | 8 | no | no | **create new** |
| `incline-dumbbell-press` | Incline Dumbbell Press | `incline-dumbbell-press` | dumbbell | reps-weight | two-position (proposed) | missing | no | 8 | no | no | **create new** |
| `lat-pulldown` | Neutral-Grip Lat Pulldown | `lat-pulldown` | cable | reps-weight | machine | ready | yes | 16 | yes | partial male only | **regenerate** |
| `leg-curl-machine` | Seated Leg Curl | `seated-leg-curl` | machine | reps-weight | machine | ready | yes | 16 | yes | no | **regenerate** |
| `leg-extension-machine` | Leg Extension | `leg-extension-machine` | machine | reps-weight | machine | ready | yes | 8 | yes | no | **regenerate** |
| `leg-press` | Leg Press | `leg-press` | machine | reps-weight | machine | ready | yes | 8 | yes | female | **regenerate** |
| `machine-shoulder-press` | Machine Shoulder Press | `machine-shoulder-press` | machine | reps-weight | machine (proposed) | missing | no | 3 | no | no | **create new** |
| `overhead-cable-triceps-extension` | Overhead Cable Triceps Extension | `overhead-cable-triceps-extension` | cable | reps-weight | two-position (proposed) | missing | no | 8 | no | no | **create new** |
| `pallof-press` | Cable Pallof Press | `pallof-press` | cable | reps-weight | two-position | ready | yes | 8 | yes | partial male only | **regenerate** |
| `reverse-pec-deck` | Reverse Pec Deck | `reverse-pec-deck` | machine | reps-weight | machine (proposed) | missing | no | 8 | no | no | **create new** |
| `rope-triceps-pushdown` | Rope Triceps Pushdown | `rope-triceps-pushdown` | cable | reps-weight | two-position (proposed) | missing | no | 5 | no | no | **create new** |
| `seated-cable-row` | Seated Cable Row | `seated-cable-row` | cable | reps-weight | machine | ready | yes | 3 | yes | no | **regenerate** |
| `seated-calf-raise-machine` | Seated Calf Raise | `seated-calf-raise-machine` | machine | reps-weight | machine | ready | yes | 16 | yes | no | **regenerate** |
| `seated-dumbbell-shoulder-press` | Seated Dumbbell Shoulder Press | `seated-dumbbell-shoulder-press` | dumbbell | reps-weight | two-position (proposed) | missing | no | 5 | no | no | **create new** |
| `side-plank` | Side Plank | `side-plank` | bodyweight | duration | single-position | ready | yes | 3 | yes | female | **regenerate** |

### Warm-up / cardio keys (also in the active 40)

| visualAssetKey | Role | Refs | File today | Final action |
| --- | --- | ---: | --- | --- |
| `arm-circles` | Upper warm-up | 16 | yes | regenerate |
| `band-pull-apart` | Upper warm-up | 16 | yes | regenerate |
| `cable-face-pull` | Upper B warm-up | 8 | yes | regenerate |
| `cat-cow` | Lower B warm-up | 8 | yes | regenerate |
| `elliptical` | Lower warm-up + Lower B cardio | 24 | yes | regenerate |
| `glute-bridge-activation` | Lower warm-up | 16 | yes | regenerate |
| `leg-swings` | Lower warm-up | 16 | yes | regenerate |
| `stationary-bike` | Upper warm-up (+ cardio alternate) | 16 | yes | regenerate |

Note: Lower B cardio is authored with `visualAssetKey: "elliptical"` even when `alternateMachine` is stationary bike. UI can still show the elliptical asset; bike remains needed for Upper warm-ups.

---

## 5. Finding checklist

| Finding | Result |
| --- | --- |
| Active V2 keys missing from registry | **17** (see §3.1) |
| Active V2 keys missing asset file | **17** (same set; none of the 23 ready active keys lack files) |
| Registry entries no longer referenced by V2 | **4** (see §3.3) |
| WebP files no longer referenced (after obsolete registry removal) | **4** (same filenames) |
| Orphan files today (on disk but not in registry) | **0** |
| File/registry naming mismatches | **0** among current registry |
| Duplicate keys / filenames | **0** |
| Inconsistent male/female character style | **Yes — widespread** (sampled female: leg-press, dead-bug, side-plank, hip-thrust, elliptical, arm-circles, glute-bridge, cat-cow; sampled male but not locked identity: chest-press, lat-pulldown, forearm-plank, pallof) |

---

## 6. Assets to keep / regenerate / create / obsolete

### Keep as-is
**None** under the locked male-character standard.

### Regenerate (23)
All keys in §3.2.

### Create new (17)
All keys in §3.1. Add matching registry entries (`status: "planned"` → `"ready"` when file lands) with `filename` / `assetPath` `/exercise-visuals/<key>.webp`.

### Obsolete registry entries (4)
`cable-lateral-raise`, `bird-dog`, `standing-cable-woodchopper`, `rowing-machine`.

### Obsolete files (4)
Same four `.webp` files — delete only after registry cleanup and after confirming no historical docs alone require them.

---

## 7. Final target count

| After full migration | Count |
| --- | ---: |
| Active visual keys with registry + file | 40 |
| Registry size | 40 |
| Files under `public/exercise-visuals/` | 40 |
| Obsolete retained | 0 |

Net production work: **17 creates + 23 regenerations = 40 illustration jobs**.

---

## 8. Proposed batch plan (5–7 assets each)

Priority order: Workday visibility → high ref count → new dumbbells → inconsistent style.

### Batch 1 — New Workday-critical missing (6) — **produced**

| Key | Filename | Dimensions | File size | Visual type | Technique emphasis | Status | Character consistency |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `chest-supported-dumbbell-row` | `chest-supported-dumbbell-row.webp` | 800×600 | ~40 KB | two-position | Chest on incline pad; pull to lower ribs; elbows controlled; no shrug; start + finish | ready | Pass — matches locked face, hair, stubble, olive skin, turquoise shirt, charcoal shorts, white-grey shoes |
| `seated-dumbbell-shoulder-press` | `seated-dumbbell-shoulder-press.webp` | 800×600 | ~26 KB | two-position | Back supported; DBs from shoulder height; neutral wrists; controlled overhead; no excessive lumbar arch | ready | Pass — same locked identity/clothing |
| `dumbbell-hammer-curl` | `dumbbell-hammer-curl.webp` | 800×600 | ~22 KB | two-position | Neutral grip; elbows close; no torso swing; lowered + curled | ready | Pass — same locked identity/clothing |
| `rope-triceps-pushdown` | `rope-triceps-pushdown.webp` | 800×600 | ~27 KB | two-position | Cable rope; elbows fixed; neutral spine; rope separates at bottom; no momentum | ready | Pass — same locked identity/clothing |
| `dumbbell-romanian-deadlift` | `dumbbell-romanian-deadlift.webp` | 800×600 | ~24 KB | two-position | Hip hinge; soft knees; DBs close to legs; neutral spine; standing + hamstring-loaded bottom | ready | Pass — same locked identity/clothing |
| `hack-squat` | `hack-squat.webp` | 800×600 | ~44 KB | two-position | Back/shoulders supported; feet secure; knees track toes; controlled depth; no lockout; top + lowered | ready | Pass — same locked identity/clothing |

Reference used: `docs/visual-reference/v2-male-character-reference.webp`  
Registry: 6 entries appended to `src/data/exerciseVisuals.ts` as `status: "ready"` with `assetPath`.

### Batch 2 — New high-frequency Off Day / Block 2 missing (6) — **produced**

| Key | Filename | Dimensions | File size | Visual type | Technique emphasis | Status | Character consistency |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `incline-dumbbell-press` | `incline-dumbbell-press.webp` | 800×600 | ~32 KB | two-position | Moderate incline; upper back/hips supported; neutral wrists; controlled bottom; elbows not flared; bottom + pressed | ready | Pass — matches locked identity and Batch 1 style |
| `cable-fly` | `cable-fly.webp` | 800×600 | ~35 KB | two-position | Stable stance; soft elbows; controlled arc; shoulders down; no excessive lean; open + closed | ready | Pass — same locked identity/clothing |
| `dumbbell-lateral-raise` | `dumbbell-lateral-raise.webp` | 800×600 | ~22 KB | two-position | Light DBs; slight elbow bend; raise to ~shoulder height; no shrug/swing; lowered + raised | ready | Pass — same locked identity/clothing |
| `reverse-pec-deck` | `reverse-pec-deck.webp` | 800×600 | ~41 KB | two-position | Chest on pad; neutral neck; controlled rear-delt open; shoulders down; forward + open | ready | Pass — same locked identity/clothing |
| `incline-dumbbell-curl` | `incline-dumbbell-curl.webp` | 800×600 | ~36 KB | two-position | Incline seat; upper arms fixed beside/behind torso; full elbow ROM; no shoulder swing; lowered + curled | ready | Pass — same locked identity/clothing |
| `overhead-cable-triceps-extension` | `overhead-cable-triceps-extension.webp` | 800×600 | ~20 KB | two-position | Overhead cable setup; elbows fixed; neutral spine; no excessive lumbar arch; flexed + extended | ready | Pass — same locked identity/clothing |

Reference used: `docs/visual-reference/v2-male-character-reference.webp` (+ Batch 1 style)  
Registry: 6 entries appended to `src/data/exerciseVisuals.ts` as `status: "ready"` with `assetPath`.

**Revised remaining counts after Batch 2:**

| Metric | Count |
| --- | ---: |
| Active V2 visual keys | 40 |
| Ready registry entries covering active keys | 29 (was 23 after Batch 1) |
| Remaining missing active V2 keys (Batch 3) | **5** |
| Obsolete unreferenced registry entries | 4 |
| WebP files on disk | 39 (27 prior + 12 new; obsolete files still present) |

### Batch 3 — Remaining new keys (5) — **produced**

| Key | Filename | Dimensions | File size | Visual type | Technique emphasis | Status | Character consistency |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `dumbbell-bulgarian-split-squat` | `dumbbell-bulgarian-split-squat.webp` | 800×600 | ~24 KB | two-position | Rear foot on bench; front foot forward; knee tracks toes; controlled rear-knee lower; top + lowered; per-side clear | ready | Pass — matches locked identity and Batches 1–2 style |
| `flat-dumbbell-press` | `flat-dumbbell-press.webp` | 800×600 | ~27 KB | two-position | Flat bench; head/back/hips supported; feet planted; neutral wrists; elbows not flared; bottom + pressed | ready | Pass — same locked identity/clothing |
| `machine-shoulder-press` | `machine-shoulder-press.webp` | 800×600 | ~44 KB | two-position | Back supported; handles at shoulder height; neutral wrists; no excessive arch; soft elbows (no lockout); start + finish | ready | Pass — same locked identity/clothing |
| `alternating-dumbbell-curl` | `alternating-dumbbell-curl.webp` | 800×600 | ~23 KB | two-position | One arm curls while other stays lowered; elbows near torso; no torso swing; alternating intent clear | ready | Pass — same locked identity/clothing |
| `cable-triceps-pushdown` | `cable-triceps-pushdown.webp` | 800×600 | ~28 KB | two-position | Straight/short bar (not rope); elbows fixed; neutral spine; no momentum; upper + extended; distinct from rope asset | ready | Pass — same locked identity/clothing |

Reference used: `docs/visual-reference/v2-male-character-reference.webp` (+ Batches 1–2 style)  
Registry: 5 entries appended to `src/data/exerciseVisuals.ts` as `status: "ready"` with `assetPath`.

### Naming clarification — Rear Delt Fly Machine

| Field | Value |
| --- | --- |
| Active exercise display name | **Rear Delt Fly Machine** (was “Reverse Pec Deck”) |
| Exercise ID | `reverse-pec-deck` (unchanged) |
| `visualAssetKey` | `reverse-pec-deck` (unchanged) |
| Filename / asset path | `reverse-pec-deck.webp` / `/exercise-visuals/reverse-pec-deck.webp` (unchanged) |
| Registry | `displayName` + `altText` updated; volume/sets/reps/muscles/role unchanged |

### Final create-new counts after Batch 3

| Metric | Count |
| --- | ---: |
| Active V2 visual keys | 40 |
| Ready registry entries covering active keys | **40** |
| Remaining missing active V2 keys | **0** |
| Obsolete unreferenced registry entries | 4 |
| WebP files on disk | 44 (27 prior + 17 new; obsolete files still present) |
| Remaining work | **23 regenerations** + final obsolete cleanup |

### Batch 4 — Regenerate selected active assets (7) — **produced**

Executed set (user Phase 3E order; keys/filenames unchanged, files replaced in place):

| Key | Filename | Old size | New size | Dimensions | Technique emphasis | Status | Character consistency |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `chest-press-machine` | `chest-press-machine.webp` | 23,652 B | 39,992 B | 800×600 | Back supported; handles at chest; neutral wrists; elbows not flared; start + finish | ready (regen) | Pass — locked identity |
| `lat-pulldown` | `lat-pulldown.webp` | 19,334 B | 28,592 B | 800×600 | Neutral-grip attachment; thighs secured; pull to upper chest; shoulders down; arms-up + pulled | ready (regen) | Pass — locked identity |
| `seated-leg-curl` | `seated-leg-curl.webp` | 33,398 B | 34,984 B | 800×600 | Knees at pivot; thighs secured; controlled flexion; no hip lift; extended + curled | ready (regen) | Pass — locked identity |
| `seated-calf-raise-machine` | `seated-calf-raise-machine.webp` | 20,786 B | 31,912 B | 800×600 | Balls of feet on platform; controlled heel lower/raise; no bounce; bottom + top | ready (regen) | Pass — locked identity |
| `dead-bug` | `dead-bug.webp` | 11,182 B | 14,514 B | 800×600 | Supine; low back controlled; opposite arm/leg extend; per-side; not bird dog | ready (regen) | Pass — locked identity |
| `forearm-plank` | `forearm-plank.webp` | 13,946 B | 15,424 B | 800×600 | Forearms down; elbows under shoulders; head-to-heels line; neutral neck; single hold | ready (regen) | Pass — locked identity |
| `pallof-press` | `pallof-press.webp` | 27,438 B | 25,196 B | 800×600 | Side-on to cable; chest hold then press forward; resist rotation; hips/shoulders square | ready (regen) | Pass — locked identity |

Registry metadata updated only for display names / alt text / visualType alignment (keys, filenames, asset paths unchanged).

**Revised remaining work after Batch 4:** **16 regenerations** + final obsolete cleanup (4 unreferenced entries).

### Batch 5 — Regenerate next high-frequency assets (8) — **produced**

| Key | Filename | Old size | New size | Dimensions | Technique emphasis | Status | Character consistency |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `leg-press` | `leg-press.webp` | 30,418 B | 40,964 B | 800×600 | Back/hips supported; knees track toes; controlled depth; no pelvis lift; no lockout; lowered + pressed | ready (regen) | Pass — locked identity |
| `hip-thrust-machine` | `hip-thrust-machine.webp` | 18,850 B | 32,414 B | 800×600 | Upper back supported; pad across hips; feet planted; neutral chin; full hip extension without excessive arch | ready (regen) | Pass — locked identity |
| `seated-cable-row` | `seated-cable-row.webp` | 26,128 B | 27,660 B | 800×600 | Seated cable; neutral spine; pull to lower ribs; no swing; extended + rowed; distinct from chest-supported | ready (regen) | Pass — locked identity |
| `chest-supported-row` | `chest-supported-row.webp` | 25,602 B | 37,446 B | 800×600 | Chest on pad; neutral neck; controlled machine path; no shrug; start + finish | ready (regen) | Pass — locked identity |
| `leg-extension-machine` | `leg-extension-machine.webp` | 42,376 B | 42,270 B | 800×600 | Knees at pivot; back supported; controlled extension; no kick; soft finish; bent + extended | ready (regen) | Pass — locked identity |
| `seated-hip-abduction-machine` | `seated-hip-abduction-machine.webp` | 40,712 B | 34,018 B | 800×600 | Upright back support; closed to open; pelvis stable; no bounce | ready (regen) | Pass — locked identity |
| `cable-crunch-kneeling` | `cable-crunch-kneeling.webp` | 23,808 B | 29,202 B | 800×600 | Kneeling; rope near head; trunk flexion; hips stable (not hip hinge); upright + flexed | ready (regen) | Pass — locked identity |
| `side-plank` | `side-plank.webp` | 15,348 B | 21,624 B | 800×600 | Forearm under shoulder; straight body line; hips lifted; neutral neck; single hold | ready (regen) | Pass — locked identity |

Registry metadata updated only for display names / alt text / visualType (keys, filenames, asset paths unchanged).

**Revised remaining work after Batch 5:** **8 regenerations** + final obsolete cleanup.

Remaining regenerate keys: `elliptical`, `stationary-bike`, `arm-circles`, `band-pull-apart`, `glute-bridge-activation`, `leg-swings`, `cable-face-pull`, `cat-cow`.

### Batch 6 — Final regenerations (8) — **produced**

| Key | Filename | Old size | New size | Dimensions | Technique emphasis | Status | Character consistency |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `elliptical` | `elliptical.webp` | 22,670 B | 39,644 B | 800×600 | Upright; hands on handles; feet on pedals; coordinated stride; no excessive hunch | ready (regen) | Pass — locked identity |
| `stationary-bike` | `stationary-bike.webp` | 22,510 B | 17,402 B | 800×600 | Correct seat/pedal relationship; neutral spine; relaxed shoulders; secure feet | ready (regen) | Pass — locked identity |
| `arm-circles` | `arm-circles.webp` | 18,546 B | 20,170 B | 800×600 | Arms ~shoulder height; controlled circular motion implied; no shrug; no text arrows | ready (regen) | Pass — locked identity |
| `band-pull-apart` | `band-pull-apart.webp` | 23,128 B | 19,298 B | 800×600 | Band at chest height; soft elbows; shoulders down; start + pulled-apart | ready (regen) | Pass — locked identity |
| `glute-bridge-activation` | `glute-bridge-activation.webp` | 12,694 B | 16,664 B | 800×600 | Supine; knees bent; ribs controlled; hips lift via glutes; floor + top | ready (regen) | Pass — locked identity |
| `leg-swings` | `leg-swings.webp` | 20,142 B | 25,242 B | 800×600 | Support hand if needed; controlled front/back; upright torso; per-side clear | ready (regen) | Pass — locked identity |
| `cable-face-pull` | `cable-face-pull.webp` | 26,050 B | 26,372 B | 800×600 | Rope at face height; pull to upper face; elbows high; shoulders down; extended + pulled | ready (regen) | Pass — locked identity |
| `cat-cow` | `cat-cow.webp` | 14,700 B | 17,732 B | 800×600 | Quadruped; hands under shoulders; knees under hips; cat flexion + cow extension (not bird dog) | ready (regen) | Pass — locked identity |

### Obsolete cleanup (3G) — **complete**

Confirmed zero active V2 refs before deletion, then removed:

| Key | Filename | Action |
| --- | --- | --- |
| `cable-lateral-raise` | `cable-lateral-raise.webp` | Registry entry + WebP deleted |
| `bird-dog` | `bird-dog.webp` | Registry entry + WebP deleted |
| `standing-cable-woodchopper` | `standing-cable-woodchopper.webp` | Registry entry + WebP deleted |
| `rowing-machine` | `rowing-machine.webp` | Registry entry + WebP deleted |

### Phase 3 final counts

| Metric | Count |
| --- | ---: |
| Active V2 visual keys | **40** |
| Active ready assets | **40** |
| Final registry entries | **40** |
| WebP files on disk | **40** |
| Obsolete unreferenced registry entries | **0** |
| Obsolete WebP files | **0** |
| Remaining regenerations | **0** |
| Full visual registry `isValid` | **true** |

**Character lock:** Approved — `docs/visual-reference/v2-male-character-reference.webp` used for all production batches.

**Phase 3 status:** Visual migration production work is complete. Remaining only an explicit commit when requested (do not auto-commit).

---

## 9. Cleanup order

1. Produce/approve character reference sheet.  
2. Run Batches 1–3 (fill missing keys; add registry stubs then ready files).  
3. Run Batches 4–7 regenerations (overwrite existing filenames in place).  
4. Remove 4 obsolete registry entries.  
5. Delete 4 obsolete WebP files.  
6. Re-run visual validation + `validate:v2` + build (confirm precache size).  
7. Update `docs/EXERCISE_VISUAL_ASSET_PRODUCTION.md` progress tables.

Do **not** delete obsolete files before regenerations finish — they are harmless and keep historical comparison available.

---

## 10. Validation strategy

| Check | How |
| --- | --- |
| Every active key in registry | Extend / run `validateVisualAssets` — `unknownKeyReferences` must be empty |
| Every ready entry has a file | Script check: `assetPath` basename exists under `public/exercise-visuals/` |
| No unreferenced registry keys | `unreferencedRegistryKeys` empty after cleanup |
| No duplicate keys/filenames/paths | Existing duplicate detectors |
| Dimensions | Spot-check / sharp script: all 800×600 |
| Program unchanged | `npm run validate:v2` (volumes/structure) |
| App still builds | `npm run typecheck` + `npm run build` |
| UI fallback | Missing/planned keys still show “Visual coming soon” on detail; no broken `<img>` |

Suggested future command (not added this phase beyond the inventory helper):

```bash
npx tsx scripts/inventory-v2-visuals.ts
```

---

## 11. PWA precache impact

`vite.config.ts` already includes `webp` in Workbox `globPatterns`.

| Stage | Approx. WebP files precached | Impact |
| --- | --- | --- |
| Pre–Batch 1 | 27 | Baseline |
| After Batch 1 | 27 + 6 = **33** | Prior |
| After Batch 2 | 27 + 12 = **39** | Prior |
| After Batch 3 (pre-delete peak) | 27 + 17 = **44** | Temporary peak with obsolete files |
| After Batch 6 + cleanup | **40** | **Final steady state** |

Expect a modest increase in install/update payload (~13 net new files vs today). No config change required unless later excluding obsolete patterns during the temporary peak.

---

## 12. Ambiguities — resolved for production start

| Topic | Resolution |
| --- | --- |
| Regenerate vs keep current male assets | Regenerate all 23 |
| Cardio bike selector | Not now; elliptical remains the cardio visual |
| Obsolete cleanup timing | Final cleanup batch only |
| Character identity | Locked via `docs/visual-reference/v2-male-character-reference.webp` |

Optional later (not blocking Batch 1): whether Lower B should ever show a stationary-bike visual when the alternate machine is chosen — deferred; no UI change.

---

## 13. Remaining out of scope after Phase 3 production

- Explicit **commit / push / merge / deploy** (until instructed)
- Optional historical doc polish in older inventory files (may still mention obsolete names as deleted history)
- Helper script `scripts/inventory-v2-visuals.ts` remains uncommitted until instructed

Phase 3 visual asset production + registry cleanup is complete.
