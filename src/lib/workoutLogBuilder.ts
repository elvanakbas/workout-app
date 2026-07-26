import type {
  CardioBlock,
  Exercise,
  ExerciseLog,
  SessionFeedback,
  Workout,
  WorkoutLog,
  WorkoutLogCardioSnapshot
} from "../types";
import { visibleSetsForExercise } from "./sessionTracking";

/** Completed-log schema version written by Phase 4+ session completion. */
export const WORKOUT_LOG_SCHEMA_VERSION = 2 as const;

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
}

/** Create a Phase 4 rich, self-contained WorkoutLog from an active session. */
export function buildCompletedWorkoutLog(input: BuildCompletedWorkoutLogInput): WorkoutLog {
  const completedAt = input.completedAt ?? new Date().toISOString();
  const startedAt = input.startedAt;
  const durationSeconds = computeSessionDurationSeconds(startedAt, completedAt);
  const cardio = buildCardioSnapshot(input.workout.cardio, input.cardioCompleted);

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
    }
  };
}
