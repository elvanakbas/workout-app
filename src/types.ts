/** How an exercise's working sets are measured and logged in the session UI. */
export type MeasurementType = "reps-weight" | "reps-only" | "duration" | "cardio-duration";

/** Direct muscle groups used for weekly volume reporting and workout labels. */
export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "quadriceps"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "core";

/**
 * Stored exercise roles (stable for History / drafts).
 * User-facing labels are mapped in ROLE_DISPLAY_LABEL — do not rename these
 * values without a normalization layer.
 */
export type ExerciseRole = "primary" | "secondary" | "isolation" | "core" | "cardio";

/** Day identity within the V3 Push / Quad / Pull / Posterior week. */
export type WorkoutIdentity = "push" | "quad" | "pull" | "posterior";

export type PreferredWeekday =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

/** Authored program version string for V3 identity work. */
export const PROGRAM_VERSION = "v3-program-identity" as const;
export type ProgramVersionId = typeof PROGRAM_VERSION | "v2";

export const ROLE_DISPLAY_LABEL: Record<ExerciseRole, string> = {
  primary: "Primary Lift",
  secondary: "Secondary Lift",
  isolation: "Accessory",
  core: "Stability",
  cardio: "Cardio"
};

export const IDENTITY_DISPLAY_LABEL: Record<WorkoutIdentity, string> = {
  push: "Push",
  quad: "Quad",
  pull: "Pull",
  posterior: "Posterior"
};

export const PREFERRED_WEEKDAY_LABEL: Record<PreferredWeekday, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday"
};

export type EquipmentCategory =
  | "machine"
  | "cable"
  | "dumbbell"
  | "bodyweight"
  | "cardio-machine";

/** Upper/Lower split day identity within the weekly 4-session cycle. */
export type FocusArea = "upper" | "lower";

export type WorkoutVariant = "upper-a" | "lower-a" | "upper-b" | "lower-b";

/** A single exercise's target prescription within a workout. */
export interface Exercise {
  id: string;
  name: string;
  targetSets: number;
  /** Free-form so it can express ranges or time, e.g. "8-10", "30-45 sec", or "10-12 per side". */
  targetReps: string;
  /**
   * Explicit input model for the active-session screen. Never inferred from
   * the exercise name in the UI - always authored in program data.
   */
  measurementType: MeasurementType;
  role: ExerciseRole;
  equipmentCategory: EquipmentCategory;
  /** Muscles this prescription counts toward for direct weekly volume. */
  primaryMuscles: MuscleGroup[];
  secondaryMuscles?: MuscleGroup[];
  /** True for unilateral / per-side prescriptions (Pallof, BSS, Dead Bug, etc.). */
  unilateral?: boolean;
  /** Display label for the target unit, e.g. "per side". */
  targetUnitLabel?: string;
  restSeconds?: number;
  /** General form/coaching cue, distinct from an injury-prevention safety note. */
  notes?: string;
  /**
   * Marks an accessory exercise that low-energy mode is allowed to drop
   * entirely. Purely informational outside of that mode.
   */
  optional?: boolean;
  /** Concise injury-prevention note for lower-back/knee/shoulder-sensitive movements. */
  safetyNote?: string;
  /**
   * Stable key into the visual asset registry (`src/data/exerciseVisuals.ts`)
   * identifying which reusable image/illustration represents this movement.
   * Optional - V2 may reference planned/missing keys until the visual phase.
   */
  visualAssetKey?: string;
}

/** A warm-up item is informational (never logged), so it has no sets/weight. */
export interface WarmupItem {
  id: string;
  name: string;
  /** Free-form duration or rep count, e.g. "3 min" or "10 reps". */
  duration: string;
  safetyNote?: string;
  /** See `Exercise.visualAssetKey`. */
  visualAssetKey?: string;
}

export type CardioMachine = "elliptical" | "stationary_bike" | "rowing";

export interface CardioBlock {
  machine: CardioMachine;
  durationMinutes: number;
  intensity: string;
  /** Whether this block can be skipped without affecting the logged session. */
  optional: boolean;
  /**
   * Always "cardio-duration" for cardio blocks. Stored explicitly so the UI
   * never has to infer input fields from the machine name.
   */
  measurementType: "cardio-duration";
  role: "cardio";
  equipmentCategory: "cardio-machine";
  /** Alternate machine the user may substitute (e.g. bike instead of elliptical). */
  alternateMachine?: CardioMachine;
  safetyNote?: string;
  /** See `Exercise.visualAssetKey`. */
  visualAssetKey?: string;
}

/** "short" = Workday (~40–55 min main); "long" = Off Day (~70–95 min main before optionals). */
export type SessionLength = "short" | "long";

/** A fully authored workout in the 32-workout program. */
export interface Workout {
  id: string;
  /** 1-based position in the sequential program (1..32). */
  order: number;
  /** 1-based week number (1..8). */
  week: number;
  title: string;
  /** Short label shown on cards, e.g. "Upper A". */
  variantLabel: string;
  variant: WorkoutVariant;
  focusArea: FocusArea;
  /** V3 training identity (Push / Quad / Pull / Posterior). */
  identity: WorkoutIdentity;
  /** Preferred weekday for this variant (guides schedule; never locks). */
  preferredWeekday: PreferredWeekday;
  /**
   * Days after Week 1 Upper A (program start date) for this order.
   * Slot offsets within a week: 0, 1, 3, 5; then +7 per week.
   */
  plannedDayOffset: number;
  programVersion: typeof PROGRAM_VERSION;
  /** Training block: 1 = weeks 1-5, 2 = weeks 6-8 (phase label only in V3). */
  trainingBlock: 1 | 2;
  /** Primary muscle groups this session targets, for display. */
  primaryMuscleGroups: MuscleGroup[];
  length: SessionLength;
  estimatedDurationMinutes: { min: number; max: number };
  focus: string;
  /** Human label for this week's training phase, e.g. "Deload". */
  phaseLabel: string;
  /** Load/effort guidance for the week (reps-in-reserve, no-failure reminders, etc). */
  intensityGuidance: string;
  warmup: WarmupItem[];
  /** Mandatory strength movements (excludes optional add-ons). */
  strength: Exercise[];
  /** Mandatory stability/core in the main workout (not optional add-on). */
  core: Exercise[];
  /** Optional Core add-on (Friday/Sunday). All entries must be optional:true. */
  optionalCore?: Exercise[];
  /** Optional cardio add-on when present; must be optional:true in V3. */
  cardio?: CardioBlock;
}

/**
 * The program has a fixed length of 32 ordered slots. All 32 are authored
 * ("ready") as of the real 8-week program; the "placeholder" branch is kept
 * so the type still supports partially-authored programs in the future.
 */
export type ProgramSlot =
  | { order: number; status: "ready"; workout: Workout }
  | { order: number; status: "placeholder" };

/**
 * One logged set. Fields used depend on the exercise's `measurementType`:
 * - reps-weight: `reps` + `weight`
 * - reps-only: `reps` (weight stays 0)
 * - duration: `durationSeconds` (reps/weight stay 0)
 *
 * Older completed logs only have `reps` + `weight`; that remains valid.
 */
export interface SetLog {
  reps: number;
  weight: number;
  /** Seconds held for duration-based exercises (e.g. planks). */
  durationSeconds?: number;
}

/** Exercise outcome stored on a completed log (Phase 4+). */
export type ExerciseLogStatus = "completed" | "incomplete" | "skipped";

export interface ExerciseLog {
  exerciseId: string;
  sets: SetLog[];
  /**
   * Per-exercise completion flag used by the active-session draft.
   * Optional on completed WorkoutLog entries for backward compatibility
   * with older history that never stored this field.
   */
  completed?: boolean;
  /**
   * Phase 4 immutable snapshot fields. Present on new rich logs; absent on
   * legacy V1/V2 history. History Detail must never invent these when missing.
   */
  name?: string;
  measurementType?: MeasurementType;
  unilateral?: boolean;
  targetUnitLabel?: string;
  plannedSets?: number;
  /** Planned target string at completion, e.g. "8-12" or "30-60 sec". */
  plannedReps?: string;
  visualAssetKey?: string;
  /** Explicit status for rich logs; legacy logs may only have `completed`. */
  status?: ExerciseLogStatus;
  /** V3 snapshot of stored role (primary/secondary/isolation/core). */
  role?: ExerciseRole;
  /** V3: whether this entry was an optional add-on movement. */
  optional?: boolean;
}

export type EnergyLevel = "low" | "normal" | "high";

/** Subjective self-report captured at the end of a session. */
export interface SessionFeedback {
  /** 1 (very easy) - 10 (very hard). */
  difficulty: number;
  energy: EnergyLevel;
  /** 0 (none) - 10 (severe). */
  lowerBackPain: number;
  kneePain: number;
  shoulderPain: number;
  note?: string;
}

/** Cardio snapshot stored on Phase 4+ completed logs. */
export interface WorkoutLogCardioSnapshot {
  measurementType: "cardio-duration";
  machine: CardioMachine;
  alternateMachine?: CardioMachine;
  plannedMinutes: number;
  /**
   * Only set when the user explicitly recorded a duration. The session UI
   * currently tracks completion via checkbox, so this is often undefined;
   * never fabricate a measured value from the planned minutes alone.
   */
  actualMinutes?: number;
  completed: boolean;
  intensity?: string;
}

/**
 * Schema versions for completed WorkoutLog documents in `workout-app:v1:logs`.
 * - undefined / 1: legacy V1/V2 logs (title + entries with exerciseId/sets)
 * - 2: Phase 4 rich immutable snapshots
 * - 3: V3 program-identity snapshots (additive fields only)
 */
export type WorkoutLogSchemaVersion = 1 | 2 | 3;

/** A record of one completed workout session. */
export interface WorkoutLog {
  id: string;
  /** Rich Phase 4 logs set this to 2; V3 completions use 3. Older logs omit it or behave as 1. */
  schemaVersion?: WorkoutLogSchemaVersion;
  workoutId: string;
  order: number;
  /** Workout title frozen at completion time. */
  workoutTitle: string;
  completedAt: string; // ISO 8601 timestamp
  /** Session start (ISO). Phase 4+ only; used for duration. */
  startedAt?: string;
  /** Wall-clock session length in seconds when both timestamps are known. */
  durationSeconds?: number;
  /** Classification snapshot (Phase 4+). */
  variantLabel?: string;
  variant?: WorkoutVariant;
  focusArea?: FocusArea;
  /** "short" = Workday, "long" = Off Day. */
  length?: SessionLength;
  entries: ExerciseLog[];
  /** Whether the workout's cardio block was completed (undefined if the workout had none). */
  cardioCompleted?: boolean;
  /** Rich cardio snapshot (Phase 4+). Prefer this over `cardioCompleted` alone. */
  cardio?: WorkoutLogCardioSnapshot;
  /** Whether low-energy mode was used for this session (short workouts only). */
  lowEnergyMode?: boolean;
  /**
   * Optional so logs created before this field existed remain valid without
   * migration - this is a local-only, single-user app with no server-side
   * schema to coordinate.
   */
  feedback?: SessionFeedback;
  /**
   * Phase 4B migration provenance. Set when a record was recovered from a
   * non-canonical key; omitted for normal completions written to canonical.
   */
  historySource?: "legacy-v1" | "legacy-unknown";
  /** V3 additive snapshots — never backfilled onto old logs. */
  programVersion?: string;
  workoutIdentity?: WorkoutIdentity;
  preferredWeekday?: PreferredWeekday;
  plannedDateKey?: string;
  /** Local YYYY-MM-DD from startedAt ?? completedAt (Nutrition link source). */
  actualDateKey?: string;
  optionalCoreSelected?: boolean;
  optionalCoreCompleted?: boolean;
  optionalCardioSelected?: boolean;
  optionalCardioCompleted?: boolean;
  mainWorkoutCompleted?: boolean;
}

/**
 * In-progress session state persisted separately from completed history.
 * One draft per workout ID under `workout-app:v2:active-drafts`.
 */
export interface ActiveSessionDraft {
  /** Schema version for defensive migration of malformed/older drafts. */
  version: 1;
  workoutId: string;
  updatedAt: string;
  /** First time this draft was created; preserved across autosaves for duration. */
  startedAt?: string;
  lowEnergyMode: boolean;
  cardioCompleted: boolean;
  entries: ExerciseLog[];
  feedback: SessionFeedback;
  /** Set on V3-migrated / new drafts. */
  programVersion?: string;
  /** User expanded Optional Core add-on. */
  optionalCoreEnabled?: boolean;
  /** User expanded Optional Cardio add-on. */
  optionalCardioEnabled?: boolean;
  /**
   * Entries for exercise IDs no longer in the live workout catalog for this
   * workoutId. Preserved for recovery; excluded from active session UI.
   */
  legacyEntries?: ExerciseLog[];
}

export const PROGRAM_LENGTH = 32;

/** Display labels for muscle-group chips on workout cards/details. */
export const MUSCLE_GROUP_LABEL: Record<MuscleGroup, string> = {
  chest: "Chest",
  back: "Back",
  shoulders: "Shoulders",
  biceps: "Biceps",
  triceps: "Triceps",
  quadriceps: "Quads",
  hamstrings: "Hamstrings",
  glutes: "Glutes",
  calves: "Calves",
  core: "Core"
};
