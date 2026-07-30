import type {
  CardioBlock,
  Exercise,
  ExerciseLog,
  SessionFeedback,
  Workout,
  WorkoutLog,
  WorkoutLogCardioSnapshot
} from "../types";
import { PROGRAM_VERSION } from "../types";
import { visibleSetsForExercise } from "./sessionTracking";
import { isoToLocalDateKey } from "./localDate";
import { plannedDateKeyForOrder } from "./schedule";

/** Completed-log schema version written by V3 session completion. */
export const WORKOUT_LOG_SCHEMA_VERSION = 3 as const;

/**
 * Build immutable per-exercise snapshots for a completed session.
 * Includes LEM-hidden exercises as `skipped` so history stays self-contained.
 */
export function buildRichLogEntries(
  canonicalExercises: Exercise[],
  visibleExercises: Exercise[],
  entries: ExerciseLog[]
): ExerciseLog[] {
  const visibleIds = new Set(visibleExercises.map((exercise) => exercise.id));

  return canonicalExercises.map((exercise) => {
    const entry = entries.find((e) => e.exerciseId === exercise.id);
    const skipped = !visibleIds.has(exercise.id);
    const completed = !skipped && entry?.completed === true;

    return {
      exerciseId: exercise.id,
      name: exercise.name,
      measurementType: exercise.measurementType,
      unilateral: exercise.unilateral === true ? true : undefined,
      targetUnitLabel: exercise.targetUnitLabel,
      plannedSets: exercise.targetSets,
      plannedReps: exercise.targetReps,
      visualAssetKey: exercise.visualAssetKey,
      role: exercise.role,
      optional: exercise.optional === true ? true : undefined,
      completed,
      status: skipped ? "skipped" : completed ? "completed" : "incomplete",
      sets: skipped
        ? (entry?.sets ?? []).map((set) => ({ ...set }))
        : visibleSetsForExercise(entry, exercise.targetSets).map((set) => ({ ...set }))
    };
  });
}

export function buildCardioSnapshot(
  cardio: CardioBlock | undefined,
  cardioCompleted: boolean
): WorkoutLogCardioSnapshot | undefined {
  if (!cardio) return undefined;
  return {
    measurementType: "cardio-duration",
    machine: cardio.machine,
    alternateMachine: cardio.alternateMachine,
    plannedMinutes: cardio.durationMinutes,
    completed: cardioCompleted,
    intensity: cardio.intensity
  };
}

export function computeSessionDurationSeconds(
  startedAt: string | undefined,
  completedAt: string
): number | undefined {
  if (!startedAt) return undefined;
  const start = Date.parse(startedAt);
  const end = Date.parse(completedAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return undefined;
  return Math.round((end - start) / 1000);
}

export interface BuildCompletedWorkoutLogInput {
  workout: Workout;
  canonicalExercises: Exercise[];
  visibleExercises: Exercise[];
  entries: ExerciseLog[];
  feedback: SessionFeedback;
  lowEnergyMode: boolean;
  cardioCompleted: boolean;
  startedAt?: string;
  completedAt?: string;
  id?: string;
  programStartDateKey?: string | null;
  optionalCoreSelected?: boolean;
  optionalCardioSelected?: boolean;
}

/** Create a V3 rich, self-contained WorkoutLog from an active session. */
export function buildCompletedWorkoutLog(input: BuildCompletedWorkoutLogInput): WorkoutLog {
  const completedAt = input.completedAt ?? new Date().toISOString();
  const startedAt = input.startedAt;
  const durationSeconds = computeSessionDurationSeconds(startedAt, completedAt);
  const cardio = buildCardioSnapshot(input.workout.cardio, input.cardioCompleted);
  const actualDateKey = isoToLocalDateKey(startedAt) ?? isoToLocalDateKey(completedAt) ?? undefined;
  const plannedDateKey = input.programStartDateKey
    ? plannedDateKeyForOrder(input.programStartDateKey, input.workout.order) ?? undefined
    : undefined;

  const optionalCoreSelected = input.optionalCoreSelected === true;
  const optionalCoreEntries = (input.workout.optionalCore ?? []).map((ex) => ex.id);
  const optionalCoreCompleted =
    optionalCoreSelected &&
    optionalCoreEntries.length > 0 &&
    optionalCoreEntries.every((id) => {
      const entry = input.entries.find((e) => e.exerciseId === id);
      return entry?.completed === true;
    });

  const optionalCardioSelected = input.optionalCardioSelected === true;
  const mainIds = new Set(input.canonicalExercises.filter((e) => !e.optional).map((e) => e.id));
  const mainWorkoutCompleted = [...mainIds].every((id) => {
    const entry = input.entries.find((e) => e.exerciseId === id);
    return entry?.completed === true;
  });

  return {
    id: input.id ?? `${input.workout.id}-${Date.now()}`,
    schemaVersion: WORKOUT_LOG_SCHEMA_VERSION,
    workoutId: input.workout.id,
    order: input.workout.order,
    workoutTitle: input.workout.title,
    completedAt,
    startedAt,
    durationSeconds,
    variantLabel: input.workout.variantLabel,
    variant: input.workout.variant,
    focusArea: input.workout.focusArea,
    length: input.workout.length,
    entries: buildRichLogEntries(input.canonicalExercises, input.visibleExercises, input.entries),
    cardioCompleted: input.workout.cardio ? input.cardioCompleted : undefined,
    cardio,
    lowEnergyMode: input.workout.length === "short" ? input.lowEnergyMode : undefined,
    feedback: {
      ...input.feedback,
      note: input.feedback.note?.trim() ? input.feedback.note.trim() : undefined
    },
    programVersion: PROGRAM_VERSION,
    workoutIdentity: input.workout.identity,
    preferredWeekday: input.workout.preferredWeekday,
    plannedDateKey,
    actualDateKey,
    optionalCoreSelected: input.workout.optionalCore?.length ? optionalCoreSelected : undefined,
    optionalCoreCompleted: input.workout.optionalCore?.length ? optionalCoreCompleted : undefined,
    optionalCardioSelected: input.workout.cardio ? optionalCardioSelected : undefined,
    optionalCardioCompleted: input.workout.cardio ? input.cardioCompleted : undefined,
    mainWorkoutCompleted
  };
}
