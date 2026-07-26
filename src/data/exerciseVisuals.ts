/**
 * Central registry of reusable visual assets for the active V2 program.
 *
 * Final Phase 3 state: **40** ready entries under `public/exercise-visuals/`,
 * matching all 40 active V2 visualAssetKeys. Obsolete V1-only keys removed in
 * Phase 3G cleanup. Display-name note: `reverse-pec-deck` shows as
 * "Rear Delt Fly Machine".
 *
 * Source of truth for how this list was derived: `docs/EXERCISE_VISUAL_INVENTORY.md`.
 * V2 migration tracking: `docs/V2_VISUAL_MIGRATION_PLAN.md`.
 */

/** How the eventual asset should depict the movement. */
export type VisualType = "two-position" | "single-position" | "machine" | "none";

/** Injury-prevention emphasis the artwork/caption should reflect, if any. */
export type SafetyEmphasis = "none" | "lower-back" | "knee" | "shoulder" | "lower-back-and-shoulder";

export interface VisualAssetEntry {
  /** Stable key referenced from `Exercise.visualAssetKey` / `WarmupItem.visualAssetKey` / `CardioBlock.visualAssetKey`. */
  visualAssetKey: string;
  /** Final, unambiguous display name this asset represents. */
  displayName: string;
  /** Recommended asset filename (relative to the future image asset folder). */
  filename: string;
  visualType: VisualType;
  /** Short, descriptive alt text for accessibility once the image is added. */
  altText: string;
  safetyEmphasis: SafetyEmphasis;
  /**
   * Public, local path to the real asset file, e.g. "/exercise-visuals/leg-press.webp".
   * Only set once a real file exists under `public/exercise-visuals/` - never a remote URL.
   * Required when `status` is `"ready"`; omitted while `status` is `"planned"`.
   */
  assetPath?: string;
  /** "planned" = no image produced yet. "ready" = a real local asset exists at `assetPath`. */
  status: "planned" | "ready";
}

export const EXERCISE_VISUALS: VisualAssetEntry[] = [
  {
    visualAssetKey: "chest-press-machine",
    displayName: "Machine Chest Press",
    filename: "chest-press-machine.webp",
    visualType: "two-position",
    altText:
      "Person seated at a chest press machine with back supported, shown pressing the handles from chest level to a controlled finish.",
    safetyEmphasis: "shoulder",
    assetPath: "/exercise-visuals/chest-press-machine.webp",
    status: "ready"
  },
  {
    visualAssetKey: "leg-press",
    displayName: "Leg Press",
    filename: "leg-press.webp",
    visualType: "two-position",
    altText:
      "Person seated in a leg press machine with back and hips supported, shown at a controlled lowered depth and a soft-knee pressed finish.",
    safetyEmphasis: "knee",
    assetPath: "/exercise-visuals/leg-press.webp",
    status: "ready"
  },
  {
    visualAssetKey: "seated-cable-row",
    displayName: "Seated Cable Row",
    filename: "seated-cable-row.webp",
    visualType: "two-position",
    altText:
      "Person seated at a low cable row with a neutral spine, shown from arms extended to a pull toward the lower ribs without torso swing.",
    safetyEmphasis: "shoulder",
    assetPath: "/exercise-visuals/seated-cable-row.webp",
    status: "ready"
  },
  {
    visualAssetKey: "seated-leg-curl",
    displayName: "Seated Leg Curl",
    filename: "seated-leg-curl.webp",
    visualType: "two-position",
    altText:
      "Person seated at a leg curl machine with thighs secured, shown from an extended start to a controlled curled finish.",
    safetyEmphasis: "none",
    assetPath: "/exercise-visuals/seated-leg-curl.webp",
    status: "ready"
  },
  {
    visualAssetKey: "lat-pulldown",
    displayName: "Neutral-Grip Lat Pulldown",
    filename: "lat-pulldown.webp",
    visualType: "two-position",
    altText:
      "Person seated at a lat pulldown with a neutral-grip attachment and thighs secured, shown from arms up to a pull toward the upper chest.",
    safetyEmphasis: "shoulder",
    assetPath: "/exercise-visuals/lat-pulldown.webp",
    status: "ready"
  },
  {
    visualAssetKey: "hip-thrust-machine",
    displayName: "Hip Thrust Machine",
    filename: "hip-thrust-machine.webp",
    visualType: "two-position",
    altText:
      "Person using a hip thrust machine with upper back supported and a pad across the hips, shown at the lowered and fully extended top positions.",
    safetyEmphasis: "lower-back",
    assetPath: "/exercise-visuals/hip-thrust-machine.webp",
    status: "ready"
  },
  {
    visualAssetKey: "chest-supported-row",
    displayName: "Chest-Supported Row Machine",
    filename: "chest-supported-row.webp",
    visualType: "two-position",
    altText:
      "Person with chest supported on a machine pad rowing the handles from an extended start to a controlled finish, shoulders down.",
    safetyEmphasis: "shoulder",
    assetPath: "/exercise-visuals/chest-supported-row.webp",
    status: "ready"
  },
  {
    visualAssetKey: "leg-extension-machine",
    displayName: "Leg Extension",
    filename: "leg-extension-machine.webp",
    visualType: "two-position",
    altText:
      "Person seated at a leg extension machine with back supported, shown from a bent-knee start to a controlled soft-knee extension.",
    safetyEmphasis: "knee",
    assetPath: "/exercise-visuals/leg-extension-machine.webp",
    status: "ready"
  },
  {
    visualAssetKey: "seated-calf-raise-machine",
    displayName: "Seated Calf Raise",
    filename: "seated-calf-raise-machine.webp",
    visualType: "two-position",
    altText:
      "Person seated at a calf raise machine with the balls of the feet supported, shown from a lowered heel stretch to a raised finish.",
    safetyEmphasis: "none",
    assetPath: "/exercise-visuals/seated-calf-raise-machine.webp",
    status: "ready"
  },
  {
    visualAssetKey: "cable-face-pull",
    displayName: "Cable Face Pull",
    filename: "cable-face-pull.webp",
    visualType: "two-position",
    altText:
      "Person at a cable stack pulling a rope toward the upper face with elbows high and controlled, shown from an extended start to the finish.",
    safetyEmphasis: "shoulder",
    assetPath: "/exercise-visuals/cable-face-pull.webp",
    status: "ready"
  },
  {
    visualAssetKey: "seated-hip-abduction-machine",
    displayName: "Seated Hip Abduction Machine",
    filename: "seated-hip-abduction-machine.webp",
    visualType: "two-position",
    altText:
      "Person seated upright in a hip abduction machine with back supported, shown from a closed start to a controlled open finish.",
    safetyEmphasis: "none",
    assetPath: "/exercise-visuals/seated-hip-abduction-machine.webp",
    status: "ready"
  },
  {
    visualAssetKey: "dead-bug",
    displayName: "Dead Bug",
    filename: "dead-bug.webp",
    visualType: "two-position",
    altText:
      "Person lying on their back in a dead-bug start, then extending one arm and the opposite leg while keeping the lower back controlled.",
    safetyEmphasis: "lower-back",
    assetPath: "/exercise-visuals/dead-bug.webp",
    status: "ready"
  },
  {
    visualAssetKey: "cable-crunch-kneeling",
    displayName: "Cable Crunch",
    filename: "cable-crunch-kneeling.webp",
    visualType: "two-position",
    altText:
      "Person kneeling at a cable with a rope near the head, shown from an upright start to a trunk-flexed crunch with stable hips.",
    safetyEmphasis: "lower-back",
    assetPath: "/exercise-visuals/cable-crunch-kneeling.webp",
    status: "ready"
  },
  {
    visualAssetKey: "side-plank",
    displayName: "Side Plank",
    filename: "side-plank.webp",
    visualType: "single-position",
    altText:
      "Person holding a side plank on one forearm with the body in a straight line, hips lifted, and a neutral head position.",
    safetyEmphasis: "shoulder",
    assetPath: "/exercise-visuals/side-plank.webp",
    status: "ready"
  },
  {
    visualAssetKey: "pallof-press",
    displayName: "Cable Pallof Press",
    filename: "pallof-press.webp",
    visualType: "two-position",
    altText:
      "Person standing side-on to a cable, holding the handle at the chest then pressing it straight forward while resisting torso rotation.",
    safetyEmphasis: "lower-back",
    assetPath: "/exercise-visuals/pallof-press.webp",
    status: "ready"
  },
  {
    visualAssetKey: "forearm-plank",
    displayName: "Forearm Plank",
    filename: "forearm-plank.webp",
    visualType: "single-position",
    altText:
      "Person holding a forearm plank with elbows under the shoulders and a straight line from head to heels, neutral neck.",
    safetyEmphasis: "lower-back",
    assetPath: "/exercise-visuals/forearm-plank.webp",
    status: "ready"
  },
  {
    visualAssetKey: "arm-circles",
    displayName: "Arm Circles",
    filename: "arm-circles.webp",
    visualType: "two-position",
    altText:
      "Person standing upright with arms at approximately shoulder height, shown in two mid-rotation positions of controlled arm circles.",
    safetyEmphasis: "shoulder",
    assetPath: "/exercise-visuals/arm-circles.webp",
    status: "ready"
  },
  {
    visualAssetKey: "glute-bridge-activation",
    displayName: "Glute Bridge Activation",
    filename: "glute-bridge-activation.webp",
    visualType: "two-position",
    altText:
      "Person lying on their back with knees bent, shown with hips on the floor and then lifted through the glutes without excessive lumbar arch.",
    safetyEmphasis: "lower-back",
    assetPath: "/exercise-visuals/glute-bridge-activation.webp",
    status: "ready"
  },
  {
    visualAssetKey: "band-pull-apart",
    displayName: "Band Pull-Apart",
    filename: "band-pull-apart.webp",
    visualType: "two-position",
    altText:
      "Person standing pulling a resistance band apart at chest height from a closer start to an open finish, shoulders down.",
    safetyEmphasis: "shoulder",
    assetPath: "/exercise-visuals/band-pull-apart.webp",
    status: "ready"
  },
  {
    visualAssetKey: "leg-swings",
    displayName: "Leg Swings",
    filename: "leg-swings.webp",
    visualType: "two-position",
    altText:
      "Person holding support while swinging one leg forward and back in a controlled arc, shown as clear per-side execution.",
    safetyEmphasis: "knee",
    assetPath: "/exercise-visuals/leg-swings.webp",
    status: "ready"
  },
  {
    visualAssetKey: "cat-cow",
    displayName: "Cat-Cow",
    filename: "cat-cow.webp",
    visualType: "two-position",
    altText:
      "Person on hands and knees shown in spinal flexion (cat) and gentle spinal extension (cow), knees under hips and hands under shoulders.",
    safetyEmphasis: "lower-back",
    assetPath: "/exercise-visuals/cat-cow.webp",
    status: "ready"
  },
  {
    visualAssetKey: "elliptical",
    displayName: "Elliptical",
    filename: "elliptical.webp",
    visualType: "machine",
    altText:
      "Person upright on an elliptical machine mid-stride with hands on the handles and feet secured on the pedals.",
    safetyEmphasis: "none",
    assetPath: "/exercise-visuals/elliptical.webp",
    status: "ready"
  },
  {
    visualAssetKey: "stationary-bike",
    displayName: "Stationary Bike",
    filename: "stationary-bike.webp",
    visualType: "machine",
    altText:
      "Person seated on a stationary bike with a neutral spine and feet secured on the pedals in a cycling position.",
    safetyEmphasis: "none",
    assetPath: "/exercise-visuals/stationary-bike.webp",
    status: "ready"
  },
  {
    visualAssetKey: "chest-supported-dumbbell-row",
    displayName: "Chest-Supported Dumbbell Row",
    filename: "chest-supported-dumbbell-row.webp",
    visualType: "two-position",
    altText:
      "Person lying chest-down on an incline bench rowing dumbbells from a hanging start to the lower ribs, elbows controlled.",
    safetyEmphasis: "shoulder",
    assetPath: "/exercise-visuals/chest-supported-dumbbell-row.webp",
    status: "ready"
  },
  {
    visualAssetKey: "seated-dumbbell-shoulder-press",
    displayName: "Seated Dumbbell Shoulder Press",
    filename: "seated-dumbbell-shoulder-press.webp",
    visualType: "two-position",
    altText:
      "Person seated with back supported pressing dumbbells from shoulder height to a controlled overhead finish.",
    safetyEmphasis: "shoulder",
    assetPath: "/exercise-visuals/seated-dumbbell-shoulder-press.webp",
    status: "ready"
  },
  {
    visualAssetKey: "dumbbell-hammer-curl",
    displayName: "Dumbbell Hammer Curl",
    filename: "dumbbell-hammer-curl.webp",
    visualType: "two-position",
    altText:
      "Person standing curling dumbbells with a neutral hammer grip, elbows close to the torso, from lowered to curled.",
    safetyEmphasis: "none",
    assetPath: "/exercise-visuals/dumbbell-hammer-curl.webp",
    status: "ready"
  },
  {
    visualAssetKey: "rope-triceps-pushdown",
    displayName: "Rope Triceps Pushdown",
    filename: "rope-triceps-pushdown.webp",
    visualType: "two-position",
    altText:
      "Person at a cable machine pushing a rope attachment from near the upper chest to a separated bottom finish, elbows fixed.",
    safetyEmphasis: "none",
    assetPath: "/exercise-visuals/rope-triceps-pushdown.webp",
    status: "ready"
  },
  {
    visualAssetKey: "dumbbell-romanian-deadlift",
    displayName: "Dumbbell Romanian Deadlift",
    filename: "dumbbell-romanian-deadlift.webp",
    visualType: "two-position",
    altText:
      "Person hinging at the hips with dumbbells close to the legs, soft knees and a neutral spine, from standing to a hamstring-loaded bottom.",
    safetyEmphasis: "lower-back",
    assetPath: "/exercise-visuals/dumbbell-romanian-deadlift.webp",
    status: "ready"
  },
  {
    visualAssetKey: "hack-squat",
    displayName: "Hack Squat",
    filename: "hack-squat.webp",
    visualType: "two-position",
    altText:
      "Person in a hack squat machine with back and shoulders supported, shown at a soft-knee top and a controlled lowered depth.",
    safetyEmphasis: "knee",
    assetPath: "/exercise-visuals/hack-squat.webp",
    status: "ready"
  },
  {
    visualAssetKey: "incline-dumbbell-press",
    displayName: "Incline Dumbbell Press",
    filename: "incline-dumbbell-press.webp",
    visualType: "two-position",
    altText:
      "Person on a moderate incline bench pressing dumbbells from a controlled bottom at the upper chest to an extended finish, wrists neutral.",
    safetyEmphasis: "shoulder",
    assetPath: "/exercise-visuals/incline-dumbbell-press.webp",
    status: "ready"
  },
  {
    visualAssetKey: "cable-fly",
    displayName: "Cable Fly",
    filename: "cable-fly.webp",
    visualType: "two-position",
    altText:
      "Person standing between cable stacks performing a fly from an open-arm start to handles meeting in front of the chest, soft elbows.",
    safetyEmphasis: "shoulder",
    assetPath: "/exercise-visuals/cable-fly.webp",
    status: "ready"
  },
  {
    visualAssetKey: "dumbbell-lateral-raise",
    displayName: "Dumbbell Lateral Raise",
    filename: "dumbbell-lateral-raise.webp",
    visualType: "two-position",
    altText:
      "Person standing raising light dumbbells from the sides to approximately shoulder height with a slight elbow bend and no shrug.",
    safetyEmphasis: "shoulder",
    assetPath: "/exercise-visuals/dumbbell-lateral-raise.webp",
    status: "ready"
  },
  {
    visualAssetKey: "reverse-pec-deck",
    displayName: "Rear Delt Fly Machine",
    filename: "reverse-pec-deck.webp",
    visualType: "two-position",
    altText:
      "Person seated on a rear delt fly machine with chest on the pad, moving from arms forward to an open rear-delt finish, shoulders down.",
    safetyEmphasis: "shoulder",
    assetPath: "/exercise-visuals/reverse-pec-deck.webp",
    status: "ready"
  },
  {
    visualAssetKey: "incline-dumbbell-curl",
    displayName: "Incline Dumbbell Curl",
    filename: "incline-dumbbell-curl.webp",
    visualType: "two-position",
    altText:
      "Person seated on an incline bench curling dumbbells from a lowered stretch to a controlled top, upper arms fixed beside the torso.",
    safetyEmphasis: "none",
    assetPath: "/exercise-visuals/incline-dumbbell-curl.webp",
    status: "ready"
  },
  {
    visualAssetKey: "overhead-cable-triceps-extension",
    displayName: "Overhead Cable Triceps Extension",
    filename: "overhead-cable-triceps-extension.webp",
    visualType: "two-position",
    altText:
      "Person at a cable stack extending the triceps overhead from a flexed elbow start to an extended finish, neutral spine, elbows fixed.",
    safetyEmphasis: "shoulder",
    assetPath: "/exercise-visuals/overhead-cable-triceps-extension.webp",
    status: "ready"
  },
  {
    visualAssetKey: "dumbbell-bulgarian-split-squat",
    displayName: "Dumbbell Bulgarian Split Squat",
    filename: "dumbbell-bulgarian-split-squat.webp",
    visualType: "two-position",
    altText:
      "Person performing a per-side Bulgarian split squat with the rear foot on a bench, shown at the top and a controlled lowered position.",
    safetyEmphasis: "knee",
    assetPath: "/exercise-visuals/dumbbell-bulgarian-split-squat.webp",
    status: "ready"
  },
  {
    visualAssetKey: "flat-dumbbell-press",
    displayName: "Flat Dumbbell Press",
    filename: "flat-dumbbell-press.webp",
    visualType: "two-position",
    altText:
      "Person lying on a flat bench pressing dumbbells from a controlled bottom at the chest to an extended finish, wrists neutral.",
    safetyEmphasis: "shoulder",
    assetPath: "/exercise-visuals/flat-dumbbell-press.webp",
    status: "ready"
  },
  {
    visualAssetKey: "machine-shoulder-press",
    displayName: "Machine Shoulder Press",
    filename: "machine-shoulder-press.webp",
    visualType: "two-position",
    altText:
      "Person seated on a shoulder press machine with back supported, pressing handles from shoulder height to a soft-elbow overhead finish.",
    safetyEmphasis: "shoulder",
    assetPath: "/exercise-visuals/machine-shoulder-press.webp",
    status: "ready"
  },
  {
    visualAssetKey: "alternating-dumbbell-curl",
    displayName: "Alternating Dumbbell Curl",
    filename: "alternating-dumbbell-curl.webp",
    visualType: "two-position",
    altText:
      "Person standing curling one dumbbell at a time while the other arm stays lowered, elbows near the torso, no torso swing.",
    safetyEmphasis: "none",
    assetPath: "/exercise-visuals/alternating-dumbbell-curl.webp",
    status: "ready"
  },
  {
    visualAssetKey: "cable-triceps-pushdown",
    displayName: "Cable Triceps Pushdown",
    filename: "cable-triceps-pushdown.webp",
    visualType: "two-position",
    altText:
      "Person at a cable stack using a straight bar attachment, pushing from an upper elbow-bent start to a fully extended finish, elbows fixed.",
    safetyEmphasis: "none",
    assetPath: "/exercise-visuals/cable-triceps-pushdown.webp",
    status: "ready"
  }
];

export function getVisualAsset(visualAssetKey: string): VisualAssetEntry | undefined {
  return EXERCISE_VISUALS.find((entry) => entry.visualAssetKey === visualAssetKey);
}
