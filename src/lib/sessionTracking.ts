import type { Exercise, ExerciseLog, MeasurementType, SetLog, Workout, WorkoutLog } from "../types";
import {
  clearActiveSessionDraft,
  createEmptyDraft,
  getActiveSessionDraft,
  listActiveSessionDraftWorkoutIds,
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
 * Rebuild entries for the full authored exercise list while preserving any
 * already-entered values (including exercises temporarily hidden by Low
 * Energy Mode, and sets beyond the LEM 2-set display cap).
 *
 * `canonicalExercises` must be the full strength+core list with original
 * (non-LEM-capped) `targetSets`. Display capping happens in the UI only.
 */
export function reconcileEntries(exercises: Exercise[], previous: ExerciseLog[]): ExerciseLog[] {
  const previousById = new Map(previous.map((entry) => [entry.exerciseId, entry]));

  const reconciled = exercises.map((exercise) => {
    const existing = previousById.get(exercise.id);
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
    // Keep any extra sets beyond targetSets (e.g. user entered 3, then LEM
    // display caps at 2, then LEM turns off - those extras stay in previous
    // until we truncate to canonical length above). When canonical length is
    // longer than prior, we pad; when shorter we already truncated.
    return {
      exerciseId: exercise.id,
      completed: existing.completed === true,
      sets
    };
  });

  // Preserve entries for exercises not in the current list (hidden optionals
  // while Low Energy Mode is on). They are restored when mode turns off.
  const keptIds = new Set(exercises.map((exercise) => exercise.id));
  const hidden = previous.filter((entry) => !keptIds.has(entry.exerciseId));
  return [...reconciled, ...hidden];
}

/**
 * Apply an entry update while retaining drafts for exercises that are not
 * currently visible (Low Energy Mode hiding optionals).
 */
export function updateEntriesPreservingHidden(
  previous: ExerciseLog[],
  visibleExercises: Exercise[],
  mutateVisible: (visibleEntries: ExerciseLog[]) => ExerciseLog[]
): ExerciseLog[] {
  const visibleIds = new Set(visibleExercises.map((exercise) => exercise.id));
  const hidden = previous.filter((entry) => !visibleIds.has(entry.exerciseId));
  const visiblePrevious = previous.filter((entry) => visibleIds.has(entry.exerciseId));
  const seededVisible = reconcileEntries(visibleExercises, visiblePrevious).filter((entry) =>
    visibleIds.has(entry.exerciseId)
  );
  const updatedVisible = mutateVisible(seededVisible);
  return [...updatedVisible, ...hidden];
}

/** Slice stored sets to the number currently displayed for an exercise. */
export function visibleSetsForExercise(entry: ExerciseLog | undefined, displayTargetSets: number): SetLog[] {
  if (!entry) return [];
  return entry.sets.slice(0, displayTargetSets);
}

/** Build WorkoutLog entries from the visible (possibly LEM-trimmed) exercise list. */
export function buildLogEntriesFromSession(
  visibleExercises: Exercise[],
  entries: ExerciseLog[]
): ExerciseLog[] {
  return visibleExercises.map((exercise) => {
    const entry = entries.find((e) => e.exerciseId === exercise.id);
    return {
      exerciseId: exercise.id,
      completed: entry?.completed === true,
      sets: visibleSetsForExercise(entry, exercise.targetSets)
    };
  });
}

/**
 * Guard used by Complete Workout to prevent duplicate logs from double-clicks
 * or repeated completion handlers in the same mount.
 */
export function createCompletionGuard(): {
  tryBegin: () => boolean;
  reset: () => void;
} {
  let locked = false;
  return {
    tryBegin: () => {
      if (locked) return false;
      locked = true;
      return true;
    },
    reset: () => {
      locked = false;
    }
  };
}

/** Round-trip helpers used by focused validation (and the session screen). */
export function draftSaveRestoreRoundTrip(
  workoutId: string,
  entries: ExerciseLog[],
  options?: { lowEnergyMode?: boolean; cardioCompleted?: boolean }
): { saved: boolean; restoredCompleted: boolean; cleared: boolean } {
  const draft = createEmptyDraft(workoutId, entries, {
    lowEnergyMode: options?.lowEnergyMode,
    cardioCompleted: options?.cardioCompleted
  });
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

/** Two workouts keep independent drafts; clearing one leaves the other. */
export function draftsRemainIndependent(
  workoutIdA: string,
  workoutIdB: string,
  entriesA: ExerciseLog[],
  entriesB: ExerciseLog[]
): { bothSaved: boolean; aPreservedAfterBClear: boolean } {
  saveActiveSessionDraft(createEmptyDraft(workoutIdA, entriesA));
  saveActiveSessionDraft(createEmptyDraft(workoutIdB, entriesB));
  const bothSaved =
    getActiveSessionDraft(workoutIdA) !== null && getActiveSessionDraft(workoutIdB) !== null;
  clearActiveSessionDraft(workoutIdB);
  const aPreservedAfterBClear =
    getActiveSessionDraft(workoutIdA) !== null && getActiveSessionDraft(workoutIdB) === null;
  clearActiveSessionDraft(workoutIdA);
  return { bothSaved, aPreservedAfterBClear };
}

/** Mark complete then reopen; completed flag must clear while sets remain. */
export function reopenCompletedExerciseRoundTrip(entry: ExerciseLog): {
  wasCompleted: boolean;
  reopened: boolean;
  setsPreserved: boolean;
} {
  const completed: ExerciseLog = { ...entry, completed: true };
  const reopened: ExerciseLog = { ...completed, completed: false };
  return {
    wasCompleted: completed.completed === true,
    reopened: reopened.completed !== true,
    setsPreserved: JSON.stringify(reopened.sets) === JSON.stringify(entry.sets)
  };
}

/**
 * Low-energy hide/show: optional exercise values must survive being absent
 * from the visible list, then reappear when reconciled against the full list.
 */
export function lowEnergyPreservesHiddenEntry(
  fullExercises: Exercise[],
  optionalExerciseId: string,
  seed: ExerciseLog[]
): boolean {
  const withoutOptional = fullExercises.filter((exercise) => exercise.id !== optionalExerciseId);
  const whileHidden = reconcileEntries(withoutOptional, seed);
  const restored = reconcileEntries(fullExercises, whileHidden);
  const original = seed.find((entry) => entry.exerciseId === optionalExerciseId);
  const after = restored.find((entry) => entry.exerciseId === optionalExerciseId);
  if (!original || !after) return false;
  return JSON.stringify(after.sets) === JSON.stringify(original.sets) && after.completed === original.completed;
}

/**
 * LEM set-cap display must not permanently delete sets beyond the cap when
 * reconciling against the full (uncapped) exercise list.
 */
export function lowEnergyPreservesExtraSets(
  exercise: Exercise,
  threeSetEntry: ExerciseLog
): boolean {
  const capped: Exercise = { ...exercise, targetSets: 2 };
  const whileCappedDisplay = reconcileEntries([exercise], [threeSetEntry]);
  // Simulate UI showing only 2 sets while draft still holds canonical length.
  const displaySlice = visibleSetsForExercise(whileCappedDisplay[0], capped.targetSets);
  const restored = reconcileEntries([exercise], whileCappedDisplay);
  return (
    displaySlice.length === 2 &&
    (restored[0]?.sets.length ?? 0) === exercise.targetSets &&
    JSON.stringify(restored[0]?.sets) === JSON.stringify(threeSetEntry.sets.slice(0, exercise.targetSets))
  );
}

export function rejectsMalformedDraft(workoutId: string): boolean {
  return normalizeActiveSessionDraft({ version: 99, workoutId, entries: "nope" }, workoutId) === null;
}

/** Append-once semantics for Complete Workout (duplicate-click safety). */
export function appendLogOnce(
  logs: WorkoutLog[],
  log: WorkoutLog,
  guard: { tryBegin: () => boolean }
): WorkoutLog[] {
  if (!guard.tryBegin()) return logs;
  return [...logs, log];
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
  showCardioCompletion: boolean;
} {
  switch (type) {
    case "reps-weight":
      return { showReps: true, showWeight: true, showDurationSeconds: false, showCardioCompletion: false };
    case "reps-only":
      return { showReps: true, showWeight: false, showDurationSeconds: false, showCardioCompletion: false };
    case "duration":
      return { showReps: false, showWeight: false, showDurationSeconds: true, showCardioCompletion: false };
    case "cardio-duration":
      return { showReps: false, showWeight: false, showDurationSeconds: false, showCardioCompletion: true };
  }
}

export { listActiveSessionDraftWorkoutIds };
