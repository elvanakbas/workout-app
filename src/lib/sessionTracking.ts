import type { Exercise, ExerciseLog, MeasurementType, SetLog, Workout } from "../types";
import {
  clearActiveSessionDraft,
  createEmptyDraft,
  getActiveSessionDraft,
  normalizeActiveSessionDraft,
  saveActiveSessionDraft
} from "../storage/activeSessionDraft";

/** True when every numeric field relevant to the measurement type is empty/zero. */
export function isExerciseEntryEmpty(entry: ExerciseLog | undefined, measurementType: MeasurementType): boolean {
  if (!entry || entry.sets.length === 0) return true;
  return entry.sets.every((set) => isSetEmpty(set, measurementType));
}

export function isSetEmpty(set: SetLog, measurementType: MeasurementType): boolean {
  switch (measurementType) {
    case "duration":
      return !(set.durationSeconds && set.durationSeconds > 0);
    case "reps-only":
      return !(set.reps > 0);
    case "reps-weight":
      return !(set.reps > 0 || set.weight > 0);
    case "cardio-duration":
      return true;
    default:
      return !(set.reps > 0 || set.weight > 0);
  }
}

export function buildEmptySets(targetSets: number, measurementType: MeasurementType): SetLog[] {
  return Array.from({ length: targetSets }, () => emptySet(measurementType));
}

export function emptySet(measurementType: MeasurementType): SetLog {
  if (measurementType === "duration") {
    return { reps: 0, weight: 0, durationSeconds: 0 };
  }
  return { reps: 0, weight: 0 };
}

export function buildInitialEntries(exercises: Exercise[]): ExerciseLog[] {
  return exercises.map((exercise) => ({
    exerciseId: exercise.id,
    completed: false,
    sets: buildEmptySets(exercise.targetSets, exercise.measurementType)
  }));
}

/**
 * When low-energy mode toggles, rebuild the entry list for the new exercise
 * set while preserving any already-entered values for exercises that remain.
 */
export function reconcileEntries(exercises: Exercise[], previous: ExerciseLog[]): ExerciseLog[] {
  return exercises.map((exercise) => {
    const existing = previous.find((entry) => entry.exerciseId === exercise.id);
    if (!existing) {
      return {
        exerciseId: exercise.id,
        completed: false,
        sets: buildEmptySets(exercise.targetSets, exercise.measurementType)
      };
    }
    const sets = Array.from({ length: exercise.targetSets }, (_, index) => {
      const prior = existing.sets[index];
      if (!prior) return emptySet(exercise.measurementType);
      return {
        reps: prior.reps ?? 0,
        weight: prior.weight ?? 0,
        durationSeconds:
          exercise.measurementType === "duration" ? (prior.durationSeconds ?? 0) : prior.durationSeconds
      };
    });
    return {
      exerciseId: exercise.id,
      completed: existing.completed === true,
      sets
    };
  });
}

/** Round-trip helpers used by focused validation (and the session screen). */
export function draftSaveRestoreRoundTrip(
  workoutId: string,
  entries: ExerciseLog[],
  options?: { lowEnergyMode?: boolean; cardioCompleted?: boolean }
): { saved: boolean; restoredCompleted: boolean; cleared: boolean } {
  const draft = createEmptyDraft(workoutId, entries, { lowEnergyMode: options?.lowEnergyMode });
  draft.cardioCompleted = options?.cardioCompleted === true;
  if (entries[0]) {
    draft.entries = entries.map((entry, index) =>
      index === 0 ? { ...entry, completed: true } : entry
    );
  }
  saveActiveSessionDraft(draft);
  const restored = getActiveSessionDraft(workoutId);
  const restoredCompleted = restored?.entries.some((entry) => entry.completed) === true;
  clearActiveSessionDraft(workoutId);
  const afterClear = getActiveSessionDraft(workoutId);
  return {
    saved: restored !== null && restored.workoutId === workoutId,
    restoredCompleted,
    cleared: afterClear === null
  };
}

export function rejectsMalformedDraft(workoutId: string): boolean {
  return normalizeActiveSessionDraft({ version: 99, workoutId, entries: "nope" }, workoutId) === null;
}

/** Confirms Pallof Press replaced Machine Ab Crunch everywhere in program data. */
export function validatePallofReplacement(workouts: Workout[]): {
  pallofWorkoutCount: number;
  machineAbCrunchReferences: number;
  ok: boolean;
} {
  let pallofWorkoutCount = 0;
  let machineAbCrunchReferences = 0;
  for (const workout of workouts) {
    const movements = [...workout.strength, ...workout.core, ...workout.warmup];
    if (movements.some((m) => m.id === "pallof-press" || m.visualAssetKey === "pallof-press")) {
      pallofWorkoutCount += 1;
    }
    for (const m of movements) {
      if (m.id === "machine-ab-crunch" || m.visualAssetKey === "machine-ab-crunch") {
        machineAbCrunchReferences += 1;
      }
      if ("name" in m && typeof m.name === "string" && /machine ab crunch/i.test(m.name)) {
        machineAbCrunchReferences += 1;
      }
    }
  }
  return {
    pallofWorkoutCount,
    machineAbCrunchReferences,
    ok: pallofWorkoutCount === 8 && machineAbCrunchReferences === 0
  };
}

export function measurementFieldsFor(type: MeasurementType): {
  showReps: boolean;
  showWeight: boolean;
  showDurationSeconds: boolean;
} {
  switch (type) {
    case "reps-weight":
      return { showReps: true, showWeight: true, showDurationSeconds: false };
    case "reps-only":
      return { showReps: true, showWeight: false, showDurationSeconds: false };
    case "duration":
      return { showReps: false, showWeight: false, showDurationSeconds: true };
    case "cardio-duration":
      return { showReps: false, showWeight: false, showDurationSeconds: false };
  }
}
