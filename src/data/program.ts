import {
  PROGRAM_LENGTH,
  PROGRAM_VERSION,
  type CardioBlock,
  type EquipmentCategory,
  type Exercise,
  type ExerciseRole,
  type FocusArea,
  type MeasurementType,
  type MuscleGroup,
  type PreferredWeekday,
  type ProgramSlot,
  type SessionLength,
  type WarmupItem,
  type Workout,
  type WorkoutIdentity,
  type WorkoutVariant
} from "../types";
import { plannedDayOffsetForOrder, preferredWeekdayForVariant } from "../lib/schedule";

/**
 * V3 Program Identity — Upper/Lower 8-week / 32-workout plan.
 *
 * Weekly cycle: Upper A Push (Tue) → Lower A Quad (Wed) → Upper B Pull (Fri) → Lower B Posterior (Sun).
 * Same exercises weeks 1–8. Week 5 deload (~35–45% set reduction).
 * Workout IDs remain `w1`…`w32` so completed progress maps naturally.
 */

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
    role: "secondary",
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
    role: "secondary",
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
  chestSupportedDbRow: {
    id: "chest-supported-dumbbell-row",
    name: "Chest-Supported Dumbbell Row",
    measurementType: "reps-weight",
    role: "secondary",
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
    role: "secondary",
    equipmentCategory: "dumbbell",
    primaryMuscles: ["hamstrings"],
    secondaryMuscles: ["glutes"],
    safetyNote:
      "Lower-back-sensitive: soft knees, hinge at the hips, keep a neutral spine; do not round the lower back.",
    visualAssetKey: "dumbbell-romanian-deadlift"
  },
  inclineDbPress: {
    id: "incline-dumbbell-press",
    name: "Incline Dumbbell Press",
    measurementType: "reps-weight",
    role: "secondary",
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
    primaryMuscles: ["quadriceps"],
    secondaryMuscles: ["glutes"],
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
  },
  cableFacePull: {
    id: "cable-face-pull",
    name: "Cable Face Pull",
    measurementType: "reps-weight",
    role: "isolation",
    equipmentCategory: "cable",
    primaryMuscles: ["shoulders"],
    secondaryMuscles: ["back"],
    visualAssetKey: "cable-face-pull"
  }
};

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
    label: "Week 1 — Establish loads",
    guidance: "Learn working weights with controlled form. Keep about 3 reps in reserve. No failure training.",
    trainingBlock: 1,
    isDeload: false,
    strengthRestSeconds: 75,
    coreRestSeconds: 45,
    cardioMinutes: 15,
    cardioIntensity: "Easy, conversational pace. Elliptical or stationary bike."
  },
  2: {
    label: "Week 2 — Add reps",
    guidance: "Add valid repetitions in the prescribed ranges. Keep about 2–3 reps in reserve.",
    trainingBlock: 1,
    isDeload: false,
    strengthRestSeconds: 75,
    coreRestSeconds: 45,
    cardioMinutes: 15,
    cardioIntensity: "Easy, conversational pace. Elliptical or stationary bike."
  },
  3: {
    label: "Week 3 — Progress",
    guidance: "Add repetitions or a small load increase. Keep about 2 reps in reserve. No failure training.",
    trainingBlock: 1,
    isDeload: false,
    strengthRestSeconds: 90,
    coreRestSeconds: 45,
    cardioMinutes: 18,
    cardioIntensity: "Moderate, steady pace. Elliptical or stationary bike."
  },
  4: {
    label: "Week 4 — Peak controlled",
    guidance: "Controlled hardest week. Keep about 1–2 reps in reserve. No routine failure.",
    trainingBlock: 1,
    isDeload: false,
    strengthRestSeconds: 90,
    coreRestSeconds: 45,
    cardioMinutes: 18,
    cardioIntensity: "Moderate, steady pace. Elliptical or stationary bike."
  },
  5: {
    label: "Week 5 — Deload",
    guidance:
      "Deload: same movements with roughly 35–45% fewer working sets and lighter loads. Keep 3–4 reps in reserve. No failure.",
    trainingBlock: 1,
    isDeload: true,
    strengthRestSeconds: 60,
    coreRestSeconds: 30,
    cardioMinutes: 10,
    cardioIntensity: "Easy recovery pace only. Elliptical or stationary bike."
  },
  6: {
    label: "Week 6 — Resume",
    guidance: "Resume normal set structure conservatively. Keep about 3 reps in reserve.",
    trainingBlock: 2,
    isDeload: false,
    strengthRestSeconds: 75,
    coreRestSeconds: 45,
    cardioMinutes: 15,
    cardioIntensity: "Easy-to-moderate pace. Elliptical or stationary bike."
  },
  7: {
    label: "Week 7 — Build",
    guidance: "Add repetitions or load versus week 6. Keep about 2 reps in reserve.",
    trainingBlock: 2,
    isDeload: false,
    strengthRestSeconds: 90,
    coreRestSeconds: 45,
    cardioMinutes: 18,
    cardioIntensity: "Moderate, steady pace. Elliptical or stationary bike."
  },
  8: {
    label: "Week 8 — Performance",
    guidance: "Controlled performance week. Keep about 1–2 reps in reserve. No mandatory failure test.",
    trainingBlock: 2,
    isDeload: false,
    strengthRestSeconds: 90,
    coreRestSeconds: 45,
    cardioMinutes: 20,
    cardioIntensity: "Easy-to-moderate pace. Elliptical or stationary bike."
  }
};

/**
 * One template slot. `entry` is the Block 1 movement; when `blockTwoEntry` is set
 * the slot rotates to a different movement for Block 2 (weeks 6–8).
 *
 * Set counts never differ between blocks — only the movement does. That keeps a
 * single weekly volume table valid for the whole program and leaves double
 * progression on the Primary Lifts untouched (Primary slots never rotate).
 */
interface Prescription {
  entry: CatalogEntry;
  sets: number;
  reps: string;
  optional?: boolean;
  restSeconds?: number;
  role?: ExerciseRole;
  primaryMuscles?: MuscleGroup[];
  secondaryMuscles?: MuscleGroup[];
  /** Block 2 (weeks 6–8) rotation for this slot. Omit to keep the same movement. */
  blockTwoEntry?: CatalogEntry;
  blockTwoReps?: string;
  blockTwoRole?: ExerciseRole;
  blockTwoRestSeconds?: number;
}

interface ResolvedSlot {
  entry: CatalogEntry;
  sets: number;
  reps: string;
  role: ExerciseRole;
  restSeconds?: number;
  optional?: boolean;
  primaryMuscles?: MuscleGroup[];
  secondaryMuscles?: MuscleGroup[];
}

/** Picks the Block 1 or Block 2 movement for a slot. Set count is block-independent. */
function resolveForBlock(rx: Prescription, trainingBlock: 1 | 2): ResolvedSlot {
  const rotated = trainingBlock === 2 && rx.blockTwoEntry != null;
  const entry = rotated ? rx.blockTwoEntry! : rx.entry;
  return {
    entry,
    sets: rx.sets,
    reps: (rotated ? rx.blockTwoReps : undefined) ?? rx.reps,
    role: (rotated ? rx.blockTwoRole : undefined) ?? rx.role ?? entry.role,
    restSeconds: (rotated ? rx.blockTwoRestSeconds : undefined) ?? rx.restSeconds,
    optional: rx.optional,
    primaryMuscles: rx.primaryMuscles,
    secondaryMuscles: rx.secondaryMuscles
  };
}

/** ~35–45% weekly set reduction on deload while keeping Primary Lift present.
 * Per-day rounding of ×0.6 / ×0.55 may slightly exceed 45% on a single day;
 * validators gate the weekly total, not each day independently.
 */
function deloadSets(sets: number, role: ExerciseRole): number {
  const factor = role === "primary" ? 0.6 : 0.55;
  return Math.max(1, Math.round(sets * factor));
}

function buildExercise(rx: Prescription, phase: PhaseConfig): Exercise {
  // Week 5 is trainingBlock 1, so the deload always runs on familiar Block 1 movements.
  const slot = resolveForBlock(rx, phase.trainingBlock);
  const sets = phase.isDeload ? deloadSets(slot.sets, slot.role) : slot.sets;
  const rest =
    slot.restSeconds ?? (slot.role === "core" ? phase.coreRestSeconds : phase.strengthRestSeconds);
  return {
    id: slot.entry.id,
    name: slot.entry.name,
    targetSets: sets,
    targetReps: slot.reps,
    measurementType: slot.entry.measurementType,
    role: slot.role,
    equipmentCategory: slot.entry.equipmentCategory,
    primaryMuscles: slot.primaryMuscles ?? slot.entry.primaryMuscles,
    secondaryMuscles: slot.secondaryMuscles ?? slot.entry.secondaryMuscles,
    unilateral: slot.entry.unilateral,
    targetUnitLabel: slot.entry.targetUnitLabel,
    restSeconds: rest,
    optional: slot.optional,
    notes: slot.entry.notes,
    safetyNote: slot.entry.safetyNote,
    visualAssetKey: slot.entry.visualAssetKey
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

function makeCardio(phase: PhaseConfig): CardioBlock {
  return {
    machine: "elliptical",
    alternateMachine: "stationary_bike",
    durationMinutes: phase.cardioMinutes,
    intensity: phase.cardioIntensity,
    optional: true,
    measurementType: "cardio-duration",
    role: "cardio",
    equipmentCategory: "cardio-machine",
    visualAssetKey: "elliptical"
  };
}

type TemplateId = "upperA" | "lowerA" | "upperB" | "lowerB";

interface TemplateDef {
  variant: WorkoutVariant;
  variantLabel: string;
  identity: WorkoutIdentity;
  preferredWeekday: PreferredWeekday;
  focusArea: FocusArea;
  length: SessionLength;
  estimatedDurationMinutes: { min: number; max: number };
  primaryMuscleGroups: MuscleGroup[];
  title: string;
  focus: string;
  warmup: WarmupItem[];
  strength: Prescription[];
  core: Prescription[];
  optionalCore: Prescription[];
  hasOptionalCardio: boolean;
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

/**
 * Final V3 templates with two-block accessory rotation.
 *
 * Block 1 = weeks 1–4 (+ week 5 deload), Block 2 = weeks 6–8. Primary Lifts and
 * set counts are identical in both blocks; eight accessory slots rotate to a
 * different movement in Block 2. Rationale: Baz-Valle et al. 2019 (PLOS One)
 * found random per-session variation matched fixed selection for growth but
 * raised training motivation, and advised limiting variety on compound lifts
 * while varying isolation work; Kassiano et al. 2022 (JSCR) concluded that
 * systematic variation helps whereas excessive random variation can compromise
 * gains. See docs/V3_BLOCK_ROTATION.md.
 *
 * Mandatory volume (normal week, primaryMuscles only) — same in both blocks:
 * Chest 9, Back 13, Shoulders 9, Biceps 6, Triceps 6,
 * Quads 10, Hamstrings 8, Glutes 7, Calves 8, Core 4. Weekly total 80 sets.
 */
const TEMPLATES: Record<TemplateId, TemplateDef> = {
  upperA: {
    variant: "upper-a",
    variantLabel: "Upper A",
    identity: "push",
    preferredWeekday: "tuesday",
    focusArea: "upper",
    length: "short",
    estimatedDurationMinutes: { min: 45, max: 55 },
    primaryMuscleGroups: ["chest", "shoulders", "triceps"],
    title: "Upper A — Push",
    focus: "Push emphasis · chest, shoulders, triceps",
    warmup: UPPER_WARMUP,
    // 6 exercises / 18 sets. Chest 6, Shoulders 6, Triceps 3, Back 3.
    strength: [
      { entry: EX.chestPressMachine, sets: 4, reps: "8-12", role: "primary", restSeconds: 90 },
      {
        entry: EX.seatedDbShoulderPress,
        blockTwoEntry: EX.machineShoulderPress,
        sets: 3,
        reps: "8-12",
        role: "secondary",
        restSeconds: 90
      },
      {
        entry: EX.cableFly,
        blockTwoEntry: EX.flatDbPress,
        sets: 2,
        reps: "12-15",
        blockTwoReps: "8-12",
        role: "isolation",
        blockTwoRole: "secondary",
        restSeconds: 60,
        blockTwoRestSeconds: 90
      },
      {
        entry: EX.ropeTricepsPushdown,
        blockTwoEntry: EX.cableTricepsPushdown,
        sets: 3,
        reps: "10-12",
        role: "isolation",
        restSeconds: 60
      },
      { entry: EX.dbLateralRaise, sets: 3, reps: "12-15", role: "isolation", restSeconds: 60 },
      {
        entry: EX.chestSupportedDbRow,
        sets: 3,
        reps: "10-12",
        role: "secondary",
        restSeconds: 75
      }
    ],
    core: [],
    optionalCore: [],
    hasOptionalCardio: false
  },
  lowerA: {
    variant: "lower-a",
    variantLabel: "Lower A",
    identity: "quad",
    preferredWeekday: "wednesday",
    focusArea: "lower",
    length: "short",
    estimatedDurationMinutes: { min: 40, max: 55 },
    primaryMuscleGroups: ["quadriceps", "calves", "core"],
    title: "Lower A — Quad",
    focus: "Quad emphasis · knees, calves, core",
    warmup: LOWER_WARMUP,
    // 5 exercises / 15 sets. Quads 7, Calves 4, Hamstrings 2, Core 2.
    strength: [
      { entry: EX.legPress, sets: 4, reps: "10-12", role: "primary", restSeconds: 90 },
      { entry: EX.legExtension, sets: 3, reps: "12-15", role: "secondary", restSeconds: 60 },
      { entry: EX.seatedCalfRaise, sets: 4, reps: "12-15", role: "isolation", restSeconds: 45 },
      {
        entry: EX.dbRomanianDeadlift,
        blockTwoEntry: EX.seatedLegCurl,
        sets: 2,
        reps: "8-12",
        blockTwoReps: "10-12",
        role: "secondary",
        restSeconds: 90,
        blockTwoRestSeconds: 60
      }
    ],
    core: [
      {
        entry: EX.deadBug,
        blockTwoEntry: EX.cableCrunch,
        sets: 2,
        reps: "8-12 per side",
        blockTwoReps: "10-15",
        role: "core",
        restSeconds: 45
      }
    ],
    optionalCore: [],
    hasOptionalCardio: false
  },
  upperB: {
    variant: "upper-b",
    variantLabel: "Upper B",
    identity: "pull",
    preferredWeekday: "friday",
    focusArea: "upper",
    length: "long",
    estimatedDurationMinutes: { min: 75, max: 95 },
    primaryMuscleGroups: ["back", "shoulders", "biceps"],
    title: "Upper B — Pull",
    focus: "Pull emphasis · lats, mid-back, rear delts, biceps",
    warmup: [
      warmupItem("warmup-bike-easy-long", "Easy Stationary Bike Warm-Up", "5 min", {
        visualAssetKey: "stationary-bike"
      }),
      warmupItem("warmup-arm-circles-long", "Arm Circles", "10 each direction", {
        visualAssetKey: "arm-circles"
      }),
      warmupItem("warmup-band-pull-apart-long", "Band Pull-Aparts", "12 reps", {
        visualAssetKey: "band-pull-apart"
      })
    ],
    // 8 exercises / 25 sets. Back 10, Chest 3, Shoulders 3, Biceps 6, Triceps 3.
    strength: [
      { entry: EX.chestSupportedRow, sets: 4, reps: "8-10", role: "primary", restSeconds: 90 },
      { entry: EX.latPulldown, sets: 3, reps: "8-12", role: "secondary", restSeconds: 90 },
      { entry: EX.seatedCableRow, sets: 3, reps: "10-12", role: "secondary", restSeconds: 75 },
      {
        entry: EX.inclineDbPress,
        sets: 3,
        reps: "8-10",
        role: "secondary",
        restSeconds: 90
      },
      {
        entry: EX.reversePecDeck,
        blockTwoEntry: EX.cableFacePull,
        sets: 3,
        reps: "12-15",
        role: "isolation",
        restSeconds: 60
      },
      {
        entry: EX.inclineDbCurl,
        blockTwoEntry: EX.alternatingDbCurl,
        sets: 3,
        reps: "10-12",
        blockTwoReps: "10-12 per side",
        role: "isolation",
        restSeconds: 60
      },
      { entry: EX.dbHammerCurl, sets: 3, reps: "10-12", role: "isolation", restSeconds: 60 },
      {
        entry: EX.overheadCableTriceps,
        sets: 3,
        reps: "10-12",
        role: "isolation",
        restSeconds: 60
      }
    ],
    core: [],
    optionalCore: [
      { entry: EX.deadBug, sets: 2, reps: "8-10 per side", optional: true, role: "core", restSeconds: 30 },
      {
        entry: EX.pallofPress,
        sets: 2,
        reps: "8-10 per side",
        optional: true,
        role: "core",
        restSeconds: 45
      }
    ],
    hasOptionalCardio: true
  },
  lowerB: {
    variant: "lower-b",
    variantLabel: "Lower B",
    identity: "posterior",
    preferredWeekday: "sunday",
    focusArea: "lower",
    length: "long",
    estimatedDurationMinutes: { min: 75, max: 95 },
    primaryMuscleGroups: ["glutes", "hamstrings", "core"],
    title: "Lower B — Posterior",
    focus: "Posterior chain · glutes, hamstrings, stability",
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
    // 7 exercises / 22 sets. Glutes 7, Hamstrings 6, Quads 3, Calves 4, Core 2.
    strength: [
      { entry: EX.hipThrust, sets: 4, reps: "8-12", role: "primary", restSeconds: 90 },
      {
        entry: EX.dbRomanianDeadlift,
        sets: 3,
        reps: "8-10",
        role: "secondary",
        restSeconds: 90
      },
      { entry: EX.seatedLegCurl, sets: 3, reps: "10-12", role: "secondary", restSeconds: 60 },
      {
        entry: EX.dbBulgarianSplitSquat,
        blockTwoEntry: EX.hackSquat,
        sets: 3,
        reps: "8-10 per side",
        blockTwoReps: "10-12",
        role: "secondary",
        blockTwoRole: "secondary",
        restSeconds: 75,
        blockTwoRestSeconds: 90
      },
      { entry: EX.hipAbduction, sets: 3, reps: "12-15", role: "isolation", restSeconds: 45 },
      { entry: EX.seatedCalfRaise, sets: 4, reps: "12-15", role: "isolation", restSeconds: 45 }
    ],
    core: [
      {
        entry: EX.pallofPress,
        sets: 2,
        reps: "10-12 per side",
        role: "core",
        restSeconds: 45
      }
    ],
    optionalCore: [
      {
        entry: EX.forearmPlank,
        sets: 2,
        reps: "30-45 sec",
        optional: true,
        role: "core",
        restSeconds: 30
      },
      {
        entry: EX.sidePlank,
        sets: 2,
        reps: "20-40 sec per side",
        optional: true,
        role: "core",
        restSeconds: 30
      }
    ],
    hasOptionalCardio: true
  }
};

const VARIANT_SEQUENCE: TemplateId[] = ["upperA", "lowerA", "upperB", "lowerB"];

function buildWorkout(order: number, week: number, templateId: TemplateId): Workout {
  const phase = PHASE_BY_WEEK[week];
  const template = TEMPLATES[templateId];
  const strength = template.strength.map((rx) => buildExercise(rx, phase));
  const core = template.core.map((rx) => buildExercise(rx, phase));
  const optionalCore =
    template.optionalCore.length > 0
      ? template.optionalCore.map((rx) => buildExercise({ ...rx, optional: true }, phase))
      : undefined;

  return {
    id: `w${order}`,
    order,
    week,
    title: template.title,
    variantLabel: template.variantLabel,
    variant: template.variant,
    identity: template.identity,
    preferredWeekday: preferredWeekdayForVariant(template.variant),
    plannedDayOffset: plannedDayOffsetForOrder(order),
    programVersion: PROGRAM_VERSION,
    focusArea: template.focusArea,
    trainingBlock: phase.trainingBlock,
    primaryMuscleGroups: template.primaryMuscleGroups,
    length: template.length,
    estimatedDurationMinutes: template.estimatedDurationMinutes,
    focus: template.focus,
    phaseLabel: phase.label,
    intensityGuidance: phase.guidance,
    warmup: template.warmup,
    strength,
    core,
    optionalCore,
    cardio: template.hasOptionalCardio ? makeCardio(phase) : undefined
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

export function getAllWorkouts(): Workout[] {
  return workouts;
}

/** Mandatory strength + core (excludes optionalCore). */
export function getMandatoryExercises(workout: Workout): Exercise[] {
  return [...workout.strength, ...workout.core];
}

/** Catalog snapshot for reporting. */
export function getV2CatalogEntries(): CatalogEntry[] {
  return Object.values(EX);
}

export function getV3CatalogEntries(): CatalogEntry[] {
  return Object.values(EX);
}
