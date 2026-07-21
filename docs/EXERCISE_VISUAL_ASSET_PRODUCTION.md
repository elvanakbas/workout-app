# Exercise Visual Asset Production

Tracks exactly which of the 27 registry entries in
[`src/data/exerciseVisuals.ts`](../src/data/exerciseVisuals.ts) have a real,
local image file under `public/exercise-visuals/`, and which are still
`"planned"`. Updated whenever a new batch of assets is produced.

**Note:** an earlier Batch 2 proposal referenced five exercise keys
(`incline-chest-press-machine`, `reverse-pec-deck`, `pec-deck`,
`rope-triceps-pushdown`, `dumbbell-hammer-curl`) that do not exist in the
registry or the 32-workout program. That proposal was stopped before any
files were created. The Batch 2 below uses only valid, existing `"planned"`
registry keys.

All real assets were generated as original illustrations (not photos, not
third-party/copyrighted material), then resized and re-encoded locally to
WebP. No remote URLs are used anywhere - every `assetPath` is a local path
served from this app's own `public/` folder.

## Batch 1 (this phase) - 6 assets, status: ready

| Filename | Visual Asset Key | Visual Type | Required Position(s) | Safety Emphasis | Dimensions | File Size | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `leg-press.webp` | `leg-press` | machine | Seated/reclined, knees bent ~90°, feet on platform | knee | 800x600 | ~30 KB | ready |
| `seated-leg-curl.webp` | `seated-leg-curl` | machine | Seated, legs extended (start) through curled (end) | none | 800x600 | ~33 KB | ready |
| `hip-thrust-machine.webp` | `hip-thrust-machine` | two-position | Bottom (hips down, knees bent) + top (hips extended, glutes squeezed) | lower-back | 800x600 | ~18 KB | ready |
| `chest-press-machine.webp` | `chest-press-machine` | machine | Seated, handles at chest height pressed to near-full extension | shoulder | 800x600 | ~23 KB | ready |
| `lat-pulldown.webp` | `lat-pulldown` | machine | Seated, bar pulled down **in front of** the face to the upper chest (not behind the neck) | shoulder | 800x600 | ~19 KB | ready |
| `chest-supported-row.webp` | `chest-supported-row` | machine | Prone/incline, chest on pad, handles rowed back to the torso | shoulder | 800x600 | ~25 KB | ready |

All 6 files:
- Live at `public/exercise-visuals/<filename>` and are referenced via
  `assetPath: "/exercise-visuals/<filename>"` in the registry.
- Are exactly 800x600 px (4:3), WebP format, quality ~78.
- Are well under 50 KB each (see exact sizes above; sizes are approximate
  because WebP compression is content-dependent and may shift by a few
  bytes on regeneration).
- Follow one consistent style: flat, clean-line fitness-handbook
  illustration, neutral uncluttered gym background, no text/logos/brand
  names, anatomically plausible posture, muted athletic clothing.
- Were produced with an AI image generation tool, then locally resized
  from their original output size down to 800x600 and re-encoded to WebP
  (quality 78) using a temporary local `sharp` install (not a persisted
  project dependency - `package.json`/`package-lock.json` are unchanged).

### Note on the lat pulldown asset

The first generated draft showed the bar pulled down behind the neck. That
technique is generally discouraged for shoulder health, and would have
visually contradicted this exercise's own safety note ("avoid letting the
shoulders shrug at the top"). It was regenerated to show the bar pulled
down in front of the face instead, which is the safer, more standard cue.

## Batch 2 (this phase) - 7 assets, status: ready

Same production method as Batch 1: original AI-generated illustrations,
resized/re-encoded locally to 800x600 WebP via a temporary local `sharp`
install (not a persisted dependency).

| Filename | Visual Asset Key | Visual Type | Required Position(s) | Safety Emphasis | Dimensions | File Size | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `seated-cable-row.webp` | `seated-cable-row` | machine | Seated, upright spine, handle pulled to the lower ribs, elbows close to the body | shoulder | 800x600 | ~26 KB | ready |
| `dead-bug.webp` | `dead-bug` | two-position | Tabletop start + opposite-arm/opposite-leg extended, low back gently supported against the floor | lower-back | 800x600 | ~11 KB | ready |
| `cable-crunch-kneeling.webp` | `cable-crunch-kneeling` | machine | Stable kneeling, rope near the sides of the head, controlled trunk flexion, hips still | lower-back | 800x600 | ~23 KB | ready |
| `side-plank.webp` | `side-plank` | single-position | Forearm side plank, straight line head-to-feet, shoulder stacked over elbow, hips lifted | shoulder | 800x600 | ~15 KB | ready |
| `elliptical.webp` | `elliptical` | machine | Upright posture, light grip on handles, feet fully supported on pedals mid-stride | none | 800x600 | ~22 KB | ready |
| `stationary-bike.webp` | `stationary-bike` | machine | Seated, slight knee bend at bottom of stroke, neutral spine, relaxed shoulders | none | 800x600 | ~22 KB | ready |
| `rowing-machine.webp` | `rowing-machine` | machine | Catch (knees bent, arms extended) + finish (legs extended, handle at lower ribs, no excessive lean) | lower-back-and-shoulder | 800x600 | ~21 KB | ready |

All 7 files:
- Live at `public/exercise-visuals/<filename>` and are referenced via
  `assetPath: "/exercise-visuals/<filename>"` in the registry.
- Are exactly 800x600 px (4:3), WebP format, quality 78.
- Are well under 30 KB each.
- Follow the same style as Batch 1: flat, clean-line fitness-handbook
  illustration, neutral uncluttered gym background, no text/logos/brand
  names, anatomically plausible posture, muted athletic clothing.

## Batch 3 (this phase) - 7 assets, status: ready

Same production method as Batches 1 and 2: original AI-generated
illustrations, resized/re-encoded locally to 800x600 WebP via a temporary
local `sharp` install (not a persisted dependency).

| Filename | Visual Asset Key | Visual Type | Required Position(s) | Safety Emphasis | Dimensions | File Size | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `leg-extension-machine.webp` | `leg-extension-machine` | machine | Seated, back supported, pad above the ankle, controlled extension without a hard knee lockout | knee | 800x600 | ~41 KB | ready |
| `cable-lateral-raise.webp` | `cable-lateral-raise` | two-position | Start (handle at hip) + raised (arm out to shoulder height, slight elbow bend, no shrugging) | shoulder | 800x600 | ~29 KB | ready |
| `seated-calf-raise-machine.webp` | `seated-calf-raise-machine` | machine | Feet supported, pads over the lower thighs, controlled heel raise/lower | none | 800x600 | ~20 KB | ready |
| `cable-face-pull.webp` | `cable-face-pull` | two-position | Start (arms forward) + finish (rope to face/upper chest, elbows elevated but shoulder-friendly, upright torso) | shoulder | 800x600 | ~25 KB | ready |
| `seated-hip-abduction-machine.webp` | `seated-hip-abduction-machine` | machine | Back supported, neutral spine, knees pressing outward under control | none | 800x600 | ~40 KB | ready |
| `bird-dog.webp` | `bird-dog` | two-position | Start (hands under shoulders, knees under hips) + extended opposite-arm/opposite-leg, hips level | lower-back | 800x600 | ~12 KB | ready |
| `forearm-plank.webp` | `forearm-plank` | single-position | Standard full forearm plank, elbows under shoulders, straight line head to heels | lower-back | 800x600 | ~14 KB | ready |

All 7 files:
- Live at `public/exercise-visuals/<filename>` and are referenced via
  `assetPath: "/exercise-visuals/<filename>"` in the registry.
- Are exactly 800x600 px (4:3), WebP format, quality 78.
- Follow the same style as Batches 1 and 2: flat, clean-line
  fitness-handbook illustration, neutral uncluttered gym background, no
  text/logos/brand names, anatomically plausible posture, muted athletic
  clothing.

## Batch 4 (this phase) - 7 assets, status: ready

Same production method as Batches 1-3: original AI-generated
illustrations, resized/re-encoded locally to 800x600 WebP via a temporary
local `sharp` install (not a persisted dependency). This batch completes
the full 27-asset registry.

| Filename | Visual Asset Key | Visual Type | Required Position(s) | Safety Emphasis | Dimensions | File Size | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `machine-ab-crunch.webp` | `machine-ab-crunch` | machine | Seated, back/hips supported, controlled trunk flexion, no arm-pulling or bouncing | lower-back | 800x600 | ~44 KB | ready |
| `standing-cable-woodchopper.webp` | `standing-cable-woodchopper` | two-position | Start (handle high to one side) + finish (pulled diagonally to opposite hip), stable stance, controlled rotation | lower-back | 800x600 | ~28 KB | ready |
| `arm-circles.webp` | `arm-circles` | two-position | Arms at shoulder height, small controlled circular-motion arrows, no shrugging | shoulder | 800x600 | ~18 KB | ready |
| `glute-bridge-activation.webp` | `glute-bridge-activation` | two-position | Bottom (hips down) + top (hips lifted via glute squeeze, no lower-back arch) | lower-back | 800x600 | ~12 KB | ready |
| `band-pull-apart.webp` | `band-pull-apart` | two-position | Start (arms forward, band slack) + finish (arms pulled apart at chest height, shoulders down) | shoulder | 800x600 | ~23 KB | ready |
| `leg-swings.webp` | `leg-swings` | two-position | Forward + backward controlled swing, one hand on support, stable pelvis | knee | 800x600 | ~20 KB | ready |
| `cat-cow.webp` | `cat-cow` | two-position | Cat (spine rounded up) + cow (spine gently arched down), neutral head-spine relationship | lower-back | 800x600 | ~14 KB | ready |

All 7 files:
- Live at `public/exercise-visuals/<filename>` and are referenced via
  `assetPath: "/exercise-visuals/<filename>"` in the registry.
- Are exactly 800x600 px (4:3), WebP format, quality 78.
- Follow the same style as Batches 1-3: flat, clean-line
  fitness-handbook illustration, neutral uncluttered gym/exercise
  background, no text/logos/brand names, anatomically plausible posture,
  muted athletic clothing. `machine-ab-crunch` and
  `standing-cable-woodchopper` use a small directional arrow between the
  two positions (not text/lettering) to indicate motion, consistent with
  common fitness-handbook conventions.

## Progress

**27 total registry entries - 27 ready, 0 planned.** All batches
complete: 6 from Batch 1 + 7 from Batch 2 + 7 from Batch 3 + 7 from
Batch 4.

## UI Integration Status

- `src/components/ExerciseVisual.tsx` - reusable component, looks up
  `visualAssetKey` in the registry and renders:
  - the real `<img>` when `status: "ready"`,
  - a compact "Visual coming soon" placeholder in the `"detail"` variant
    when still `"planned"` (never a broken image),
  - nothing at all in the `"session"` variant when still `"planned"`
    (keeps the fast logging screen uncluttered until there's something to
    show).
- Wired into `WorkoutDetailScreen` (warm-up, strength, core, cardio) and
  `ActiveSessionScreen` (strength/core exercises and cardio, as a
  collapsible "Show visual" toggle).
- Not rendered on the Home screen, so no images load until a user opens a
  specific workout or session.
- Images use `loading="lazy"`, explicit `width`/`height` (800x600) plus a
  CSS `aspect-ratio: 4 / 3` to prevent layout shift, and the registry's
  `altText` for accessibility.
- The app remains fully usable with zero images: nothing about starting,
  logging, or completing a workout depends on a visual being present.

## Manual Browser Review Still Needed

All four phases were verified with `npm run typecheck` and `npm run
build` only (no dev server / browser check was performed as part of any
pass). Now that all 27 registry entries are `"ready"`, the "Visual coming
soon" placeholder path in `ExerciseVisual.tsx` (`variant="detail"`, no
ready asset) is no longer reachable by any movement in the current
32-workout program - it remains in the component as a safety fallback in
case a future movement is added without an asset, but manual review can
now focus entirely on real images. Before considering this work fully
done, a manual check in a mobile-width browser is recommended for:

- `WorkoutDetailScreen` on a full rotation of all 4 weekly templates
  (e.g. workouts 1-4 cover Workday A, Off Day A, Workday B, and Off Day B
  - together these touch every one of the 27 ready exercises at least
  once), to confirm every image renders crisply and doesn't shift layout
  while loading.
- `ActiveSessionScreen` on the same 4 workouts, to confirm the "Show
  visual"/"Hide visual" toggle works for all 27 ready assets and the
  expanded image doesn't crowd the set-logging inputs.
- The two-position images with a directional arrow (`machine-ab-crunch`,
  `standing-cable-woodchopper`) at phone width, to confirm the arrow
  reads clearly as a motion cue rather than clutter.
- Overall dark-theme contrast and touch-target size for the toggle
  button.
