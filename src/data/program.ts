import {
  PROGRAM_LENGTH,
  type CardioBlock,
  type EquipmentCategory,
  type Exercise,
  type ExerciseRole,
  type FocusArea,
  type MeasurementType,
  type MuscleGroup,
  type ProgramSlot,
  type SessionLength,
  type WarmupItem,
  type Workout,
  type WorkoutVariant
} from "../types";

/**
 * V2 Upper/Lower 8-week / 32-workout program.
 *
 * Weekly cycle: Upper A (Workday) → Lower A (Workday) → Upper B (Off Day) → Lower B (Off Day).
 * Weeks 1–4: Block 1. Week 5: Block 1 deload. Weeks 6–8: Block 2.
 *
 * Exercise `id`s are stable. Retained V1 IDs keep historical weight lookup working
 * where the movement is the same; new dumbbell/machine variants get new IDs.
 */

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

interface CatalogEntry {
  id: string;
  name: string;
  measurementType: MeasurementType;
  role: ExerciseRole;
  equipmentCategory: EquipmentCategory;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles?: MuscleGroup[];
  unilateral?: boolean;
  targetUnitLabel?: string;
  safetyNote?: string;
  notes?: string;
  visualAssetKey?: string;
}

const EX: Record<string, CatalogEntry> = {
  // --- Retained IDs (same movement family as V1) ---
  chestPressMachine: {
    id: "chest-press-machine",
    name: "Machine Chest Press",
    measurementType: "reps-weight",
    role: "primary",
    equipmentCategory: "machine",
    primaryMuscles: ["chest"],
    secondaryMuscles: ["shoulders", "triceps"],
    safetyNote: "Shoulder-sensitive: keep shoulder blades back and down; don't drop elbows below shoulder height.",
    visualAssetKey: "chest-press-machine"
  },
  latPulldown: {
    id: "lat-pulldown",
    name: "Neutral-Grip Lat Pulldown",
    measurementType: "reps-weight",
    role: "primary",
    equipmentCategory: "cable",
    primaryMuscles: ["back"],
    secondaryMuscles: ["biceps"],
    notes: "Use a neutral (parallel) grip handle when available.",
    safetyNote: "Shoulder-sensitive: control the negative and avoid letting the shoulders shrug at the top.",
    visualAssetKey: "lat-pulldown"
  },
  chestSupportedRow: {
    id: "chest-supported-row",
    name: "Chest-Supported Row Machine",
    measurementType: "reps-weight",
    role: "primary",
    equipmentCategory: "machine",
    primaryMuscles: ["back"],
    secondaryMuscles: ["biceps"],
    safetyNote: "Shoulder-sensitive: keep the chest on the pad and avoid jerking the weight.",
    visualAssetKey: "chest-supported-row"
  },
  legPress: {
    id: "leg-press",
    name: "Leg Press",
    measurementType: "reps-weight",
    role: "primary",
    equipmentCategory: "machine",
    primaryMuscles: ["quadriceps"],
    secondaryMuscles: ["glutes"],
    safetyNote: "Knee-sensitive: use a moderate range of motion and avoid locking the knees out hard at the top.",
    visualAssetKey: "leg-press"
  },
  seatedLegCurl: {
    id: "leg-curl-machine",
    name: "Seated Leg Curl",
    measurementType: "reps-weight",
    role: "secondary",
    equipmentCategory: "machine",
    primaryMuscles: ["hamstrings"],
    notes: "If a seated leg curl isn't available, a lying leg curl works the same muscles.",
    visualAssetKey: "seated-leg-curl"
  },
  seatedCalfRaise: {
    id: "seated-calf-raise-machine",
    name: "Seated Calf Raise",
    measurementType: "reps-weight",
    role: "isolation",
    equipmentCategory: "machine",
    primaryMuscles: ["calves"],
    visualAssetKey: "seated-calf-raise-machine"
  },
  deadBug: {
    id: "dead-bug",
    name: "Dead Bug",
    measurementType: "reps-only",
    role: "core",
    equipmentCategory: "bodyweight",
    primaryMuscles: ["core"],
    unilateral: true,
    targetUnitLabel: "per side",
    safetyNote: "Lower-back-sensitive: keep the low back gently pressed down throughout and move slowly.",
    visualAssetKey: "dead-bug"
  },
  hipThrust: {
    id: "hip-thrust-glute-bridge",
    name: "Hip Thrust",
    measurementType: "reps-weight",
    role: "primary",
    equipmentCategory: "machine",
    primaryMuscles: ["glutes"],
    secondaryMuscles: ["hamstrings"],
    notes: "Prefer a hip thrust machine or pad-supported setup. Keep ribs down.",
    safetyNote: "Lower-back-sensitive: keep ribs down and avoid overarching the lower back at the top.",
    visualAssetKey: "hip-thrust-machine"
  },
  legExtension: {
    id: "leg-extension-machine",
    name: "Leg Extension",
    measurementType: "reps-weight",
    role: "isolation",
    equipmentCategory: "machine",
    primaryMuscles: ["quadriceps"],
    safetyNote: "Knee-sensitive: avoid a hard, heavy lockout at the top of the movement.",
    visualAssetKey: "leg-extension-machine"
  },
  pallofPress: {
    id: "pallof-press",
    name: "Cable Pallof Press",
    measurementType: "reps-weight",
    role: "core",
    equipmentCategory: "cable",
    primaryMuscles: ["core"],
    unilateral: true,
    targetUnitLabel: "per side",
    notes: "Anti-rotation core stability. Cable at chest height; press straight forward and resist rotation.",
    safetyNote:
      "Lower-back-sensitive: stand side-on, keep ribs stacked over the pelvis, and press without rotating. Stop if it causes back or radiating leg pain.",
    visualAssetKey: "pallof-press"
  },
  forearmPlank: {
    id: "forearm-plank",
    name: "Forearm Plank",
    measurementType: "duration",
    role: "core",
    equipmentCategory: "bodyweight",
    primaryMuscles: ["core"],
    notes: "Beginner modification: lower the knees while keeping the torso straight.",
    safetyNote: "Lower-back-sensitive: keep a neutral spine; don't let the hips sag or pike up.",
    visualAssetKey: "forearm-plank"
  },
  sidePlank: {
    id: "side-plank",
    name: "Side Plank",
    measurementType: "duration",
    role: "core",
    equipmentCategory: "bodyweight",
    primaryMuscles: ["core"],
    unilateral: true,
    targetUnitLabel: "per side",
    notes: "Hold each side as its own set, or split the target time evenly across sides.",
    safetyNote: "Shoulder-sensitive: stack the shoulders and don't sink into the supporting shoulder.",
    visualAssetKey: "side-plank"
  },
  seatedCableRow: {
    id: "seated-cable-row",
    name: "Seated Cable Row",
    measurementType: "reps-weight",
    role: "primary",
    equipmentCategory: "cable",
    primaryMuscles: ["back"],
    secondaryMuscles: ["biceps"],
    safetyNote: "Shoulder-sensitive: lead with the elbows and avoid shrugging the shoulders up.",
    visualAssetKey: "seated-cable-row"
  },
  hipAbduction: {
    id: "hip-abduction-machine",
    name: "Seated Hip Abduction Machine",
    measurementType: "reps-weight",
    role: "isolation",
    equipmentCategory: "machine",
    primaryMuscles: ["glutes"],
    notes: "If unavailable, a standing cable hip abduction is an equivalent substitute.",
    visualAssetKey: "seated-hip-abduction-machine"
  },
  cableCrunch: {
    id: "cable-crunch-kneeling",
    name: "Cable Crunch",
    measurementType: "reps-weight",
    role: "core",
    equipmentCategory: "cable",
    primaryMuscles: ["core"],
    safetyNote: "Lower-back-sensitive: control the movement and avoid yanking with a heavy load.",
    visualAssetKey: "cable-crunch-kneeling"
  },

  // --- New V2 movements ---
  chestSupportedDbRow: {
    id: "chest-supported-dumbbell-row",
    name: "Chest-Supported Dumbbell Row",
    measurementType: "reps-weight",
    role: "primary",
    equipmentCategory: "dumbbell",
    primaryMuscles: ["back"],
    secondaryMuscles: ["biceps"],
    safetyNote: "Shoulder-sensitive: keep the chest on the pad; pull with the elbows, no jerking.",
    visualAssetKey: "chest-supported-dumbbell-row"
  },
  seatedDbShoulderPress: {
    id: "seated-dumbbell-shoulder-press",
    name: "Seated Dumbbell Shoulder Press",
    measurementType: "reps-weight",
    role: "secondary",
    equipmentCategory: "dumbbell",
    primaryMuscles: ["shoulders"],
    secondaryMuscles: ["triceps"],
    safetyNote: "Shoulder-sensitive: use a controlled range; stop short of pain. Prefer a supported backrest.",
    visualAssetKey: "seated-dumbbell-shoulder-press"
  },
  dbHammerCurl: {
    id: "dumbbell-hammer-curl",
    name: "Dumbbell Hammer Curl",
    measurementType: "reps-weight",
    role: "isolation",
    equipmentCategory: "dumbbell",
    primaryMuscles: ["biceps"],
    visualAssetKey: "dumbbell-hammer-curl"
  },
  ropeTricepsPushdown: {
    id: "rope-triceps-pushdown",
    name: "Rope Triceps Pushdown",
    measurementType: "reps-weight",
    role: "isolation",
    equipmentCategory: "cable",
    primaryMuscles: ["triceps"],
    visualAssetKey: "rope-triceps-pushdown"
  },
  dbRomanianDeadlift: {
    id: "dumbbell-romanian-deadlift",
    name: "Dumbbell Romanian Deadlift",
    measurementType: "reps-weight",
    role: "primary",
    equipmentCategory: "dumbbell",
    primaryMuscles: ["hamstrings", "glutes"],
    safetyNote:
      "Lower-back-sensitive: soft knees, hinge at the hips, keep a neutral spine; do not round the lower back.",
    visualAssetKey: "dumbbell-romanian-deadlift"
  },
  inclineDbPress: {
    id: "incline-dumbbell-press",
    name: "Incline Dumbbell Press",
    measurementType: "reps-weight",
    role: "primary",
    equipmentCategory: "dumbbell",
    primaryMuscles: ["chest"],
    secondaryMuscles: ["shoulders", "triceps"],
    safetyNote: "Shoulder-sensitive: moderate incline; don't flare elbows aggressively.",
    visualAssetKey: "incline-dumbbell-press"
  },
  cableFly: {
    id: "cable-fly",
    name: "Cable Fly",
    measurementType: "reps-weight",
    role: "isolation",
    equipmentCategory: "cable",
    primaryMuscles: ["chest"],
    safetyNote: "Shoulder-sensitive: soft elbows; stop if the front of the shoulder pinches.",
    visualAssetKey: "cable-fly"
  },
  dbLateralRaise: {
    id: "dumbbell-lateral-raise",
    name: "Dumbbell Lateral Raise",
    measurementType: "reps-weight",
    role: "isolation",
    equipmentCategory: "dumbbell",
    primaryMuscles: ["shoulders"],
    safetyNote: "Shoulder-sensitive: light-moderate load; raise only to a comfortable height without shrugging.",
    visualAssetKey: "dumbbell-lateral-raise"
  },
  reversePecDeck: {
    id: "reverse-pec-deck",
    name: "Rear Delt Fly Machine",
    measurementType: "reps-weight",
    role: "isolation",
    equipmentCategory: "machine",
    primaryMuscles: ["shoulders"],
    secondaryMuscles: ["back"],
    safetyNote: "Shoulder-sensitive: controlled tempo; avoid yanking into end range.",
    visualAssetKey: "reverse-pec-deck"
  },
  inclineDbCurl: {
    id: "incline-dumbbell-curl",
    name: "Incline Dumbbell Curl",
    measurementType: "reps-weight",
    role: "isolation",
    equipmentCategory: "dumbbell",
    primaryMuscles: ["biceps"],
    visualAssetKey: "incline-dumbbell-curl"
  },
  overheadCableTriceps: {
    id: "overhead-cable-triceps-extension",
    name: "Overhead Cable Triceps Extension",
    measurementType: "reps-weight",
    role: "isolation",
    equipmentCategory: "cable",
    primaryMuscles: ["triceps"],
    safetyNote: "Shoulder-sensitive: keep ribs down; use a comfortable overhead range.",
    visualAssetKey: "overhead-cable-triceps-extension"
  },
  hackSquat: {
    id: "hack-squat",
    name: "Hack Squat",
    measurementType: "reps-weight",
    role: "primary",
    equipmentCategory: "machine",
    primaryMuscles: ["quadriceps"],
    secondaryMuscles: ["glutes"],
    safetyNote: "Knee-sensitive: controlled depth; avoid bouncing out of the bottom.",
    visualAssetKey: "hack-squat"
  },
  dbBulgarianSplitSquat: {
    id: "dumbbell-bulgarian-split-squat",
    name: "Dumbbell Bulgarian Split Squat",
    measurementType: "reps-weight",
    role: "secondary",
    equipmentCategory: "dumbbell",
    primaryMuscles: ["quadriceps", "glutes"],
    unilateral: true,
    targetUnitLabel: "per side",
    safetyNote:
      "Knee-sensitive: short controlled range; front shin mostly vertical. Not a mandatory deep free lunge.",
    notes: "Use a low rear-foot elevation. Stop short of pain.",
    visualAssetKey: "dumbbell-bulgarian-split-squat"
  },
  flatDbPress: {
    id: "flat-dumbbell-press",
    name: "Flat Dumbbell Press",
    measurementType: "reps-weight",
    role: "primary",
    equipmentCategory: "dumbbell",
    primaryMuscles: ["chest"],
    secondaryMuscles: ["shoulders", "triceps"],
    safetyNote: "Shoulder-sensitive: keep shoulder blades set; don't drop elbows excessively deep.",
    visualAssetKey: "flat-dumbbell-press"
  },
  machineShoulderPress: {
    id: "machine-shoulder-press",
    name: "Machine Shoulder Press",
    measurementType: "reps-weight",
    role: "secondary",
    equipmentCategory: "machine",
    primaryMuscles: ["shoulders"],
    secondaryMuscles: ["triceps"],
    safetyNote: "Shoulder-sensitive: supported machine path; stop short of pain.",
    visualAssetKey: "machine-shoulder-press"
  },
  alternatingDbCurl: {
    id: "alternating-dumbbell-curl",
    name: "Alternating Dumbbell Curl",
    measurementType: "reps-weight",
    role: "isolation",
    equipmentCategory: "dumbbell",
    primaryMuscles: ["biceps"],
    unilateral: true,
    targetUnitLabel: "per side",
    visualAssetKey: "alternating-dumbbell-curl"
  },
  cableTricepsPushdown: {
    id: "cable-triceps-pushdown",
    name: "Cable Triceps Pushdown",
    measurementType: "reps-weight",
    role: "isolation",
    equipmentCategory: "cable",
    primaryMuscles: ["triceps"],
    notes: "Straight bar or V-bar attachment.",
    visualAssetKey: "cable-triceps-pushdown"
  }
};

// ---------------------------------------------------------------------------
// Phase / deload configuration
// ---------------------------------------------------------------------------

interface PhaseConfig {
  label: string;
  guidance: string;
  trainingBlock: 1 | 2;
  isDeload: boolean;
  strengthRestSeconds: number;
  coreRestSeconds: number;
  cardioMinutes: number;
  cardioIntensity: string;
}

const PHASE_BY_WEEK: Record<number, PhaseConfig> = {
  1: {
    label: "Block 1 — Technique & Base",
    guidance: "Learn the Block 1 movements with conservative loads. Keep 2–3 reps in reserve. No failure training.",
    trainingBlock: 1,
    isDeload: false,
    strengthRestSeconds: 75,
    coreRestSeconds: 45,
    cardioMinutes: 15,
    cardioIntensity: "Easy, conversational pace. Elliptical or stationary bike."
  },
  2: {
    label: "Block 1 — Base Volume",
    guidance: "Same Block 1 structure. Add a little load only if week 1 felt fully controlled. Keep 2–3 reps in reserve.",
    trainingBlock: 1,
    isDeload: false,
    strengthRestSeconds: 75,
    coreRestSeconds: 45,
    cardioMinutes: 15,
    cardioIntensity: "Easy, conversational pace. Elliptical or stationary bike."
  },
  3: {
    label: "Block 1 — Controlled Progression",
    guidance: "Progress load or reps slightly versus weeks 1–2. Keep 1–2 reps in reserve. No failure training.",
    trainingBlock: 1,
    isDeload: false,
    strengthRestSeconds: 90,
    coreRestSeconds: 45,
    cardioMinutes: 18,
    cardioIntensity: "Moderate, steady pace. Elliptical or stationary bike."
  },
  4: {
    label: "Block 1 — Peak Week",
    guidance: "Aim slightly heavier than week 3 at the same sets. Keep 1–2 reps in reserve. No failure training.",
    trainingBlock: 1,
    isDeload: false,
    strengthRestSeconds: 90,
    coreRestSeconds: 45,
    cardioMinutes: 18,
    cardioIntensity: "Moderate, steady pace. Elliptical or stationary bike."
  },
  5: {
    label: "Deload (Block 1)",
    guidance:
      "Deload: same Block 1 exercises with reduced sets and lighter loads. Keep 3–4 reps in reserve. No failure training.",
    trainingBlock: 1,
    isDeload: true,
    strengthRestSeconds: 60,
    coreRestSeconds: 30,
    cardioMinutes: 10,
    cardioIntensity: "Easy recovery pace only. Elliptical or stationary bike."
  },
  6: {
    label: "Block 2 — Controlled Introduction",
    guidance: "Introduce Block 2 movements with controlled loads. Keep 2–3 reps in reserve. No failure training.",
    trainingBlock: 2,
    isDeload: false,
    strengthRestSeconds: 75,
    coreRestSeconds: 45,
    cardioMinutes: 15,
    cardioIntensity: "Easy-to-moderate pace. Elliptical or stationary bike."
  },
  7: {
    label: "Block 2 — Progression",
    guidance: "Add reps or load versus week 6 at the same set structure. Keep 1–2 reps in reserve. No failure training.",
    trainingBlock: 2,
    isDeload: false,
    strengthRestSeconds: 90,
    coreRestSeconds: 45,
    cardioMinutes: 18,
    cardioIntensity: "Moderate, steady pace. Elliptical or stationary bike."
  },
  8: {
    label: "Block 2 — Controlled Performance",
    guidance:
      "Controlled performance week. Preserve set counts with solid form. Keep about 2 reps in reserve. No failure training.",
    trainingBlock: 2,
    isDeload: false,
    strengthRestSeconds: 90,
    coreRestSeconds: 45,
    cardioMinutes: 20,
    cardioIntensity: "Easy-to-moderate pace. Elliptical or stationary bike."
  }
};

interface Prescription {
  entry: CatalogEntry;
  sets: number;
  reps: string;
  optional?: boolean;
  restSeconds?: number;
}

function applyDeload(rx: Prescription, isDeload: boolean): Prescription {
  if (!isDeload) return rx;
  const role = rx.entry.role;
  let sets = rx.sets;
  if (role === "primary") {
    sets = Math.max(1, rx.sets - 1);
  } else {
    // Accessories and core: 2 sets on deload.
    sets = 2;
  }
  return { ...rx, sets };
}

function buildExercise(rx: Prescription, phase: PhaseConfig): Exercise {
  const adjusted = applyDeload(rx, phase.isDeload);
  const rest =
    adjusted.restSeconds ??
    (adjusted.entry.role === "core" ? phase.coreRestSeconds : phase.strengthRestSeconds);
  return {
    id: adjusted.entry.id,
    name: adjusted.entry.name,
    targetSets: adjusted.sets,
    targetReps: adjusted.reps,
    measurementType: adjusted.entry.measurementType,
    role: adjusted.entry.role,
    equipmentCategory: adjusted.entry.equipmentCategory,
    primaryMuscles: adjusted.entry.primaryMuscles,
    secondaryMuscles: adjusted.entry.secondaryMuscles,
    unilateral: adjusted.entry.unilateral,
    targetUnitLabel: adjusted.entry.targetUnitLabel,
    restSeconds: rest,
    optional: adjusted.optional,
    notes: adjusted.entry.notes,
    safetyNote: adjusted.entry.safetyNote,
    visualAssetKey: adjusted.entry.visualAssetKey
  };
}

function warmupItem(
  id: string,
  name: string,
  duration: string,
  options: { safetyNote?: string; visualAssetKey?: string }
): WarmupItem {
  return { id, name, duration, safetyNote: options.safetyNote, visualAssetKey: options.visualAssetKey };
}

function makeCardio(phase: PhaseConfig, optional: boolean): CardioBlock {
  return {
    machine: "elliptical",
    alternateMachine: "stationary_bike",
    durationMinutes: phase.cardioMinutes,
    intensity: phase.cardioIntensity,
    optional,
    measurementType: "cardio-duration",
    role: "cardio",
    equipmentCategory: "cardio-machine",
    visualAssetKey: "elliptical"
  };
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

type TemplateId = "upperA" | "lowerA" | "upperB" | "lowerB";

interface TemplateDef {
  variant: WorkoutVariant;
  variantLabel: string;
  focusArea: FocusArea;
  length: SessionLength;
  estimatedDurationMinutes: { min: number; max: number };
  primaryMuscleGroups: MuscleGroup[];
  titleFor: (block: 1 | 2) => string;
  focus: string;
  warmup: WarmupItem[];
  strength: (block: 1 | 2) => Prescription[];
  core: (block: 1 | 2) => Prescription[];
  hasCardio: boolean;
}

const UPPER_WARMUP: WarmupItem[] = [
  warmupItem("warmup-bike-easy", "Easy Stationary Bike Warm-Up", "3 min", {
    visualAssetKey: "stationary-bike"
  }),
  warmupItem("warmup-arm-circles", "Arm Circles", "10 each direction", { visualAssetKey: "arm-circles" }),
  warmupItem("warmup-band-pull-apart", "Band Pull-Aparts", "12 reps", { visualAssetKey: "band-pull-apart" })
];

const LOWER_WARMUP: WarmupItem[] = [
  warmupItem("warmup-elliptical-easy", "Easy Elliptical Warm-Up", "3–5 min", {
    visualAssetKey: "elliptical"
  }),
  warmupItem("warmup-glute-bridge", "Glute Bridge Activation", "10 reps", {
    visualAssetKey: "glute-bridge-activation"
  }),
  warmupItem("warmup-leg-swings", "Leg Swings (Controlled, Holding Support)", "10 each leg", {
    safetyNote: "Knee-sensitive: keep the swing controlled and low; avoid high or forceful kicks.",
    visualAssetKey: "leg-swings"
  })
];

const TEMPLATES: Record<TemplateId, TemplateDef> = {
  upperA: {
    variant: "upper-a",
    variantLabel: "Upper A",
    focusArea: "upper",
    length: "short",
    estimatedDurationMinutes: { min: 35, max: 45 },
    primaryMuscleGroups: ["chest", "back", "shoulders", "biceps", "triceps"],
    titleFor: (block) => (block === 1 ? "Upper A — Workday" : "Upper A2 — Workday"),
    focus: "Chest · Back · Shoulders · Biceps · Triceps",
    warmup: UPPER_WARMUP,
    strength: (block) =>
      block === 1
        ? [
            { entry: EX.chestPressMachine, sets: 3, reps: "8-12" },
            { entry: EX.latPulldown, sets: 3, reps: "8-12" },
            { entry: EX.chestSupportedDbRow, sets: 3, reps: "10-12" },
            { entry: EX.seatedDbShoulderPress, sets: 2, reps: "8-12" },
            { entry: EX.dbHammerCurl, sets: 3, reps: "10-12" },
            { entry: EX.ropeTricepsPushdown, sets: 3, reps: "10-12" }
          ]
        : [
            { entry: EX.flatDbPress, sets: 3, reps: "8-12" },
            { entry: EX.latPulldown, sets: 3, reps: "8-12" },
            { entry: EX.seatedCableRow, sets: 3, reps: "10-12" },
            { entry: EX.machineShoulderPress, sets: 2, reps: "8-12" },
            { entry: EX.alternatingDbCurl, sets: 3, reps: "10-12" },
            { entry: EX.cableTricepsPushdown, sets: 3, reps: "10-12" }
          ],
    core: () => [],
    hasCardio: false
  },
  lowerA: {
    variant: "lower-a",
    variantLabel: "Lower A",
    focusArea: "lower",
    length: "short",
    estimatedDurationMinutes: { min: 35, max: 45 },
    primaryMuscleGroups: ["quadriceps", "hamstrings", "glutes", "calves", "core"],
    titleFor: (block) => (block === 1 ? "Lower A — Workday" : "Lower A2 — Workday"),
    focus: "Quads · Hamstrings · Glutes · Calves · Core",
    warmup: LOWER_WARMUP,
    strength: (block) =>
      block === 1
        ? [
            { entry: EX.legPress, sets: 3, reps: "10-12" },
            { entry: EX.dbRomanianDeadlift, sets: 3, reps: "8-12" },
            { entry: EX.seatedLegCurl, sets: 3, reps: "10-12" },
            { entry: EX.seatedCalfRaise, sets: 3, reps: "12-15" }
          ]
        : [
            { entry: EX.hackSquat, sets: 3, reps: "8-12" },
            { entry: EX.hipThrust, sets: 3, reps: "10-12" },
            { entry: EX.seatedLegCurl, sets: 3, reps: "10-12" },
            { entry: EX.legExtension, sets: 3, reps: "12-15" },
            { entry: EX.seatedCalfRaise, sets: 3, reps: "12-15" }
          ],
    core: (block) =>
      block === 1
        ? [{ entry: EX.deadBug, sets: 3, reps: "8-12 per side" }]
        : [{ entry: EX.sidePlank, sets: 3, reps: "20-45 sec per side" }],
    hasCardio: false
  },
  upperB: {
    variant: "upper-b",
    variantLabel: "Upper B",
    focusArea: "upper",
    length: "long",
    estimatedDurationMinutes: { min: 70, max: 90 },
    primaryMuscleGroups: ["chest", "back", "shoulders", "biceps", "triceps"],
    titleFor: (block) => (block === 1 ? "Upper B — Off Day" : "Upper B2 — Off Day"),
    focus: "Chest · Back · Shoulders · Biceps · Triceps",
    warmup: [
      warmupItem("warmup-bike-easy-long", "Easy Stationary Bike Warm-Up", "5 min", {
        visualAssetKey: "stationary-bike"
      }),
      warmupItem("warmup-arm-circles-long", "Arm Circles", "10 each direction", {
        visualAssetKey: "arm-circles"
      }),
      warmupItem("warmup-band-pull-apart-long", "Band Pull-Aparts", "12 reps", {
        visualAssetKey: "band-pull-apart"
      }),
      warmupItem("warmup-face-pull-light", "Cable Face Pull (Light)", "12 reps", {
        visualAssetKey: "cable-face-pull"
      })
    ],
    strength: (block) =>
      block === 1
        ? [
            { entry: EX.inclineDbPress, sets: 4, reps: "8-10" },
            { entry: EX.chestSupportedRow, sets: 4, reps: "8-10" },
            { entry: EX.latPulldown, sets: 3, reps: "10-12" },
            { entry: EX.cableFly, sets: 3, reps: "12-15" },
            { entry: EX.dbLateralRaise, sets: 3, reps: "12-15" },
            { entry: EX.reversePecDeck, sets: 3, reps: "12-15" },
            { entry: EX.inclineDbCurl, sets: 3, reps: "10-12" },
            { entry: EX.overheadCableTriceps, sets: 3, reps: "10-12" }
          ]
        : [
            { entry: EX.inclineDbPress, sets: 4, reps: "8-10" },
            { entry: EX.chestSupportedDbRow, sets: 4, reps: "8-10" },
            { entry: EX.latPulldown, sets: 3, reps: "8-12" },
            { entry: EX.cableFly, sets: 3, reps: "12-15" },
            { entry: EX.dbLateralRaise, sets: 3, reps: "12-15" },
            { entry: EX.reversePecDeck, sets: 3, reps: "12-15" },
            { entry: EX.inclineDbCurl, sets: 3, reps: "10-12" },
            { entry: EX.overheadCableTriceps, sets: 3, reps: "10-12" }
          ],
    core: () => [],
    hasCardio: false
  },
  lowerB: {
    variant: "lower-b",
    variantLabel: "Lower B",
    focusArea: "lower",
    length: "long",
    estimatedDurationMinutes: { min: 70, max: 90 },
    primaryMuscleGroups: ["quadriceps", "hamstrings", "glutes", "calves", "core"],
    titleFor: (block) => (block === 1 ? "Lower B — Off Day" : "Lower B2 — Off Day"),
    focus: "Quads · Hamstrings · Glutes · Calves · Core",
    warmup: [
      warmupItem("warmup-elliptical-easy-long", "Easy Elliptical Warm-Up", "5 min", {
        visualAssetKey: "elliptical"
      }),
      warmupItem("warmup-glute-bridge-long", "Glute Bridge Activation", "12 reps", {
        visualAssetKey: "glute-bridge-activation"
      }),
      warmupItem("warmup-leg-swings-long", "Leg Swings (Controlled, Holding Support)", "10 each leg", {
        safetyNote: "Knee-sensitive: keep the swing controlled and low; avoid high or forceful kicks.",
        visualAssetKey: "leg-swings"
      }),
      warmupItem("warmup-cat-cow", "Cat-Cow", "8 reps", {
        safetyNote: "Lower-back-sensitive: move slowly through a comfortable range; don't force the stretch.",
        visualAssetKey: "cat-cow"
      })
    ],
    strength: (block) =>
      block === 1
        ? [
            { entry: EX.hackSquat, sets: 4, reps: "8-10" },
            { entry: EX.dbBulgarianSplitSquat, sets: 3, reps: "8-10 per side" },
            { entry: EX.hipThrust, sets: 4, reps: "8-12" },
            { entry: EX.seatedLegCurl, sets: 3, reps: "10-12" },
            { entry: EX.legExtension, sets: 3, reps: "12-15" },
            { entry: EX.seatedCalfRaise, sets: 3, reps: "12-15" }
          ]
        : [
            { entry: EX.legPress, sets: 4, reps: "10" },
            { entry: EX.dbBulgarianSplitSquat, sets: 2, reps: "8-10 per side" },
            { entry: EX.dbRomanianDeadlift, sets: 4, reps: "8-10" },
            { entry: EX.seatedLegCurl, sets: 3, reps: "10-12" },
            { entry: EX.hipAbduction, sets: 3, reps: "12-15" },
            { entry: EX.seatedCalfRaise, sets: 3, reps: "12-15" }
          ],
    core: (block) =>
      block === 1
        ? [
            { entry: EX.pallofPress, sets: 3, reps: "10-12 per side", restSeconds: 60 },
            { entry: EX.forearmPlank, sets: 3, reps: "30-60 sec" }
          ]
        : [
            { entry: EX.cableCrunch, sets: 3, reps: "10-15" },
            { entry: EX.pallofPress, sets: 3, reps: "10-12 per side", restSeconds: 60 }
          ],
    hasCardio: true
  }
};

const VARIANT_SEQUENCE: TemplateId[] = ["upperA", "lowerA", "upperB", "lowerB"];

function buildWorkout(order: number, week: number, templateId: TemplateId): Workout {
  const phase = PHASE_BY_WEEK[week];
  const template = TEMPLATES[templateId];
  const block = phase.trainingBlock;
  const strength = template.strength(block).map((rx) => buildExercise(rx, phase));
  const core = template.core(block).map((rx) => buildExercise(rx, phase));

  return {
    id: `w${order}`,
    order,
    week,
    title: template.titleFor(block),
    variantLabel: template.variantLabel,
    variant: template.variant,
    focusArea: template.focusArea,
    trainingBlock: block,
    primaryMuscleGroups: template.primaryMuscleGroups,
    length: template.length,
    estimatedDurationMinutes: template.estimatedDurationMinutes,
    focus: template.focus,
    phaseLabel: phase.label,
    intensityGuidance: phase.guidance,
    warmup: template.warmup,
    strength,
    core,
    cardio: template.hasCardio ? makeCardio(phase, false) : undefined
  };
}

function buildAllWorkouts(): Workout[] {
  return Array.from({ length: PROGRAM_LENGTH }, (_, index) => {
    const order = index + 1;
    const week = Math.floor(index / 4) + 1;
    const templateId = VARIANT_SEQUENCE[index % 4];
    return buildWorkout(order, week, templateId);
  });
}

const workouts: Workout[] = buildAllWorkouts();

function buildProgramSlots(): ProgramSlot[] {
  const byOrder = new Map(workouts.map((workout) => [workout.order, workout]));
  return Array.from({ length: PROGRAM_LENGTH }, (_, index) => {
    const order = index + 1;
    const workout = byOrder.get(order);
    return workout
      ? ({ order, status: "ready", workout } as const)
      : ({ order, status: "placeholder" } as const);
  });
}

export const programSlots: ProgramSlot[] = buildProgramSlots();

export function getWorkoutByOrder(order: number): Workout | undefined {
  const slot = programSlots.find((s) => s.order === order);
  return slot?.status === "ready" ? slot.workout : undefined;
}

export function getWorkoutById(workoutId: string): Workout | undefined {
  return workouts.find((w) => w.id === workoutId);
}

/** All authored workouts (ready slots only). */
export function getAllWorkouts(): Workout[] {
  return workouts;
}

/** Catalog snapshot for migration/reporting (stable IDs currently in V2). */
export function getV2CatalogEntries(): CatalogEntry[] {
  return Object.values(EX);
}
