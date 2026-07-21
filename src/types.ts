/** A single exercise's target prescription within a workout. */
export interface Exercise {
  id: string;
  name: string;
  targetSets: number;
  /** Free-form so it can express ranges or time, e.g. "8-10" or "30-45 sec". */
  targetReps: string;
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
   * Multiple exercises can share one key when they are visually identical
   * (e.g. the same movement used as both a warm-up and a working set).
   * Optional and purely presentational - no image is rendered yet.
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
  safetyNote?: string;
  /** See `Exercise.visualAssetKey`. */
  visualAssetKey?: string;
}

/** "short" = a Workday session (~30-40 min); "long" = an Off Day session (~70-90 min). */
export type SessionLength = "short" | "long";

/** A fully authored workout in the 32-workout program. */
export interface Workout {
  id: string;
  /** 1-based position in the sequential program (1..32). */
  order: number;
  /** 1-based week number (1..8). */
  week: number;
  title: string;
  length: SessionLength;
  estimatedDurationMinutes: { min: number; max: number };
  focus: string;
  /** Human label for this week's training phase, e.g. "Deload". */
  phaseLabel: string;
  /** Load/effort guidance for the week (reps-in-reserve, no-failure reminders, etc). */
  intensityGuidance: string;
  warmup: WarmupItem[];
  strength: Exercise[];
  core: Exercise[];
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

/** Weight is always recorded in kilograms. */
export interface SetLog {
  reps: number;
  weight: number;
}

export interface ExerciseLog {
  exerciseId: string;
  sets: SetLog[];
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

/** A record of one completed workout session. */
export interface WorkoutLog {
  id: string;
  workoutId: string;
  order: number;
  workoutTitle: string;
  completedAt: string; // ISO 8601 timestamp
  entries: ExerciseLog[];
  /** Whether the workout's cardio block was completed (undefined if the workout had none). */
  cardioCompleted?: boolean;
  /** Whether low-energy mode was used for this session (short workouts only). */
  lowEnergyMode?: boolean;
  /**
   * Optional so logs created before this field existed remain valid without
   * migration - this is a local-only, single-user app with no server-side
   * schema to coordinate.
   */
  feedback?: SessionFeedback;
}

export const PROGRAM_LENGTH = 32;
