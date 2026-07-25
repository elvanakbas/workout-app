/**
 * Focused validation for active-session drafts, measurement-type field
 * behavior, per-exercise completion persistence, and Pallof replacement.
 * Run with: npx tsx scripts/validate-session.ts
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
import { EXERCISE_VISUALS } from "../src/data/exerciseVisuals";
import { validateVisualAssets } from "../src/lib/visualAssetValidation";
import {
  draftSaveRestoreRoundTrip,
  isExerciseEntryEmpty,
  measurementFieldsFor,
  rejectsMalformedDraft,
  validatePallofReplacement
} from "../src/lib/sessionTracking";
import type { ExerciseLog, Workout } from "../src/types";

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

// --- Measurement field behavior ---
assert(
  measurementFieldsFor("reps-weight").showReps &&
    measurementFieldsFor("reps-weight").showWeight &&
    !measurementFieldsFor("reps-weight").showDurationSeconds,
  "reps-weight exercise field behavior"
);
assert(
  measurementFieldsFor("reps-only").showReps &&
    !measurementFieldsFor("reps-only").showWeight &&
    !measurementFieldsFor("reps-only").showDurationSeconds,
  "reps-only exercise field behavior"
);
assert(
  !measurementFieldsFor("duration").showReps &&
    !measurementFieldsFor("duration").showWeight &&
    measurementFieldsFor("duration").showDurationSeconds,
  "duration exercise field behavior"
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
  allExercises
    .filter((e) => e.id === "dead-bug" || e.id === "bird-dog")
    .every((e) => e.measurementType === "reps-only"),
  "dead bug / bird dog use reps-only"
);
assert(
  workouts.every((w) => !w.cardio || w.cardio.measurementType === "cardio-duration"),
  "cardio blocks use cardio-duration"
);

// --- Pallof replacement ---
const pallof = validatePallofReplacement(workouts);
assert(pallof.ok, `Pallof Press replaces Machine Ab Crunch (pallof=${pallof.pallofWorkoutCount}, leftover=${pallof.machineAbCrunchReferences})`);
assert(
  !EXERCISE_VISUALS.some((e) => e.visualAssetKey === "machine-ab-crunch"),
  "no machine-ab-crunch registry entry"
);
assert(
  EXERCISE_VISUALS.some((e) => e.visualAssetKey === "pallof-press" && e.status === "ready" && !!e.assetPath),
  "pallof-press registry entry ready with assetPath"
);

const visual = validateVisualAssets(workouts, EXERCISE_VISUALS);
assert(visual.isValid, "visual registry validation isValid");
assert(EXERCISE_VISUALS.length === 27, `registry has 27 entries (got ${EXERCISE_VISUALS.length})`);

if (failures > 0) {
  console.error(`\n${failures} validation failure(s)`);
  process.exit(1);
}
console.log("\nAll session/program validations passed.");
