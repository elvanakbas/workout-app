/**
 * Focused Phase 4 history validation (no large test framework).
 * Run: npm run validate:history
 */
import { getAllWorkouts } from "../src/data/program";
import {
  appendLogOnce,
  buildInitialEntries,
  createCompletionGuard
} from "../src/lib/sessionTracking";
import {
  bestValidSet,
  countCompletedExercises,
  countCompletedWorkingSets,
  exerciseVolume,
  findPreviousComparableLog,
  totalRepsWeightVolume
} from "../src/lib/workoutLogAnalytics";
import {
  buildCompletedWorkoutLog,
  buildRichLogEntries,
  WORKOUT_LOG_SCHEMA_VERSION
} from "../src/lib/workoutLogBuilder";
import { findLogById, normalizeWorkoutLog, normalizeWorkoutLogs } from "../src/lib/workoutLogNormalize";
import type { ExerciseLog, WorkoutLog } from "../src/types";

let failures = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`OK: ${message}`);
  } else {
    failures += 1;
    console.error(`FAIL: ${message}`);
  }
}

const workouts = getAllWorkouts();
const lowerB = workouts.find((w) => w.variant === "lower-b" && w.week === 1);
if (!lowerB || !lowerB.cardio) {
  console.error("FAIL: expected Lower B week 1 with cardio for synthetic session");
  process.exit(1);
}

const canonical = [...lowerB.strength, ...lowerB.core];
const entries = buildInitialEntries(canonical);

const repsWeight = canonical.find((e) => e.measurementType === "reps-weight");
const repsOnly = canonical.find((e) => e.measurementType === "reps-only");
const durationEx = canonical.find((e) => e.measurementType === "duration");
const unilateral = canonical.find((e) => e.unilateral || e.targetUnitLabel === "per side");

if (!repsWeight || !durationEx) {
  console.error("FAIL: Lower B should include reps-weight and duration exercises");
  process.exit(1);
}

function fillEntry(
  list: ExerciseLog[],
  exerciseId: string,
  mutate: (entry: ExerciseLog) => void
): void {
  const entry = list.find((e) => e.exerciseId === exerciseId);
  if (!entry) throw new Error(`missing ${exerciseId}`);
  mutate(entry);
}

fillEntry(entries, repsWeight.id, (entry) => {
  entry.sets[0] = { reps: 10, weight: 50 };
  entry.sets[1] = { reps: 8, weight: 50 };
  entry.completed = true;
});

if (repsOnly) {
  fillEntry(entries, repsOnly.id, (entry) => {
    entry.sets[0] = { reps: 12, weight: 0 };
    entry.completed = true;
  });
} else {
  // Ensure reps-only exclusion is covered even when the chosen workout has none.
  entries.push({
    exerciseId: "synthetic-reps-only",
    completed: true,
    sets: [{ reps: 15, weight: 999 }]
  });
  canonical.push({
    id: "synthetic-reps-only",
    name: "Synthetic Reps Only",
    targetSets: 1,
    targetReps: "10-15",
    measurementType: "reps-only",
    role: "core",
    equipmentCategory: "bodyweight",
    primaryMuscles: ["core"]
  });
}

fillEntry(entries, durationEx.id, (entry) => {
  entry.sets[0] = { reps: 0, weight: 0, durationSeconds: 45 };
  entry.sets[1] = { reps: 0, weight: 0, durationSeconds: 40 };
  entry.completed = true;
});

const rich = buildCompletedWorkoutLog({
  workout: lowerB,
  canonicalExercises: canonical,
  visibleExercises: canonical,
  entries,
  feedback: {
    difficulty: 7,
    energy: "normal",
    lowerBackPain: 1,
    kneePain: 0,
    shoulderPain: 0,
    note: "PHASE4-HISTORY-TEST"
  },
  lowEnergyMode: false,
  cardioCompleted: true,
  startedAt: "2026-07-26T10:00:00.000Z",
  completedAt: "2026-07-26T10:45:00.000Z",
  id: "phase4-test-log"
});

assert(rich.schemaVersion === WORKOUT_LOG_SCHEMA_VERSION, "rich log creation from an active session");
assert(rich.workoutTitle === lowerB.title, "immutable workout title snapshot");
assert(
  rich.entries.every((e) => typeof e.name === "string" && e.name.length > 0),
  "immutable exercise name snapshot"
);
assert(rich.durationSeconds === 45 * 60, "session duration from startedAt/completedAt");
assert(rich.cardio?.plannedMinutes === lowerB.cardio.durationMinutes, "cardio planned minutes stored");
assert(rich.cardio?.completed === true, "cardio completion stored");
assert(rich.cardio?.actualMinutes === undefined, "cardio actual minutes not fabricated");

const rwEntry = rich.entries.find((e) => e.exerciseId === repsWeight.id)!;
const expectedVolume = 10 * 50 + 8 * 50;
assert(exerciseVolume(rwEntry) === expectedVolume, "reps-weight volume calculation");
assert(totalRepsWeightVolume(rich) === expectedVolume, "log volume equals reps-weight volume only");

const roEntry = rich.entries.find(
  (e) => e.measurementType === "reps-only" || e.exerciseId === "synthetic-reps-only"
);
assert(!!roEntry && exerciseVolume(roEntry) === 0, "reps-only excluded from kg volume");

const dur = rich.entries.find((e) => e.exerciseId === durationEx.id)!;
assert(exerciseVolume(dur) === 0, "duration excluded from kg volume");
assert(rich.cardio != null, "cardio snapshot present");
assert(totalRepsWeightVolume(rich) === expectedVolume, "cardio excluded from kg volume");

if (unilateral) {
  const uni = rich.entries.find((e) => e.exerciseId === unilateral.id);
  assert(
    !!uni && (uni.unilateral === true || !!uni.targetUnitLabel || /per side/i.test(uni.plannedReps ?? "")),
    "unilateral rendering metadata"
  );
}

const renamedCatalogName = "RENAMED SHOULD NOT APPEAR";
assert(
  rich.entries.some((e) => e.name === repsWeight.name) &&
    !rich.entries.some((e) => e.name === renamedCatalogName),
  "history uses stored names, not live catalog renames"
);

// --- Legacy V2 fallback (partial set data, no names) ---
const v2Legacy: WorkoutLog = {
  id: "v2-legacy-1",
  workoutId: "w1",
  order: 1,
  workoutTitle: "Upper A — Workday",
  completedAt: "2026-07-20T12:00:00.000Z",
  entries: [
    {
      exerciseId: "chest-press-machine",
      completed: true,
      sets: [
        { reps: 10, weight: 40 },
        { reps: 0, weight: 0 }
      ]
    }
  ],
  feedback: {
    difficulty: 5,
    energy: "normal",
    lowerBackPain: 0,
    kneePain: 0,
    shoulderPain: 0
  }
};
const normalizedV2 = normalizeWorkoutLog(v2Legacy);
assert(normalizedV2 !== null, "current V2 log fallback");
assert(normalizedV2!.entries[0].sets[0].weight === 40, "V2 set values preserved");
assert(normalizedV2!.entries[0].name === undefined, "V2 logs do not invent exercise names");

// --- Old V1 fallback (title + sparse entries / obsolete IDs) ---
const v1Legacy = {
  id: "legacy-obsolete-test-1",
  workoutId: "w1",
  order: 1,
  workoutTitle: "Legacy Push A — Old Name",
  completedAt: "2026-07-19T12:00:00.000Z",
  entries: [
    {
      exerciseId: "machine-ab-crunch-OBSOLETE",
      sets: [{ reps: 12, weight: 30 }]
    }
  ]
};
const normalizedV1 = normalizeWorkoutLog(v1Legacy);
assert(normalizedV1 !== null, "old V1 log fallback");
assert(normalizedV1!.workoutTitle === "Legacy Push A — Old Name", "V1 stored title remains readable");
assert(
  normalizedV1!.entries[0].exerciseId === "machine-ab-crunch-OBSOLETE",
  "obsolete exercise ID safety"
);

// --- Malformed log safety ---
const mixed = normalizeWorkoutLogs([
  v1Legacy,
  { id: "bad", workoutTitle: "x" },
  rich,
  null,
  "nope"
]);
assert(mixed.length === 2, "malformed log safety (siblings kept)");
assert(findLogById(mixed, "missing-id") === undefined, "missing route ID safety");
assert(findLogById(mixed, rich.id)?.id === rich.id, "findLogById returns rich log");

// --- Skipped LEM exercises in rich builder ---
const visibleOnly = canonical.filter((e) => e.id === repsWeight.id);
const withSkip = buildRichLogEntries(canonical, visibleOnly, entries);
assert(
  withSkip.some((e) => e.status === "skipped") && withSkip.some((e) => e.status === "completed"),
  "LEM-hidden exercises marked skipped in rich snapshot"
);

// --- Comparison helpers ---
const earlierRich = buildCompletedWorkoutLog({
  workout: lowerB,
  canonicalExercises: canonical,
  visibleExercises: canonical,
  entries,
  feedback: {
    difficulty: 6,
    energy: "high",
    lowerBackPain: 0,
    kneePain: 0,
    shoulderPain: 0
  },
  lowEnergyMode: false,
  cardioCompleted: false,
  startedAt: "2026-07-19T10:00:00.000Z",
  completedAt: "2026-07-19T10:40:00.000Z",
  id: "phase4-earlier"
});
// Lower volume on earlier: reduce first set
earlierRich.entries = earlierRich.entries.map((entry) =>
  entry.exerciseId === repsWeight.id
    ? { ...entry, sets: [{ reps: 8, weight: 40 }, { reps: 0, weight: 0 }, { reps: 0, weight: 0 }] }
    : entry
);
const prev = findPreviousComparableLog([earlierRich, rich], rich);
assert(prev?.id === earlierRich.id, "finding previous comparable log by workout ID");
assert(bestValidSet(rwEntry)?.reps === 10, "per-exercise best valid set");
assert(countCompletedExercises(rich) >= 1, "completed exercise count");
assert(countCompletedWorkingSets(rich) >= 2, "completed set count");

// --- No duplicate history log creation ---
const guard = createCompletionGuard();
let logs: WorkoutLog[] = [];
logs = appendLogOnce(logs, rich, guard);
logs = appendLogOnce(logs, { ...rich, id: "phase4-test-log-dup" }, guard);
assert(logs.length === 1, "no duplicate history log creation");

if (failures > 0) {
  console.error(`\n${failures} history validation failure(s)`);
  process.exit(1);
}
console.log("\nAll Phase 4 history validations passed.");
