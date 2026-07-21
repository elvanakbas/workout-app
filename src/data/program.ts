import {
  PROGRAM_LENGTH,
  type CardioBlock,
  type CardioMachine,
  type Exercise,
  type ProgramSlot,
  type WarmupItem,
  type Workout
} from "../types";

/**
 * Real 8-week / 32-workout program for one user, built from a small,
 * reusable catalog of joint-friendly, machine/cable-based movements. Every
 * exercise `id` below is stable across the weeks it recurs in, so weight
 * history (see `src/lib/history.ts`) tracks progression on that exact
 * movement over time rather than resetting each week.
 *
 * Health constraints honored throughout: no conventional barbell deadlifts,
 * no bent-over rows, no heavy overhead pressing, no mandatory lunges, no
 * deep free-weight squats. Lower body work uses leg press/leg curl/leg
 * extension/hip thrust or glute bridge; pulling uses chest-supported rows,
 * seated cable rows, and lat pulldowns; pressing uses supported machines;
 * cardio is limited to elliptical, stationary bike, or rowing (no running).
 */

// ---------------------------------------------------------------------------
// Exercise catalog (stable ids)
// ---------------------------------------------------------------------------

// `visualAssetKey` is required (not optional) on every catalog entry so a
// missing mapping is caught at compile time rather than discovered later by
// the runtime validator in `src/lib/visualAssetValidation.ts`. Several
// entries share a key with another entry/warm-up/cardio block on purpose -
// see `src/data/exerciseVisuals.ts` for the full reuse mapping.
type CatalogEntry = Pick<Exercise, "id" | "name"> & {
  safetyNote?: string;
  notes?: string;
  visualAssetKey: string;
};

const STRENGTH: Record<string, CatalogEntry> = {
  chestPress: {
    id: "chest-press-machine",
    name: "Chest Press Machine",
    safetyNote: "Shoulder-sensitive: keep shoulder blades back and down; don't drop elbows below shoulder height.",
    visualAssetKey: "chest-press-machine"
  },
  legPress: {
    id: "leg-press",
    name: "Leg Press",
    safetyNote: "Knee-sensitive: use a moderate range of motion and avoid locking the knees out hard at the top.",
    visualAssetKey: "leg-press"
  },
  seatedCableRow: {
    id: "seated-cable-row",
    name: "Seated Cable Row",
    safetyNote: "Shoulder-sensitive: lead with the elbows and avoid shrugging the shoulders up.",
    visualAssetKey: "seated-cable-row"
  },
  legCurl: {
    id: "leg-curl-machine",
    name: "Seated Leg Curl (Machine)",
    notes: "If a seated leg curl machine isn't available, a lying leg curl machine works the same muscles.",
    visualAssetKey: "seated-leg-curl"
  },
  latPulldown: {
    id: "lat-pulldown",
    name: "Lat Pulldown (Cable)",
    safetyNote: "Shoulder-sensitive: control the negative and avoid letting the shoulders shrug at the top.",
    visualAssetKey: "lat-pulldown"
  },
  hipThrust: {
    id: "hip-thrust-glute-bridge",
    name: "Hip Thrust Machine (Pad-Supported)",
    notes: "If a hip thrust machine isn't available, substitute a pad-supported glute bridge using the same setup.",
    safetyNote: "Lower-back-sensitive: keep ribs down and avoid overarching the lower back at the top.",
    visualAssetKey: "hip-thrust-machine"
  },
  chestSupportedRow: {
    id: "chest-supported-row",
    name: "Chest-Supported Row (Machine)",
    safetyNote: "Shoulder-sensitive: keep the chest on the pad and avoid jerking the weight.",
    visualAssetKey: "chest-supported-row"
  },
  legExtension: {
    id: "leg-extension-machine",
    name: "Leg Extension (Machine)",
    safetyNote: "Knee-sensitive: avoid a hard, heavy lockout at the top of the movement.",
    visualAssetKey: "leg-extension-machine"
  },
  cableLateralRaise: {
    id: "cable-lateral-raise",
    name: "Cable Lateral Raise (Light-Moderate)",
    safetyNote: "Shoulder-sensitive: use light weight and a controlled tempo; avoid shrugging.",
    visualAssetKey: "cable-lateral-raise"
  },
  seatedCalfRaise: {
    id: "seated-calf-raise-machine",
    name: "Seated Calf Raise (Machine)",
    visualAssetKey: "seated-calf-raise-machine"
  },
  cableFacePull: {
    id: "cable-face-pull",
    name: "Cable Face Pull (Light)",
    safetyNote: "Good for shoulder health: keep the load light and pull toward eye level with control.",
    visualAssetKey: "cable-face-pull"
  },
  hipAbduction: {
    id: "hip-abduction-machine",
    name: "Seated Hip Abduction Machine",
    notes: "If unavailable, a standing cable hip abduction is an equivalent substitute.",
    visualAssetKey: "seated-hip-abduction-machine"
  }
};

const CORE: Record<string, CatalogEntry> = {
  deadBug: {
    id: "dead-bug",
    name: "Dead Bug",
    safetyNote: "Lower-back-sensitive: keep the low back gently pressed down throughout and move slowly.",
    visualAssetKey: "dead-bug"
  },
  cableCrunch: {
    id: "cable-crunch-kneeling",
    name: "Cable Crunch (Kneeling)",
    safetyNote: "Lower-back-sensitive: control the movement and avoid yanking with a heavy load.",
    visualAssetKey: "cable-crunch-kneeling"
  },
  sidePlank: {
    id: "side-plank",
    name: "Side Plank",
    notes: "Beginner modification: bend the knees and support on the forearm and knee instead of the feet.",
    safetyNote: "Shoulder-sensitive: stack the shoulders and don't sink into the supporting shoulder.",
    visualAssetKey: "side-plank"
  },
  birdDog: {
    id: "bird-dog",
    name: "Bird Dog",
    safetyNote: "Lower-back-sensitive: move slowly and keep the hips level; don't arch the low back.",
    visualAssetKey: "bird-dog"
  },
  woodchopper: {
    id: "standing-cable-woodchopper",
    name: "Standing Cable Woodchopper (Moderate Load)",
    safetyNote: "Lower-back-sensitive: rotate through the torso; don't yank the load with the lower back.",
    visualAssetKey: "standing-cable-woodchopper"
  },
  machineAbCrunch: {
    id: "machine-ab-crunch",
    name: "Machine Ab Crunch (Controlled)",
    safetyNote: "Lower-back-sensitive: avoid using momentum; control the full range of motion.",
    visualAssetKey: "machine-ab-crunch"
  },
  forearmPlank: {
    id: "forearm-plank",
    name: "Forearm Plank",
    notes: "Beginner modification: lower the knees to the ground while keeping the torso straight.",
    safetyNote: "Lower-back-sensitive: keep a neutral spine; don't let the hips sag or pike up.",
    visualAssetKey: "forearm-plank"
  }
};

const CARDIO_LABEL: Record<CardioMachine, string> = {
  elliptical: "Elliptical",
  stationary_bike: "Stationary Bike",
  rowing: "Rowing Machine"
};

/** Shared with the corresponding warm-up cardio items so both reuse one visual asset. */
const CARDIO_VISUAL_KEY: Record<CardioMachine, string> = {
  elliptical: "elliptical",
  stationary_bike: "stationary-bike",
  rowing: "rowing-machine"
};

// ---------------------------------------------------------------------------
// Weekly phase configuration (progression across the 8-week program)
// ---------------------------------------------------------------------------

interface PhaseConfig {
  label: string;
  guidance: string;
  strengthSets: number;
  strengthReps: string;
  strengthRestSeconds: number;
  coreSets: number;
  coreReps: string;
  coreRestSeconds: number;
  cardioShortMinutes: number;
  cardioLongMinutes: number;
  cardioIntensity: string;
}

const PHASE_BY_WEEK: Record<number, PhaseConfig> = {
  1: {
    label: "Technique & Base Volume",
    guidance: "Focus on clean technique and full control on every rep. Stop well short of failure - keep 3+ reps in reserve.",
    strengthSets: 2,
    strengthReps: "12-15",
    strengthRestSeconds: 60,
    coreSets: 2,
    coreReps: "30-45 sec / 12-15 reps",
    coreRestSeconds: 30,
    cardioShortMinutes: 8,
    cardioLongMinutes: 15,
    cardioIntensity: "Easy, conversational pace."
  },
  2: {
    label: "Technique & Base Volume",
    guidance: "Same technique focus as week 1, with one extra set per exercise. Keep 3+ reps in reserve.",
    strengthSets: 3,
    strengthReps: "12-15",
    strengthRestSeconds: 60,
    coreSets: 2,
    coreReps: "30-45 sec / 12-15 reps",
    coreRestSeconds: 30,
    cardioShortMinutes: 8,
    cardioLongMinutes: 15,
    cardioIntensity: "Easy, conversational pace."
  },
  3: {
    label: "Controlled Load Progression",
    guidance: "Add a small amount of resistance versus weeks 1-2. Leave 2-3 reps in reserve.",
    strengthSets: 3,
    strengthReps: "10-12",
    strengthRestSeconds: 90,
    coreSets: 3,
    coreReps: "30-45 sec / 12-15 reps",
    coreRestSeconds: 45,
    cardioShortMinutes: 10,
    cardioLongMinutes: 18,
    cardioIntensity: "Moderate, steady pace - not maximal effort."
  },
  4: {
    label: "Controlled Load Progression",
    guidance: "Slightly heavier or fewer reps than week 3. Leave 2-3 reps in reserve.",
    strengthSets: 3,
    strengthReps: "8-10",
    strengthRestSeconds: 90,
    coreSets: 3,
    coreReps: "30-45 sec / 15 reps",
    coreRestSeconds: 45,
    cardioShortMinutes: 10,
    cardioLongMinutes: 18,
    cardioIntensity: "Moderate, steady pace - not maximal effort."
  },
  5: {
    label: "Deload",
    guidance: "Deload week: load and volume are reduced on purpose. This is planned recovery, not a test - keep 3-4 reps in reserve.",
    strengthSets: 2,
    strengthReps: "12-15",
    strengthRestSeconds: 60,
    coreSets: 2,
    coreReps: "30 sec / 12 reps",
    coreRestSeconds: 30,
    cardioShortMinutes: 5,
    cardioLongMinutes: 10,
    cardioIntensity: "Easy pace only - this is a recovery week."
  },
  6: {
    label: "Second Progression Block",
    guidance: "Resume progression from week 4's working load. Leave 2-3 reps in reserve.",
    strengthSets: 3,
    strengthReps: "8-10",
    strengthRestSeconds: 90,
    coreSets: 3,
    coreReps: "30-45 sec / 15 reps",
    coreRestSeconds: 45,
    cardioShortMinutes: 10,
    cardioLongMinutes: 20,
    cardioIntensity: "Moderate, steady pace - not maximal effort."
  },
  7: {
    label: "Second Progression Block",
    guidance: "Slightly heavier, lower-rep work. Leave 1-3 reps in reserve - do not chase failure.",
    strengthSets: 4,
    strengthReps: "6-8",
    strengthRestSeconds: 105,
    coreSets: 3,
    coreReps: "40-45 sec / 15-20 reps",
    coreRestSeconds: 45,
    cardioShortMinutes: 12,
    cardioLongMinutes: 20,
    cardioIntensity: "Moderate, steady pace - not maximal effort."
  },
  8: {
    label: "Controlled Final Week",
    guidance: "Controlled final week: moderate load only, no maximal or failure attempts.",
    strengthSets: 3,
    strengthReps: "10-12",
    strengthRestSeconds: 60,
    coreSets: 2,
    coreReps: "30-45 sec / 12-15 reps",
    coreRestSeconds: 30,
    cardioShortMinutes: 8,
    cardioLongMinutes: 15,
    cardioIntensity: "Easy-to-moderate pace."
  }
};

// ---------------------------------------------------------------------------
// Weekly session templates
// ---------------------------------------------------------------------------

type Variant = "workdayA" | "workdayB" | "offDayA" | "offDayB";

function buildExercise(
  entry: CatalogEntry,
  phase: PhaseConfig,
  kind: "strength" | "core",
  optional: boolean
): Exercise {
  const sets = kind === "strength" ? phase.strengthSets : phase.coreSets;
  const reps = kind === "strength" ? phase.strengthReps : phase.coreReps;
  const rest = kind === "strength" ? phase.strengthRestSeconds : phase.coreRestSeconds;
  return {
    id: entry.id,
    name: entry.name,
    targetSets: sets,
    targetReps: reps,
    restSeconds: rest,
    optional,
    notes: entry.notes,
    safetyNote: entry.safetyNote,
    visualAssetKey: entry.visualAssetKey
  };
}

function warmupItem(
  id: string,
  name: string,
  duration: string,
  options: { safetyNote?: string; visualAssetKey: string }
): WarmupItem {
  return { id, name, duration, safetyNote: options.safetyNote, visualAssetKey: options.visualAssetKey };
}

function cardioBlock(machine: CardioMachine, phase: PhaseConfig, isShort: boolean): CardioBlock {
  return {
    machine,
    durationMinutes: isShort ? phase.cardioShortMinutes : phase.cardioLongMinutes,
    intensity: phase.cardioIntensity,
    optional: isShort,
    safetyNote:
      machine === "rowing"
        ? "Lower-back and shoulder-sensitive: sit tall and drive the movement from the legs first; avoid rounding the lower back at the catch."
        : undefined,
    visualAssetKey: CARDIO_VISUAL_KEY[machine]
  };
}

function buildWorkout(order: number, week: number, variant: Variant): Workout {
  const phase = PHASE_BY_WEEK[week];
  const isShort = variant === "workdayA" || variant === "workdayB";

  const base: Omit<
    Workout,
    "id" | "order" | "week" | "phaseLabel" | "intensityGuidance" | "estimatedDurationMinutes" | "length"
  > = (() => {
    switch (variant) {
      case "workdayA":
        return {
          title: "Workday A - Push & Legs",
          focus: "Upper-body push plus supported lower-body work.",
          warmup: [
            warmupItem("warmup-bike-easy", `Easy ${CARDIO_LABEL.stationary_bike} Warm-Up`, "3 min", {
              visualAssetKey: "stationary-bike"
            }),
            warmupItem("warmup-arm-circles", "Arm Circles", "10 each direction", { visualAssetKey: "arm-circles" }),
            warmupItem("warmup-glute-bridge", "Glute Bridge Activation", "10 reps", {
              visualAssetKey: "glute-bridge-activation"
            })
          ],
          strength: [
            buildExercise(STRENGTH.chestPress, phase, "strength", false),
            buildExercise(STRENGTH.legPress, phase, "strength", false),
            buildExercise(STRENGTH.seatedCableRow, phase, "strength", false),
            buildExercise(STRENGTH.legCurl, phase, "strength", true)
          ],
          core: [
            buildExercise(CORE.deadBug, phase, "core", false),
            buildExercise(CORE.cableCrunch, phase, "core", true)
          ],
          cardio: cardioBlock("stationary_bike", phase, isShort)
        };
      case "workdayB":
        return {
          title: "Workday B - Pull & Glutes",
          focus: "Upper-body pull plus glute-focused lower-body work.",
          warmup: [
            warmupItem("warmup-elliptical-easy", `Easy ${CARDIO_LABEL.elliptical} Warm-Up`, "3 min", {
              visualAssetKey: "elliptical"
            }),
            warmupItem("warmup-band-pull-apart", "Band Pull-Aparts", "12 reps", {
              visualAssetKey: "band-pull-apart"
            }),
            warmupItem("warmup-glute-bridge", "Glute Bridge Activation", "10 reps", {
              visualAssetKey: "glute-bridge-activation"
            })
          ],
          strength: [
            buildExercise(STRENGTH.latPulldown, phase, "strength", false),
            buildExercise(STRENGTH.hipThrust, phase, "strength", false),
            buildExercise(STRENGTH.chestSupportedRow, phase, "strength", false),
            buildExercise(STRENGTH.legExtension, phase, "strength", true)
          ],
          core: [
            buildExercise(CORE.sidePlank, phase, "core", false),
            buildExercise(CORE.birdDog, phase, "core", true)
          ],
          cardio: cardioBlock("elliptical", phase, isShort)
        };
      case "offDayA":
        return {
          title: "Off Day A - Lower Body & Push",
          focus: "Lower-body emphasis with upper-body push accessory work.",
          warmup: [
            warmupItem("warmup-elliptical-easy-long", `Easy ${CARDIO_LABEL.elliptical} Warm-Up`, "5 min", {
              visualAssetKey: "elliptical"
            }),
            warmupItem("warmup-leg-swings", "Leg Swings (Controlled, Holding Support)", "10 each leg", {
              safetyNote: "Knee-sensitive: keep the swing controlled and low; avoid high or forceful kicks.",
              visualAssetKey: "leg-swings"
            }),
            warmupItem("warmup-glute-bridge-long", "Glute Bridge Activation", "12 reps", {
              visualAssetKey: "glute-bridge-activation"
            }),
            warmupItem("warmup-band-pull-apart-long", "Band Pull-Aparts", "12 reps", {
              visualAssetKey: "band-pull-apart"
            })
          ],
          strength: [
            buildExercise(STRENGTH.legPress, phase, "strength", false),
            buildExercise(STRENGTH.legCurl, phase, "strength", false),
            buildExercise(STRENGTH.hipThrust, phase, "strength", false),
            buildExercise(STRENGTH.chestPress, phase, "strength", false),
            buildExercise(STRENGTH.cableLateralRaise, phase, "strength", true),
            buildExercise(STRENGTH.seatedCalfRaise, phase, "strength", true)
          ],
          core: [
            buildExercise(CORE.cableCrunch, phase, "core", false),
            buildExercise(CORE.forearmPlank, phase, "core", false),
            buildExercise(CORE.woodchopper, phase, "core", true)
          ],
          cardio: cardioBlock("rowing", phase, isShort)
        };
      case "offDayB":
        return {
          title: "Off Day B - Upper Pull & Glutes/Core",
          focus: "Upper-body pull emphasis with glute and core work.",
          warmup: [
            warmupItem("warmup-bike-easy-long", `Easy ${CARDIO_LABEL.stationary_bike} Warm-Up`, "5 min", {
              visualAssetKey: "stationary-bike"
            }),
            warmupItem("warmup-cat-cow", "Cat-Cow", "8 reps", {
              safetyNote: "Lower-back-sensitive: move slowly through a comfortable range; don't force the stretch.",
              visualAssetKey: "cat-cow"
            }),
            warmupItem("warmup-glute-bridge-long2", "Glute Bridge Activation", "12 reps", {
              visualAssetKey: "glute-bridge-activation"
            }),
            warmupItem("warmup-face-pull-light", "Cable Face Pull (Light)", "12 reps", {
              visualAssetKey: "cable-face-pull"
            })
          ],
          strength: [
            buildExercise(STRENGTH.chestSupportedRow, phase, "strength", false),
            buildExercise(STRENGTH.latPulldown, phase, "strength", false),
            buildExercise(STRENGTH.hipThrust, phase, "strength", false),
            buildExercise(STRENGTH.legCurl, phase, "strength", false),
            buildExercise(STRENGTH.cableFacePull, phase, "strength", true),
            buildExercise(STRENGTH.hipAbduction, phase, "strength", true)
          ],
          core: [
            buildExercise(CORE.deadBug, phase, "core", false),
            buildExercise(CORE.sidePlank, phase, "core", false),
            buildExercise(CORE.machineAbCrunch, phase, "core", true)
          ],
          cardio: cardioBlock("elliptical", phase, isShort)
        };
    }
  })();

  return {
    id: `w${order}`,
    order,
    week,
    length: isShort ? "short" : "long",
    estimatedDurationMinutes: isShort ? { min: 30, max: 40 } : { min: 70, max: 90 },
    phaseLabel: phase.label,
    intensityGuidance: phase.guidance,
    ...base
  };
}

const VARIANT_SEQUENCE: Variant[] = ["workdayA", "offDayA", "workdayB", "offDayB"];

function buildAllWorkouts(): Workout[] {
  return Array.from({ length: PROGRAM_LENGTH }, (_, index) => {
    const order = index + 1;
    const week = Math.floor(index / 4) + 1;
    const variant = VARIANT_SEQUENCE[index % 4];
    return buildWorkout(order, week, variant);
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
