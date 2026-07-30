import type {
  ExerciseLog,
  ExerciseRole,
  MeasurementType,
  PreferredWeekday,
  SessionFeedback,
  SetLog,
  WorkoutIdentity,
  WorkoutLog,
  WorkoutLogSchemaVersion
} from "../types";

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function asFiniteNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeSet(raw: unknown): SetLog | null {
  if (!isObject(raw)) return null;
  const set: SetLog = {
    reps: asFiniteNumber(raw.reps, 0),
    weight: asFiniteNumber(raw.weight, 0)
  };
  if (typeof raw.durationSeconds === "number" && Number.isFinite(raw.durationSeconds)) {
    set.durationSeconds = raw.durationSeconds;
  }
  return set;
}

function normalizeMeasurementType(value: unknown): MeasurementType | undefined {
  if (
    value === "reps-weight" ||
    value === "reps-only" ||
    value === "duration" ||
    value === "cardio-duration"
  ) {
    return value;
  }
  return undefined;
}

function normalizeRole(value: unknown): ExerciseRole | undefined {
  if (
    value === "primary" ||
    value === "secondary" ||
    value === "isolation" ||
    value === "core" ||
    value === "cardio"
  ) {
    return value;
  }
  return undefined;
}

function normalizeIdentity(value: unknown): WorkoutIdentity | undefined {
  if (value === "push" || value === "quad" || value === "pull" || value === "posterior") {
    return value;
  }
  return undefined;
}

function normalizeWeekday(value: unknown): PreferredWeekday | undefined {
  if (
    value === "monday" ||
    value === "tuesday" ||
    value === "wednesday" ||
    value === "thursday" ||
    value === "friday" ||
    value === "saturday" ||
    value === "sunday"
  ) {
    return value;
  }
  return undefined;
}

function normalizeEntry(raw: unknown): ExerciseLog | null {
  if (!isObject(raw)) return null;
  if (typeof raw.exerciseId !== "string" || !raw.exerciseId) return null;
  if (!Array.isArray(raw.sets)) return null;

  const sets = raw.sets.map(normalizeSet).filter((set): set is SetLog => set !== null);

  const entry: ExerciseLog = {
    exerciseId: raw.exerciseId,
    sets
  };

  if (raw.completed === true) entry.completed = true;
  if (raw.completed === false) entry.completed = false;
  if (typeof raw.name === "string") entry.name = raw.name;
  const measurementType = normalizeMeasurementType(raw.measurementType);
  if (measurementType) entry.measurementType = measurementType;
  if (raw.unilateral === true) entry.unilateral = true;
  if (typeof raw.targetUnitLabel === "string") entry.targetUnitLabel = raw.targetUnitLabel;
  if (typeof raw.plannedSets === "number" && Number.isFinite(raw.plannedSets)) {
    entry.plannedSets = raw.plannedSets;
  }
  if (typeof raw.plannedReps === "string") entry.plannedReps = raw.plannedReps;
  if (typeof raw.visualAssetKey === "string") entry.visualAssetKey = raw.visualAssetKey;
  if (raw.status === "completed" || raw.status === "incomplete" || raw.status === "skipped") {
    entry.status = raw.status;
  }
  const role = normalizeRole(raw.role);
  if (role) entry.role = role;
  if (raw.optional === true) entry.optional = true;
  if (raw.optional === false) entry.optional = false;

  return entry;
}

function normalizeFeedback(raw: unknown): SessionFeedback | undefined {
  if (!isObject(raw)) return undefined;
  const energy =
    raw.energy === "low" || raw.energy === "normal" || raw.energy === "high" ? raw.energy : "normal";
  return {
    difficulty: Math.min(10, Math.max(1, asFiniteNumber(raw.difficulty, 5))),
    energy,
    lowerBackPain: Math.min(10, Math.max(0, asFiniteNumber(raw.lowerBackPain, 0))),
    kneePain: Math.min(10, Math.max(0, asFiniteNumber(raw.kneePain, 0))),
    shoulderPain: Math.min(10, Math.max(0, asFiniteNumber(raw.shoulderPain, 0))),
    note: typeof raw.note === "string" && raw.note.trim() ? raw.note : undefined
  };
}

function normalizeCardio(raw: unknown): WorkoutLog["cardio"] {
  if (!isObject(raw)) return undefined;
  if (raw.measurementType !== "cardio-duration") return undefined;
  if (raw.machine !== "elliptical" && raw.machine !== "stationary_bike" && raw.machine !== "rowing") {
    return undefined;
  }
  const plannedMinutes = asFiniteNumber(raw.plannedMinutes, NaN);
  if (!Number.isFinite(plannedMinutes)) return undefined;

  const cardio: NonNullable<WorkoutLog["cardio"]> = {
    measurementType: "cardio-duration",
    machine: raw.machine,
    plannedMinutes,
    completed: raw.completed === true
  };
  if (raw.alternateMachine === "elliptical" || raw.alternateMachine === "stationary_bike" || raw.alternateMachine === "rowing") {
    cardio.alternateMachine = raw.alternateMachine;
  }
  if (typeof raw.actualMinutes === "number" && Number.isFinite(raw.actualMinutes)) {
    cardio.actualMinutes = raw.actualMinutes;
  }
  if (typeof raw.intensity === "string") cardio.intensity = raw.intensity;
  return cardio;
}

function normalizeSchemaVersion(value: unknown): WorkoutLogSchemaVersion | undefined {
  if (value === 3 || value === 2 || value === 1) return value;
  return undefined;
}

/**
 * Defensively normalize one history log. Returns null for unusable documents
 * without mutating storage — callers skip nulls and keep sibling logs.
 * V3 additive fields are preserved; V1/V2 logs are never upgraded to schema 3.
 */
export function normalizeWorkoutLog(raw: unknown): WorkoutLog | null {
  if (!isObject(raw)) return null;
  if (typeof raw.id !== "string" || !raw.id) return null;
  if (typeof raw.workoutId !== "string" || !raw.workoutId) return null;
  if (typeof raw.workoutTitle !== "string") return null;
  if (typeof raw.completedAt !== "string" || !raw.completedAt) return null;
  if (!Array.isArray(raw.entries)) return null;

  const order = asFiniteNumber(raw.order, NaN);
  if (!Number.isFinite(order)) return null;

  const entries = raw.entries.map(normalizeEntry).filter((entry): entry is ExerciseLog => entry !== null);

  const schemaVersion = normalizeSchemaVersion(raw.schemaVersion);

  const log: WorkoutLog = {
    id: raw.id,
    workoutId: raw.workoutId,
    order,
    workoutTitle: raw.workoutTitle,
    completedAt: raw.completedAt,
    entries
  };

  if (schemaVersion) log.schemaVersion = schemaVersion;
  if (typeof raw.startedAt === "string") log.startedAt = raw.startedAt;
  if (typeof raw.durationSeconds === "number" && Number.isFinite(raw.durationSeconds)) {
    log.durationSeconds = raw.durationSeconds;
  }
  if (typeof raw.variantLabel === "string") log.variantLabel = raw.variantLabel;
  if (
    raw.variant === "upper-a" ||
    raw.variant === "lower-a" ||
    raw.variant === "upper-b" ||
    raw.variant === "lower-b"
  ) {
    log.variant = raw.variant;
  }
  if (raw.focusArea === "upper" || raw.focusArea === "lower") log.focusArea = raw.focusArea;
  if (raw.length === "short" || raw.length === "long") log.length = raw.length;
  if (raw.cardioCompleted === true) log.cardioCompleted = true;
  if (raw.cardioCompleted === false) log.cardioCompleted = false;
  if (raw.lowEnergyMode === true) log.lowEnergyMode = true;

  const feedback = normalizeFeedback(raw.feedback);
  if (feedback) log.feedback = feedback;

  const cardio = normalizeCardio(raw.cardio);
  if (cardio) log.cardio = cardio;

  if (raw.historySource === "legacy-v1" || raw.historySource === "legacy-unknown") {
    log.historySource = raw.historySource;
  }

  // V3 additive snapshots — only when present; never fabricated for old logs.
  if (typeof raw.programVersion === "string" && raw.programVersion.trim()) {
    log.programVersion = raw.programVersion;
  }
  const identity = normalizeIdentity(raw.workoutIdentity);
  if (identity) log.workoutIdentity = identity;
  const weekday = normalizeWeekday(raw.preferredWeekday);
  if (weekday) log.preferredWeekday = weekday;
  if (typeof raw.plannedDateKey === "string" && raw.plannedDateKey) {
    log.plannedDateKey = raw.plannedDateKey;
  }
  if (typeof raw.actualDateKey === "string" && raw.actualDateKey) {
    log.actualDateKey = raw.actualDateKey;
  }
  if (raw.optionalCoreSelected === true) log.optionalCoreSelected = true;
  if (raw.optionalCoreSelected === false) log.optionalCoreSelected = false;
  if (raw.optionalCoreCompleted === true) log.optionalCoreCompleted = true;
  if (raw.optionalCoreCompleted === false) log.optionalCoreCompleted = false;
  if (raw.optionalCardioSelected === true) log.optionalCardioSelected = true;
  if (raw.optionalCardioSelected === false) log.optionalCardioSelected = false;
  if (raw.optionalCardioCompleted === true) log.optionalCardioCompleted = true;
  if (raw.optionalCardioCompleted === false) log.optionalCardioCompleted = false;
  if (raw.mainWorkoutCompleted === true) log.mainWorkoutCompleted = true;
  if (raw.mainWorkoutCompleted === false) log.mainWorkoutCompleted = false;

  return log;
}

/** Normalize an array of mixed history documents; drop only unusable ones. */
export function normalizeWorkoutLogs(raw: unknown): WorkoutLog[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeWorkoutLog).filter((log): log is WorkoutLog => log !== null);
}

export function findLogById(logs: WorkoutLog[], logId: string): WorkoutLog | undefined {
  return logs.find((log) => log.id === logId);
}
