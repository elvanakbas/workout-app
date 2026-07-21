/**
 * Central registry of reusable visual assets for the 32-workout program.
 *
 * All 27 entries are now `"ready"` with a real local asset under
 * `public/exercise-visuals/`, produced across four batches: Batch 1 (leg
 * press, seated leg curl, hip thrust machine, chest press machine, lat
 * pulldown, chest-supported row), Batch 2 (seated cable row, dead bug,
 * cable crunch kneeling, side plank, elliptical, stationary bike, rowing
 * machine), Batch 3 (leg extension machine, cable lateral raise, seated
 * calf raise machine, cable face pull, seated hip abduction machine, bird
 * dog, forearm plank), and Batch 4 (machine ab crunch, standing cable
 * woodchopper, arm circles, glute bridge activation, band pull-aparts,
 * leg swings, cat-cow).
 *
 * Source of truth for how this list was derived: `docs/EXERCISE_VISUAL_INVENTORY.md`.
 * Asset production tracking: `docs/EXERCISE_VISUAL_ASSET_PRODUCTION.md`.
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
    displayName: "Chest Press Machine",
    filename: "chest-press-machine.webp",
    visualType: "machine",
    altText: "Person seated at a chest press machine pressing the handles forward.",
    safetyEmphasis: "shoulder",
    assetPath: "/exercise-visuals/chest-press-machine.webp",
    status: "ready"
  },
  {
    visualAssetKey: "leg-press",
    displayName: "Leg Press",
    filename: "leg-press.webp",
    visualType: "machine",
    altText: "Person seated in a leg press machine pushing the platform away with both feet.",
    safetyEmphasis: "knee",
    assetPath: "/exercise-visuals/leg-press.webp",
    status: "ready"
  },
  {
    visualAssetKey: "seated-cable-row",
    displayName: "Seated Cable Row",
    filename: "seated-cable-row.webp",
    visualType: "machine",
    altText: "Person seated at a low cable row pulling the handle toward the torso.",
    safetyEmphasis: "shoulder",
    assetPath: "/exercise-visuals/seated-cable-row.webp",
    status: "ready"
  },
  {
    visualAssetKey: "seated-leg-curl",
    displayName: "Seated Leg Curl (Machine)",
    filename: "seated-leg-curl.webp",
    visualType: "machine",
    altText: "Person seated at a leg curl machine curling the pad toward the seat.",
    safetyEmphasis: "none",
    assetPath: "/exercise-visuals/seated-leg-curl.webp",
    status: "ready"
  },
  {
    visualAssetKey: "lat-pulldown",
    displayName: "Lat Pulldown (Cable)",
    filename: "lat-pulldown.webp",
    visualType: "machine",
    altText: "Person seated at a lat pulldown pulling the bar down toward the chest.",
    safetyEmphasis: "shoulder",
    assetPath: "/exercise-visuals/lat-pulldown.webp",
    status: "ready"
  },
  {
    visualAssetKey: "hip-thrust-machine",
    displayName: "Hip Thrust Machine (Pad-Supported)",
    filename: "hip-thrust-machine.webp",
    visualType: "two-position",
    altText: "Person using a hip thrust machine shown at the bottom and top of the hip extension.",
    safetyEmphasis: "lower-back",
    assetPath: "/exercise-visuals/hip-thrust-machine.webp",
    status: "ready"
  },
  {
    visualAssetKey: "chest-supported-row",
    displayName: "Chest-Supported Row (Machine)",
    filename: "chest-supported-row.webp",
    visualType: "machine",
    altText: "Person lying chest-down on an incline pad rowing two handles back.",
    safetyEmphasis: "shoulder",
    assetPath: "/exercise-visuals/chest-supported-row.webp",
    status: "ready"
  },
  {
    visualAssetKey: "leg-extension-machine",
    displayName: "Leg Extension (Machine)",
    filename: "leg-extension-machine.webp",
    visualType: "machine",
    altText: "Person seated at a leg extension machine extending the knees against the pad.",
    safetyEmphasis: "knee",
    assetPath: "/exercise-visuals/leg-extension-machine.webp",
    status: "ready"
  },
  {
    visualAssetKey: "cable-lateral-raise",
    displayName: "Cable Lateral Raise (Light-Moderate)",
    filename: "cable-lateral-raise.webp",
    visualType: "two-position",
    altText: "Person shown with a cable handle at the hip, then raised out to shoulder height.",
    safetyEmphasis: "shoulder",
    assetPath: "/exercise-visuals/cable-lateral-raise.webp",
    status: "ready"
  },
  {
    visualAssetKey: "seated-calf-raise-machine",
    displayName: "Seated Calf Raise (Machine)",
    filename: "seated-calf-raise-machine.webp",
    visualType: "machine",
    altText: "Person seated at a calf raise machine pressing the balls of the feet upward.",
    safetyEmphasis: "none",
    assetPath: "/exercise-visuals/seated-calf-raise-machine.webp",
    status: "ready"
  },
  {
    visualAssetKey: "cable-face-pull",
    displayName: "Cable Face Pull (Light)",
    filename: "cable-face-pull.webp",
    visualType: "two-position",
    altText: "Person shown pulling a rope cable attachment toward eye level with elbows high.",
    safetyEmphasis: "shoulder",
    assetPath: "/exercise-visuals/cable-face-pull.webp",
    status: "ready"
  },
  {
    visualAssetKey: "seated-hip-abduction-machine",
    displayName: "Seated Hip Abduction Machine",
    filename: "seated-hip-abduction-machine.webp",
    visualType: "machine",
    altText: "Person seated in a hip abduction machine pressing the knees outward against the pads.",
    safetyEmphasis: "none",
    assetPath: "/exercise-visuals/seated-hip-abduction-machine.webp",
    status: "ready"
  },
  {
    visualAssetKey: "dead-bug",
    displayName: "Dead Bug",
    filename: "dead-bug.webp",
    visualType: "two-position",
    altText: "Person lying on their back shown extending one arm and the opposite leg, then returning to the start position.",
    safetyEmphasis: "lower-back",
    assetPath: "/exercise-visuals/dead-bug.webp",
    status: "ready"
  },
  {
    visualAssetKey: "cable-crunch-kneeling",
    displayName: "Cable Crunch (Kneeling)",
    filename: "cable-crunch-kneeling.webp",
    visualType: "machine",
    altText: "Person kneeling in front of a cable machine crunching down and forward against a rope attachment.",
    safetyEmphasis: "lower-back",
    assetPath: "/exercise-visuals/cable-crunch-kneeling.webp",
    status: "ready"
  },
  {
    visualAssetKey: "side-plank",
    displayName: "Side Plank",
    filename: "side-plank.webp",
    visualType: "single-position",
    altText: "Person holding a side plank propped on one forearm with the body in a straight line.",
    safetyEmphasis: "shoulder",
    assetPath: "/exercise-visuals/side-plank.webp",
    status: "ready"
  },
  {
    visualAssetKey: "bird-dog",
    displayName: "Bird Dog",
    filename: "bird-dog.webp",
    visualType: "two-position",
    altText: "Person on hands and knees shown extending one arm and the opposite leg, then returning to the start position.",
    safetyEmphasis: "lower-back",
    assetPath: "/exercise-visuals/bird-dog.webp",
    status: "ready"
  },
  {
    visualAssetKey: "standing-cable-woodchopper",
    displayName: "Standing Cable Woodchopper (Moderate Load)",
    filename: "standing-cable-woodchopper.webp",
    visualType: "two-position",
    altText: "Person shown at the start and end of a diagonal cable pull across the body.",
    safetyEmphasis: "lower-back",
    assetPath: "/exercise-visuals/standing-cable-woodchopper.webp",
    status: "ready"
  },
  {
    visualAssetKey: "machine-ab-crunch",
    displayName: "Machine Ab Crunch (Controlled)",
    filename: "machine-ab-crunch.webp",
    visualType: "machine",
    altText: "Person seated at an ab crunch machine curling forward against the pad.",
    safetyEmphasis: "lower-back",
    assetPath: "/exercise-visuals/machine-ab-crunch.webp",
    status: "ready"
  },
  {
    visualAssetKey: "forearm-plank",
    displayName: "Forearm Plank",
    filename: "forearm-plank.webp",
    visualType: "single-position",
    altText: "Person holding a forearm plank with the body in a straight line from head to heels.",
    safetyEmphasis: "lower-back",
    assetPath: "/exercise-visuals/forearm-plank.webp",
    status: "ready"
  },
  {
    visualAssetKey: "arm-circles",
    displayName: "Arm Circles",
    filename: "arm-circles.webp",
    visualType: "two-position",
    altText: "Person standing with arms extended out to the sides, shown mid-rotation.",
    safetyEmphasis: "shoulder",
    assetPath: "/exercise-visuals/arm-circles.webp",
    status: "ready"
  },
  {
    visualAssetKey: "glute-bridge-activation",
    displayName: "Glute Bridge Activation",
    filename: "glute-bridge-activation.webp",
    visualType: "two-position",
    altText: "Person lying on their back shown with hips down and hips raised in a bridge position.",
    safetyEmphasis: "lower-back",
    assetPath: "/exercise-visuals/glute-bridge-activation.webp",
    status: "ready"
  },
  {
    visualAssetKey: "band-pull-apart",
    displayName: "Band Pull-Aparts",
    filename: "band-pull-apart.webp",
    visualType: "two-position",
    altText: "Person standing shown pulling a resistance band apart at chest height.",
    safetyEmphasis: "shoulder",
    assetPath: "/exercise-visuals/band-pull-apart.webp",
    status: "ready"
  },
  {
    visualAssetKey: "leg-swings",
    displayName: "Leg Swings (Controlled, Holding Support)",
    filename: "leg-swings.webp",
    visualType: "two-position",
    altText: "Person holding onto support while swinging one leg forward and back in a controlled arc.",
    safetyEmphasis: "knee",
    assetPath: "/exercise-visuals/leg-swings.webp",
    status: "ready"
  },
  {
    visualAssetKey: "cat-cow",
    displayName: "Cat-Cow",
    filename: "cat-cow.webp",
    visualType: "two-position",
    altText: "Person on hands and knees shown rounding the spine upward, then arching it gently downward.",
    safetyEmphasis: "lower-back",
    assetPath: "/exercise-visuals/cat-cow.webp",
    status: "ready"
  },
  {
    visualAssetKey: "elliptical",
    displayName: "Elliptical",
    filename: "elliptical.webp",
    visualType: "machine",
    altText: "Person standing on an elliptical machine mid-stride.",
    safetyEmphasis: "none",
    assetPath: "/exercise-visuals/elliptical.webp",
    status: "ready"
  },
  {
    visualAssetKey: "stationary-bike",
    displayName: "Stationary Bike",
    filename: "stationary-bike.webp",
    visualType: "machine",
    altText: "Person seated on a stationary bike pedaling.",
    safetyEmphasis: "none",
    assetPath: "/exercise-visuals/stationary-bike.webp",
    status: "ready"
  },
  {
    visualAssetKey: "rowing-machine",
    displayName: "Rowing Machine",
    filename: "rowing-machine.webp",
    visualType: "machine",
    altText: "Person seated on a rowing machine mid-stroke, pulling the handle toward the torso.",
    safetyEmphasis: "lower-back-and-shoulder",
    assetPath: "/exercise-visuals/rowing-machine.webp",
    status: "ready"
  }
];

export function getVisualAsset(visualAssetKey: string): VisualAssetEntry | undefined {
  return EXERCISE_VISUALS.find((entry) => entry.visualAssetKey === visualAssetKey);
}
