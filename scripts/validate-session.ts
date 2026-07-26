/**
 * Focused Phase 2 validation for active-session drafts, measurement-type
 * field behavior, per-exercise completion, Low Energy Mode preservation,
 * and duplicate-completion safety.
 *
 * Run with: npm run validate:session
 */

// Minimal localStorage polyfill for Node validation runs.
const memoryStore = new Map<string, string>();
(globalThis as { localStorage?: Storage }).localStorage = {
  getItem: (key: string) => memoryStore.get(key) ?? null,
  setItem: (key: string, value: string) => {
    memoryStore.set(key, String(value));
  },
  removeItem: (key: string) => {
    memoryStore.delete(key);
  },
  clear: () => memoryStore.clear(),
  key: (index: number) => Array.from(memoryStore.keys())[index] ?? null,
  get length() {
    return memoryStore.size;
  }
} as Storage;

import { programSlots } from "../src/data/program";
import {
  ACTIVE_DRAFT_SCHEMA_VERSION,
  DRAFTS_KEY,
  createEmptyDraft,
  getActiveSessionDraft,
  saveActiveSessionDraft
} from "../src/storage/activeSessionDraft";
import {
  appendLogOnce,
  createCompletionGuard,
  draftSaveRestoreRoundTrip,
  draftsRemainIndependent,
  isExerciseEntryEmpty,
  lowEnergyPreservesExtraSets,
  lowEnergyPreservesHiddenEntry,
  measurementFieldsFor,
  rejectsMalformedDraft,
  reopenCompletedExerciseRoundTrip,
  validatePallofReplacement
} from "../src/lib/sessionTracking";
import type { Exercise, ExerciseLog, Workout, WorkoutLog } from "../src/types";

const workouts: Workout[] = programSlots
  .filter((slot): slot is Extract<typeof slot, { status: "ready" }> => slot.status === "ready")
  .map((slot) => slot.workout);

let failures = 0;
function assert(condition: boolean, message: string) {
  if (!condition) {
    failures += 1;
    console.error(`FAIL: ${message}`);
  } else {
    console.log(`OK: ${message}`);
  }
}

memoryStore.clear();

// --- Draft save / restore / clear ---
const sampleEntries: ExerciseLog[] = [
  {
    exerciseId: "chest-press-machine",
    completed: false,
    sets: [
      { reps: 10, weight: 40 },
      { reps: 10, weight: 40 },
      { reps: 8, weight: 42.5 }
    ]
  }
];
const roundTrip = draftSaveRestoreRoundTrip("w1", sampleEntries, {
  lowEnergyMode: true,
  cardioCompleted: true
});
assert(roundTrip.saved, "active draft save and restore");
assert(roundTrip.restoredCompleted, "per-exercise completed state persistence");
assert(roundTrip.cleared, "active draft clearing after full workout completion");
assert(rejectsMalformedDraft("w1"), "malformed draft rejected defensively");
assert(DRAFTS_KEY === "workout-app:v2:active-drafts", "Phase 2 draft storage key");
assert(ACTIVE_DRAFT_SCHEMA_VERSION === 1, "draft schema version is 1");

// --- Multiple drafts stay independent ---
const entriesB: ExerciseLog[] = [
  {
    exerciseId: "leg-press",
    completed: false,
    sets: [{ reps: 12, weight: 100 }]
  }
];
const independent = draftsRemainIndependent("w1", "w2", sampleEntries, entriesB);
assert(independent.bothSaved, "multiple workout drafts can be saved separately");
assert(independent.aPreservedAfterBClear, "clearing one draft preserves another workout draft");

// --- Reopen completed exercise ---
const reopen = reopenCompletedExerciseRoundTrip(sampleEntries[0]);
assert(reopen.wasCompleted && reopen.reopened && reopen.setsPreserved, "reopening a completed exercise preserves sets");

// --- Measurement field behavior ---
assert(
  measurementFieldsFor("reps-weight").showReps &&
    measurementFieldsFor("reps-weight").showWeight &&
    !measurementFieldsFor("reps-weight").showDurationSeconds &&
    !measurementFieldsFor("reps-weight").showCardioCompletion,
  "reps-weight exercise field shape"
);
assert(
  measurementFieldsFor("reps-only").showReps &&
    !measurementFieldsFor("reps-only").showWeight &&
    !measurementFieldsFor("reps-only").showDurationSeconds,
  "reps-only exercise field shape"
);
assert(
  !measurementFieldsFor("duration").showReps &&
    !measurementFieldsFor("duration").showWeight &&
    measurementFieldsFor("duration").showDurationSeconds,
  "duration exercise field shape"
);
assert(
  !measurementFieldsFor("cardio-duration").showReps &&
    !measurementFieldsFor("cardio-duration").showWeight &&
    !measurementFieldsFor("cardio-duration").showDurationSeconds &&
    measurementFieldsFor("cardio-duration").showCardioCompletion,
  "cardio-duration field shape"
);
assert(
  isExerciseEntryEmpty(
    { exerciseId: "forearm-plank", sets: [{ reps: 0, weight: 0, durationSeconds: 0 }] },
    "duration"
  ),
  "empty duration entry detected"
);
assert(
  !isExerciseEntryEmpty(
    { exerciseId: "forearm-plank", sets: [{ reps: 0, weight: 0, durationSeconds: 40 }] },
    "duration"
  ),
  "non-empty duration entry detected"
);

// --- Program measurement assignments ---
const allExercises = workouts.flatMap((w) => [...w.strength, ...w.core]);
assert(
  allExercises.every((e) => !!e.measurementType),
  "every strength/core exercise has explicit measurementType"
);
assert(
  allExercises
    .filter((e) => e.id === "forearm-plank" || e.id === "side-plank")
    .every((e) => e.measurementType === "duration"),
  "planks use duration measurement"
);
assert(
  allExercises.filter((e) => e.id === "dead-bug").every((e) => e.measurementType === "reps-only"),
  "dead bug uses reps-only"
);
assert(
  workouts.every((w) => !w.cardio || w.cardio.measurementType === "cardio-duration"),
  "cardio blocks use cardio-duration"
);
assert(
  allExercises
    .filter((e) => e.unilateral)
    .every((e) => !!e.targetUnitLabel),
  "unilateral exercises have targetUnitLabel"
);

// --- Low Energy Mode preservation ---
const optionalExercise: Exercise = {
  id: "optional-curl",
  name: "Optional Curl",
  targetSets: 3,
  targetReps: "10-12",
  measurementType: "reps-weight",
  role: "isolation",
  equipmentCategory: "dumbbell",
  primaryMuscles: ["biceps"],
  optional: true
};
const requiredExercise: Exercise = {
  id: "chest-press-machine",
  name: "Machine Chest Press",
  targetSets: 3,
  targetReps: "8-12",
  measurementType: "reps-weight",
  role: "primary",
  equipmentCategory: "machine",
  primaryMuscles: ["chest"]
};
const seedWithOptional: ExerciseLog[] = [
  {
    exerciseId: "chest-press-machine",
    completed: true,
    sets: [
      { reps: 10, weight: 40 },
      { reps: 10, weight: 40 },
      { reps: 8, weight: 42.5 }
    ]
  },
  {
    exerciseId: "optional-curl",
    completed: false,
    sets: [
      { reps: 12, weight: 12 },
      { reps: 12, weight: 12 },
      { reps: 10, weight: 10 }
    ]
  }
];
assert(
  lowEnergyPreservesHiddenEntry([requiredExercise, optionalExercise], "optional-curl", seedWithOptional),
  "LEM-hidden optional exercise draft values are preserved"
);
assert(
  lowEnergyPreservesExtraSets(requiredExercise, seedWithOptional[0]),
  "LEM set-cap display preserves extra draft sets"
);

// --- Duplicate completion guard ---
const guard = createCompletionGuard();
const baseLog: WorkoutLog = {
  id: "w1-1",
  workoutId: "w1",
  order: 1,
  workoutTitle: "Upper A — Workday",
  completedAt: new Date().toISOString(),
  entries: sampleEntries
};
let logs: WorkoutLog[] = [];
logs = appendLogOnce(logs, baseLog, guard);
logs = appendLogOnce(logs, { ...baseLog, id: "w1-2" }, guard);
assert(logs.length === 1, "no duplicate workout log on repeated completion action");

// --- Malformed draft clears only that workout ---
memoryStore.clear();
saveActiveSessionDraft(createEmptyDraft("w3", sampleEntries));
memoryStore.set(
  DRAFTS_KEY,
  JSON.stringify({
    w3: getActiveSessionDraft("w3"),
    w4: { version: 99, workoutId: "w4", entries: [] }
  })
);
assert(getActiveSessionDraft("w3") !== null, "valid sibling draft survives malformed neighbor read path");
assert(getActiveSessionDraft("w4") === null, "malformed draft resets only that workout");

// --- Pallof replacement (program integrity, unchanged by Phase 2) ---
const pallof = validatePallofReplacement(workouts);
assert(
  pallof.ok,
  `Pallof Press replaces Machine Ab Crunch (pallof=${pallof.pallofWorkoutCount}, leftover=${pallof.machineAbCrunchReferences})`
);

if (failures > 0) {
  console.error(`\n${failures} validation failure(s)`);
  process.exit(1);
}
console.log("\nAll Phase 2 session validations passed.");
