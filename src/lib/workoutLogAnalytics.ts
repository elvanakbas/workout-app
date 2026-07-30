import type {
  ExerciseLog,
  MeasurementType,
  SetLog,
  WorkoutLog,
  WorkoutVariant
} from "../types";

/** True when a set contributes to reps×kg volume. */
export function isValidRepsWeightSet(set: SetLog): boolean {
  return (
    typeof set.reps === "number" &&
    typeof set.weight === "number" &&
    Number.isFinite(set.reps) &&
    Number.isFinite(set.weight) &&
    set.reps > 0 &&
    set.weight > 0
  );
}

export function setVolumeKg(set: SetLog): number {
  if (!isValidRepsWeightSet(set)) return 0;
  return set.reps * set.weight;
}

export function resolveMeasurementType(entry: ExerciseLog): MeasurementType | undefined {
  return entry.measurementType;
}

/**
 * Total lifted volume for a log: sum(reps × kg) over reps-weight sets only.
 * Reps-only, duration, cardio, and bodyweight movements contribute 0.
 * When measurementType is missing (legacy), only sets with weight > 0 and reps > 0 count.
 */
export function totalRepsWeightVolume(log: WorkoutLog): number {
  return log.entries.reduce((sum, entry) => sum + exerciseVolume(entry), 0);
}

export function exerciseVolume(entry: ExerciseLog): number {
  const type = entry.measurementType;
  if (type && type !== "reps-weight") return 0;
  return entry.sets.reduce((sum, set) => sum + setVolumeKg(set), 0);
}

export function resolveExerciseStatus(
  entry: ExerciseLog
): "completed" | "incomplete" | "skipped" | "unknown" {
  if (entry.status === "completed" || entry.status === "incomplete" || entry.status === "skipped") {
    return entry.status;
  }
  if (entry.completed === true) return "completed";
  if (entry.completed === false) return "incomplete";
  return "unknown";
}

export function countCompletedExercises(log: WorkoutLog): number {
  return log.entries.filter((entry) => resolveExerciseStatus(entry) === "completed").length;
}

export function countSkippedOrIncompleteExercises(log: WorkoutLog): number {
  return log.entries.filter((entry) => {
    const status = resolveExerciseStatus(entry);
    return status === "skipped" || status === "incomplete";
  }).length;
}

/**
 * Count of working sets that have meaningful logged values.
 * - reps-weight / legacy: reps > 0 (weight may be 0 on legacy empty pads; still counts if reps)
 * - reps-only: reps > 0
 * - duration: durationSeconds > 0
 * Skipped exercises contribute 0.
 */
export function countCompletedWorkingSets(log: WorkoutLog): number {
  return log.entries.reduce((sum, entry) => {
    if (resolveExerciseStatus(entry) === "skipped") return sum;
    return sum + countEntryWorkingSets(entry);
  }, 0);
}

export function countEntryWorkingSets(entry: ExerciseLog): number {
  const type = entry.measurementType;
  return entry.sets.filter((set) => {
    if (type === "duration") return (set.durationSeconds ?? 0) > 0;
    if (type === "reps-only") return set.reps > 0;
    if (type === "reps-weight") return set.reps > 0;
    if (type === "cardio-duration") return false;
    // Legacy unknown type: count sets with any numeric signal.
    return set.reps > 0 || set.weight > 0 || (set.durationSeconds ?? 0) > 0;
  }).length;
}

/** Best valid reps-weight set by volume; undefined when none. */
export function bestValidSet(entry: ExerciseLog): SetLog | undefined {
  if (entry.measurementType && entry.measurementType !== "reps-weight") return undefined;
  let best: SetLog | undefined;
  let bestVolume = 0;
  for (const set of entry.sets) {
    const volume = setVolumeKg(set);
    if (volume > bestVolume) {
      bestVolume = volume;
      best = set;
    }
  }
  return best;
}

export function logHasRichSetDetail(log: WorkoutLog): boolean {
  if (log.schemaVersion === 2 || log.schemaVersion === 3) return true;
  // V2-era logs often stored sets with values but no names/measurementType.
  return log.entries.some(
    (entry) =>
      Array.isArray(entry.sets) &&
      entry.sets.some(
        (set) => set.reps > 0 || set.weight > 0 || (set.durationSeconds ?? 0) > 0 || entry.name != null
      )
  );
}

export function logHasComparableAnalytics(log: WorkoutLog): boolean {
  return (
    log.schemaVersion === 2 ||
    log.schemaVersion === 3 ||
    log.entries.some((entry) => entry.measurementType === "reps-weight")
  );
}

/**
 * Previous comparable log: same workoutId preferred, else same classification
 * (variant + length). Must be older than the reference and analytics-capable.
 */
export function findPreviousComparableLog(
  logs: WorkoutLog[],
  reference: WorkoutLog
): WorkoutLog | undefined {
  const refTime = Date.parse(reference.completedAt);
  if (!Number.isFinite(refTime)) return undefined;

  const older = logs
    .filter((log) => log.id !== reference.id && Date.parse(log.completedAt) < refTime)
    .sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt));

  const sameWorkout = older.find(
    (log) => log.workoutId === reference.workoutId && logHasComparableAnalytics(log)
  );
  if (sameWorkout) return sameWorkout;

  if (reference.variant && reference.length) {
    return older.find(
      (log) =>
        log.variant === reference.variant &&
        log.length === reference.length &&
        logHasComparableAnalytics(log)
    );
  }

  // Legacy fallback: match by order (same slot in the 32-workout cycle).
  return older.find((log) => log.order === reference.order && logHasComparableAnalytics(log));
}

export interface SessionComparison {
  previous: WorkoutLog;
  volumeDelta: number;
  completedSetsDelta: number;
  durationDeltaSeconds: number | undefined;
}

export function buildSessionComparison(
  logs: WorkoutLog[],
  reference: WorkoutLog
): SessionComparison | undefined {
  if (!logHasComparableAnalytics(reference)) return undefined;
  const previous = findPreviousComparableLog(logs, reference);
  if (!previous) return undefined;

  const durationDeltaSeconds =
    typeof reference.durationSeconds === "number" && typeof previous.durationSeconds === "number"
      ? reference.durationSeconds - previous.durationSeconds
      : undefined;

  return {
    previous,
    volumeDelta: totalRepsWeightVolume(reference) - totalRepsWeightVolume(previous),
    completedSetsDelta: countCompletedWorkingSets(reference) - countCompletedWorkingSets(previous),
    durationDeltaSeconds
  };
}

export function sessionLengthLabel(length: WorkoutLog["length"]): string | undefined {
  if (length === "short") return "Workday";
  if (length === "long") return "Off Day";
  return undefined;
}

export function focusAreaLabel(focusArea: WorkoutLog["focusArea"]): string | undefined {
  if (focusArea === "upper") return "Upper";
  if (focusArea === "lower") return "Lower";
  return undefined;
}

export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  return `${s}s`;
}

export function formatSignedDelta(value: number, suffix = ""): string {
  if (value === 0) return `0${suffix}`;
  const sign = value > 0 ? "+" : "";
  return `${sign}${value}${suffix}`;
}

/** Type guard helper for tests / UI. */
export function isWorkoutVariant(value: unknown): value is WorkoutVariant {
  return (
    value === "upper-a" || value === "lower-a" || value === "upper-b" || value === "lower-b"
  );
}
