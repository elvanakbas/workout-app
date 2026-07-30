/**
 * V3 program identity validation.
 * Run: npm run validate:v3-program
 */
import { getAllWorkouts, getMandatoryExercises } from "../src/data/program";
import { EXERCISE_VISUALS } from "../src/data/exerciseVisuals";
import {
  countDirectWeeklySets,
  countOptionalWeeklySets,
  reportProgramMuscleVolume,
  WEEKLY_MUSCLE_TARGETS
} from "../src/lib/muscleVolume";
import {
  plannedDateKeyForOrder,
  plannedDayOffsetForOrder,
  preferredWeekdayForVariant,
  scheduleStatusCopy,
  WEEK_SLOT_OFFSETS,
  resolveTodayPlanContext,
  preferredIdentityForWeekday,
  weekdayFromDateKey
} from "../src/lib/schedule";
import { roleDisplayLabel } from "../src/lib/roleDisplay";
import { getRecommendedNextOrder, getCompletedOrders } from "../src/lib/progress";
import {
  migrateDraftToCurrentProgram,
  draftMigrationNeedsPersist
} from "../src/lib/draftMigration";
import { buildCompletedWorkoutLog } from "../src/lib/workoutLogBuilder";
import {
  mergeScheduleSettings,
  mergeSettings,
  mergeWorkoutLogs,
  mergeDrafts,
  draftProgramRank
} from "../src/cloud/mergeRules";
import { normalizeWorkoutLog } from "../src/lib/workoutLogNormalize";
import { logRichnessScore } from "../src/storage/historyMigration";
import { workoutLogLocalDateKey } from "../src/lib/nutritionWorkoutLink";
import { DEFAULT_NUTRITION_SETTINGS } from "../src/types/nutrition";
import { PROGRAM_VERSION, type MuscleGroup, type Workout } from "../src/types";
import { shiftLocalDateKey } from "../src/lib/localDate";
import type { ActiveSessionDraft } from "../src/types";
import { ACTIVE_DRAFT_SCHEMA_VERSION } from "../src/storage/activeSessionDraft";

let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`OK: ${message}`);
  } else {
    failed += 1;
    console.error(`FAIL: ${message}`);
  }
}

const workouts = getAllWorkouts();
const byWeek = (week: number) => workouts.filter((w) => w.week === week).sort((a, b) => a.order - b.order);

assert(workouts.length === 32, "1. 32 workouts");
assert(new Set(workouts.map((w) => w.week)).size === 8, "2a. 8 weeks");
assert(
  Array.from({ length: 8 }, (_, i) => byWeek(i + 1).length).every((n) => n === 4),
  "2b. 4 workouts per week"
);

const identities = ["push", "quad", "pull", "posterior"] as const;
const weekdays = ["tuesday", "wednesday", "friday", "sunday"] as const;
for (let week = 1; week <= 8; week++) {
  const ww = byWeek(week);
  assert(
    ww.every((w, i) => w.identity === identities[i]),
    `3. week ${week} identity sequence`
  );
  assert(
    ww.every((w, i) => w.preferredWeekday === weekdays[i]),
    `4. week ${week} preferred weekday sequence`
  );
}

assert(
  workouts.every((w) => w.plannedDayOffset === plannedDayOffsetForOrder(w.order)),
  "5a. plannedDayOffset matches helper"
);
assert(
  WEEK_SLOT_OFFSETS[0] === 0 &&
    WEEK_SLOT_OFFSETS[1] === 1 &&
    WEEK_SLOT_OFFSETS[2] === 3 &&
    WEEK_SLOT_OFFSETS[3] === 5,
  "5b. slot offsets 0/1/3/5"
);
assert(
  plannedDateKeyForOrder("2026-07-28", 1) === "2026-07-28" &&
    plannedDateKeyForOrder("2026-07-28", 2) === "2026-07-29" &&
    plannedDateKeyForOrder("2026-07-28", 3) === "2026-07-31" &&
    plannedDateKeyForOrder("2026-07-28", 4) === "2026-08-02" &&
    plannedDateKeyForOrder("2026-07-28", 5) === shiftLocalDateKey("2026-07-28", 7),
  "5c. planned dates from start"
);

for (const w of workouts) {
  const mandatory = getMandatoryExercises(w);
  const primaries = mandatory.filter((e) => e.role === "primary");
  assert(primaries.length === 1, `6. exactly one Primary Lift (${w.id})`);
  assert(primaries[0] && !primaries[0].optional, `6b. Primary not optional (${w.id})`);
  assert(
    mandatory.every((e) => !!roleDisplayLabel(e.role)),
    `7. role display (${w.id})`
  );
  assert(
    (w.optionalCore ?? []).every((e) => e.optional === true),
    `8. optional core flagged (${w.id})`
  );
  if (w.cardio) {
    assert(w.cardio.optional === true, `8b. cardio optional (${w.id})`);
  }
}

const sample = byWeek(1);
const upperA = sample[0];
const lowerA = sample[1];
const upperB = sample[2];
const lowerB = sample[3];

function mandatoryStats(w: Workout) {
  const m = getMandatoryExercises(w);
  return { count: m.length, sets: m.reduce((n, e) => n + e.targetSets, 0) };
}

const ua = mandatoryStats(upperA);
const la = mandatoryStats(lowerA);
const ub = mandatoryStats(upperB);
const lb = mandatoryStats(lowerB);

assert(ua.count === 6 && ua.sets >= 15 && ua.sets <= 16, `9. Upper A budget ${ua.count}/${ua.sets}`);
assert(la.count >= 5 && la.count <= 6 && la.sets >= 14 && la.sets <= 16, `9b. Lower A ${la.count}/${la.sets}`);
assert(ub.count >= 7 && ub.count <= 8 && ub.sets <= 21, `10. Upper B ${ub.count}/${ub.sets}`);
assert(lb.count === 7 && lb.sets <= 21, `10b. Lower B ${lb.count}/${lb.sets}`);

assert(
  upperA.estimatedDurationMinutes.min >= 40 &&
    upperA.estimatedDurationMinutes.max <= 55 &&
    lowerA.estimatedDurationMinutes.min >= 40 &&
    lowerA.estimatedDurationMinutes.max <= 60 &&
    upperB.estimatedDurationMinutes.min >= 65 &&
    upperB.estimatedDurationMinutes.max >= 85 &&
    upperB.estimatedDurationMinutes.max <= 95 &&
    lowerB.estimatedDurationMinutes.min >= 70 &&
    lowerB.estimatedDurationMinutes.max >= 90 &&
    lowerB.estimatedDurationMinutes.max <= 100,
  "11. duration metadata reflects realistic main ranges"
);

const volume = reportProgramMuscleVolume(workouts);
const week1 = volume.find((v) => v.week === 1)!;
assert(week1 && week1.misses.length === 0, "12. week 1 mandatory volume hits targets");
const opt = countOptionalWeeklySets(byWeek(1));
assert(opt.core > 0, "13. optional core volume reported separately");

const week5 = byWeek(5);
const w5sets = week5.reduce((n, w) => n + mandatoryStats(w).sets, 0);
const w1sets = byWeek(1).reduce((n, w) => n + mandatoryStats(w).sets, 0);
const reduction = 1 - w5sets / w1sets;
assert(
  reduction >= 0.3 && reduction <= 0.5,
  `14. week 5 deload weekly ~35-45% band (got ${(reduction * 100).toFixed(0)}%; per-day rounding may slightly exceed)`
);
// Primary Lift never drops below 1 set on deload.
assert(
  week5.every((w) => {
    const primary = getMandatoryExercises(w).find((e) => e.role === "primary");
    return primary != null && primary.targetSets >= 1;
  }),
  "14b. deload Primary Lift min 1 set"
);

assert(
  workouts.every((w) => w.id === `w${w.order}` && w.programVersion === PROGRAM_VERSION),
  "15. stable workout IDs w{order} + program version"
);

const registry = new Set(EXERCISE_VISUALS.map((e) => e.visualAssetKey));
const missingVisuals: string[] = [];
for (const w of workouts) {
  for (const m of [...w.warmup, ...w.strength, ...w.core, ...(w.optionalCore ?? [])]) {
    if (m.visualAssetKey && !registry.has(m.visualAssetKey)) missingVisuals.push(m.visualAssetKey);
  }
  if (w.cardio?.visualAssetKey && !registry.has(w.cardio.visualAssetKey)) {
    missingVisuals.push(w.cardio.visualAssetKey);
  }
}
assert(missingVisuals.length === 0, "16. visual coverage");
assert(new Set(workouts.map((w) => w.id)).size === 32, "17. no duplicate workout IDs");
assert(
  workouts.every((w) => {
    const ids = getMandatoryExercises(w).map((e) => e.id);
    return new Set(ids).size === ids.length;
  }),
  "18. no duplicate exercise IDs within workout mandatory list"
);

assert(getRecommendedNextOrder(new Set([1, 2]), 32) === 3, "19. Recommended Next lowest incomplete");
assert(
  preferredWeekdayForVariant("upper-a") === "tuesday",
  "20. schedule does not lock — preferred weekday helper only"
);

assert(
  !scheduleStatusCopy({
    preferredWeekday: "tuesday",
    plannedDateKey: "2020-01-01",
    isCompleted: false,
    isRecommendedNext: false,
    todayKey: "2026-07-28"
  })
    .toLowerCase()
    .includes("fail"),
  "21. neutral missed-day copy"
);

assert(getCompletedOrders([{ order: 5 } as never]).has(5), "22. progress by order preserved");

const fakeDraft: ActiveSessionDraft = {
  version: ACTIVE_DRAFT_SCHEMA_VERSION,
  workoutId: upperA.id,
  updatedAt: new Date().toISOString(),
  lowEnergyMode: false,
  cardioCompleted: false,
  entries: [
    {
      exerciseId: "chest-press-machine",
      completed: true,
      sets: [{ reps: 10, weight: 40 }]
    },
    {
      exerciseId: "removed-old-exercise",
      completed: false,
      sets: [{ reps: 8, weight: 20 }]
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
const migrated = migrateDraftToCurrentProgram(fakeDraft, upperA);
assert(
  migrated.entries.some((e) => e.exerciseId === "chest-press-machine" && e.sets[0]?.weight === 40),
  "23a. draft keeps matching exercise values"
);
assert(
  (migrated.legacyEntries ?? []).some((e) => e.exerciseId === "removed-old-exercise"),
  "23b. removed exercise preserved in legacyEntries"
);
assert(migrated.programVersion === PROGRAM_VERSION, "23c. draft programVersion set");

const log = buildCompletedWorkoutLog({
  workout: upperB,
  canonicalExercises: getMandatoryExercises(upperB),
  visibleExercises: getMandatoryExercises(upperB),
  entries: getMandatoryExercises(upperB).map((e) => ({
    exerciseId: e.id,
    completed: true,
    sets: Array.from({ length: e.targetSets }, () => ({ reps: 8, weight: 20 }))
  })),
  feedback: {
    difficulty: 5,
    energy: "normal",
    lowerBackPain: 0,
    kneePain: 0,
    shoulderPain: 0
  },
  lowEnergyMode: false,
  cardioCompleted: false,
  programStartDateKey: "2026-07-28",
  optionalCoreSelected: false,
  optionalCardioSelected: false
});
assert(log.schemaVersion === 3, "25a. History schemaVersion 3");
assert(log.workoutIdentity === "pull", "25b. identity snapshot");
assert(log.plannedDateKey === "2026-07-31", "25c. planned date snapshot");
assert(log.entries.every((e) => e.role), "25d. role snapshot on entries");
assert(log.actualDateKey != null || log.completedAt != null, "26. actual date available for Nutrition link");

const schedA = {
  programVersion: PROGRAM_VERSION,
  startDateKey: "2026-07-28",
  updatedAt: "2026-07-01T00:00:00.000Z"
};
const schedEmpty = {
  programVersion: PROGRAM_VERSION,
  startDateKey: null,
  updatedAt: "2026-07-02T00:00:00.000Z"
};
const mergedSched = mergeScheduleSettings(schedEmpty, schedA);
assert(mergedSched.schedule?.startDateKey === "2026-07-28", "28. empty start does not erase non-empty");
assert(
  mergeScheduleSettings(
    { ...schedA, startDateKey: "2026-08-01" },
    schedA
  ).needsChoice,
  "28b. conflicting start dates need choice"
);

const settingsMerge = mergeSettings(
  {
    nutrition: DEFAULT_NUTRITION_SETTINGS,
    schedule: schedA,
    updatedAt: "2026-07-01T00:00:00.000Z"
  },
  {
    nutrition: DEFAULT_NUTRITION_SETTINGS,
    updatedAt: "2026-07-02T00:00:00.000Z"
  }
);
assert(
  settingsMerge.settings?.schedule?.startDateKey === "2026-07-28",
  "29. missing schedule on one side does not erase"
);
assert(
  settingsMerge.settings?.nutrition.calorieTarget === DEFAULT_NUTRITION_SETTINGS.calorieTarget,
  "27. nutrition preserved with schedule merge"
);

const sets = countDirectWeeklySets(byWeek(1));
for (const muscle of Object.keys(WEEKLY_MUSCLE_TARGETS) as MuscleGroup[]) {
  const t = WEEKLY_MUSCLE_TARGETS[muscle];
  assert(
    sets[muscle] >= t.min && sets[muscle] <= t.max,
    `12b. ${muscle}=${sets[muscle]} in ${t.min}-${t.max}`
  );
}

assert(upperA.strength[0]?.id === "chest-press-machine", "Primary Upper A = Chest Press");
assert(lowerA.strength[0]?.id === "leg-press", "Primary Lower A = Leg Press");
assert(upperB.strength[0]?.id === "chest-supported-row", "Primary Upper B = CS Row");
assert(lowerB.strength[0]?.id === "hip-thrust-glute-bridge", "Primary Lower B = Hip Thrust");

// ——— Phase 7C: History normalize round-trip + richness ———
const roundTripped = normalizeWorkoutLog(JSON.parse(JSON.stringify(log)));
assert(roundTripped != null, "7C-1a. normalize accepts schema 3");
assert(roundTripped!.schemaVersion === 3, "7C-1b. schemaVersion 3 preserved");
assert(roundTripped!.programVersion === PROGRAM_VERSION, "7C-1c. programVersion preserved");
assert(roundTripped!.workoutIdentity === "pull", "7C-1d. workoutIdentity preserved");
assert(roundTripped!.preferredWeekday === "friday", "7C-1e. preferredWeekday preserved");
assert(roundTripped!.plannedDateKey === "2026-07-31", "7C-1f. plannedDateKey preserved");
assert(roundTripped!.optionalCoreSelected === false, "7C-1g. optionalCoreSelected preserved");
assert(roundTripped!.optionalCardioSelected === false, "7C-1h. optionalCardioSelected preserved");
assert(roundTripped!.mainWorkoutCompleted === true, "7C-1i. mainWorkoutCompleted preserved");
assert(
  roundTripped!.entries.every((e) => e.role != null),
  "7C-1j. entry roles preserved"
);

const strippedTwin: typeof log = {
  ...log,
  schemaVersion: 2,
  programVersion: undefined,
  workoutIdentity: undefined,
  preferredWeekday: undefined,
  plannedDateKey: undefined,
  actualDateKey: undefined,
  optionalCoreSelected: undefined,
  optionalCoreCompleted: undefined,
  optionalCardioSelected: undefined,
  optionalCardioCompleted: undefined,
  mainWorkoutCompleted: undefined,
  entries: log.entries.map(({ role: _r, optional: _o, ...rest }) => rest)
};
assert(
  logRichnessScore(log) > logRichnessScore(strippedTwin),
  "7C-4. schema 3 richer than stripped/poorer duplicate"
);
const mergedLogs = mergeWorkoutLogs([strippedTwin], [log]);
assert(mergedLogs.length === 1, "7C-3a. sync merge keeps one log");
assert(mergedLogs[0]?.schemaVersion === 3, "7C-3b. rich V3 wins merge/upsert path");
assert(mergedLogs[0]?.plannedDateKey === "2026-07-31", "7C-3c. plannedDateKey survives merge");
assert(mergedLogs[0]?.workoutTitle === log.workoutTitle, "7C-3d. original title preserved");

const v2Only = normalizeWorkoutLog({
  id: "legacy-v2",
  schemaVersion: 2,
  workoutId: "w1",
  order: 1,
  workoutTitle: "Old Title",
  completedAt: "2026-01-01T12:00:00.000Z",
  entries: [{ exerciseId: "chest-press-machine", sets: [{ reps: 8, weight: 30 }] }]
});
assert(v2Only?.schemaVersion === 2, "7C-14a. V2 schema preserved (not rewritten to 3)");
assert(v2Only?.workoutIdentity === undefined, "7C-15a. missing V3 fields not fabricated");
assert(v2Only?.plannedDateKey === undefined, "7C-15b. plannedDateKey not fabricated on old logs");

// ——— Draft migration vs cloud LWW ———
const oldCloudDraft: ActiveSessionDraft = {
  ...fakeDraft,
  updatedAt: "2026-07-20T12:00:00.000Z",
  programVersion: undefined
};
const migratedLocal: ActiveSessionDraft = {
  ...migrated,
  updatedAt: "2026-07-10T12:00:00.000Z"
};
const draftMergeOld = mergeDrafts([migratedLocal], [oldCloudDraft]);
assert(draftMergeOld.length === 1, "7C-5a. one draft after merge");
assert(
  draftMergeOld[0]?.programVersion === PROGRAM_VERSION,
  "7C-5b. migrated V3 beats incompatible newer-timestamp cloud"
);
assert(
  (draftMergeOld[0]?.legacyEntries ?? []).some((e) => e.exerciseId === "removed-old-exercise"),
  "7C-5c. legacyEntries preserved through merge preference"
);

const newerV3Cloud: ActiveSessionDraft = {
  ...migrated,
  updatedAt: "2026-07-25T12:00:00.000Z",
  feedback: { ...migrated.feedback, note: "cloud-newer" }
};
const draftMergeNew = mergeDrafts(
  [{ ...migrated, updatedAt: "2026-07-10T12:00:00.000Z" }],
  [newerV3Cloud]
);
assert(draftMergeNew[0]?.feedback.note === "cloud-newer", "7C-6. genuinely newer V3 cloud draft wins");
assert(draftProgramRank(migrated) > draftProgramRank(oldCloudDraft), "7C-5d. draft rank V3 > pre-V3");

const migratedTwice = migrateDraftToCurrentProgram(migrated, upperA);
assert(
  migratedTwice.entries.length === migrated.entries.length &&
    (migratedTwice.legacyEntries?.length ?? 0) === (migrated.legacyEntries?.length ?? 0),
  "7C-5e. repeated migration idempotent (no duplication)"
);
assert(
  !draftMigrationNeedsPersist(migratedTwice, migrateDraftToCurrentProgram(migratedTwice, upperA)),
  "7C-5f. already-migrated draft does not need re-persist"
);

// ——— Settings conflict safety ———
const nutritionConflictLocal = {
  nutrition: { ...DEFAULT_NUTRITION_SETTINGS, calorieTarget: 2200 },
  schedule: { ...schedEmpty, updatedAt: "2026-07-03T00:00:00.000Z" },
  updatedAt: "2026-07-03T00:00:00.000Z"
};
const nutritionConflictCloud = {
  nutrition: DEFAULT_NUTRITION_SETTINGS,
  schedule: schedA,
  updatedAt: "2026-07-01T00:00:00.000Z"
};
assert(
  mergeSettings(nutritionConflictLocal, nutritionConflictCloud).needsChoice,
  "7C-7a. nutrition conflict needs choice"
);
const useDevice = mergeSettings(nutritionConflictLocal, nutritionConflictCloud, "use-device");
assert(
  useDevice.settings?.nutrition.calorieTarget === 2200,
  "7C-7b. use-device keeps device nutrition"
);
assert(
  useDevice.settings?.schedule?.startDateKey === "2026-07-28",
  "7C-7c. use-device does not erase cloud non-empty schedule"
);
const useCloud = mergeSettings(nutritionConflictLocal, nutritionConflictCloud, "use-cloud");
assert(
  useCloud.settings?.nutrition.calorieTarget === DEFAULT_NUTRITION_SETTINGS.calorieTarget,
  "7C-7d. use-cloud keeps cloud nutrition"
);
assert(
  useCloud.settings?.schedule?.startDateKey === "2026-07-28",
  "7C-7e. use-cloud preserves non-empty schedule (local null does not erase)"
);
assert(
  mergeScheduleSettings(schedA, schedEmpty).schedule?.startDateKey === "2026-07-28",
  "7C-8a. local non-empty / cloud null keeps date"
);
assert(
  mergeScheduleSettings(schedEmpty, schedA).schedule?.startDateKey === "2026-07-28",
  "7C-8b. local null / cloud non-empty keeps date"
);
assert(
  mergeScheduleSettings(schedA, { ...schedA, updatedAt: "2026-07-09T00:00:00.000Z" }).needsChoice ===
    false,
  "7C-8c. both non-empty same → no choice"
);
assert(
  mergeScheduleSettings({ ...schedA, startDateKey: "2026-08-01" }, schedA).needsChoice,
  "7C-9. both non-empty different → needs safe resolution"
);
const idempotentSettings = mergeSettings(
  useDevice.settings!,
  useDevice.settings!
);
assert(
  idempotentSettings.settings?.schedule?.startDateKey === "2026-07-28" &&
    idempotentSettings.needsChoice === false,
  "7C-8d. repeated settings merge idempotent"
);

// ——— Today context vs Recommended Next ———
const week1Workouts = byWeek(1);
const tue = resolveTodayPlanContext({
  todayKey: "2026-07-28", // Tuesday
  startDateKey: null,
  weekWorkouts: week1Workouts,
  allWorkouts: workouts
});
assert(tue.kind === "preferred" && tue.identity === "push", "7C-10a. Tuesday → Push today");
assert(preferredIdentityForWeekday("wednesday") === "quad", "7C-10a2. Wed identity");
const mon = resolveTodayPlanContext({
  todayKey: "2026-07-27", // Monday
  startDateKey: null,
  weekWorkouts: week1Workouts,
  allWorkouts: workouts
});
assert(mon.kind === "none", "7C-10b. Monday → no preferred session");
const friWithStart = resolveTodayPlanContext({
  todayKey: "2026-07-31",
  startDateKey: "2026-07-28",
  weekWorkouts: week1Workouts,
  allWorkouts: workouts
});
assert(
  friWithStart.kind === "preferred" && friWithStart.workout?.variant === "upper-b",
  "7C-10c. start date maps Friday to Upper B"
);
// Non-preferred calendar day that is still a planned slot (Wed start → Thu = Lower A)
const thuPlanned = resolveTodayPlanContext({
  todayKey: "2026-07-30",
  startDateKey: "2026-07-29",
  weekWorkouts: week1Workouts,
  allWorkouts: workouts
});
assert(
  thuPlanned.kind === "preferred" && thuPlanned.workout?.variant === "lower-a",
  "7C-10c2. start-date planned day wins on non-preferred weekday"
);
assert(weekdayFromDateKey("2026-07-28") === "tuesday", "7C-10d. weekday from local date key");
assert(
  tue.identity === "push" && getRecommendedNextOrder(new Set([1]), 32) === 2,
  "7C-10e. Today Push can differ from Recommended Next Lower A"
);

// Nutrition never uses plannedDateKey
const nutritionKey = workoutLogLocalDateKey({
  ...log,
  startedAt: "2026-08-05T18:00:00.000Z",
  plannedDateKey: "2026-07-31",
  actualDateKey: "2026-08-05"
});
assert(
  nutritionKey !== log.plannedDateKey,
  "7C-11a. Nutrition lookup ignores plannedDateKey"
);
assert(
  nutritionKey === "2026-08-05" || nutritionKey == null,
  "7C-11b. Nutrition uses startedAt/completedAt local date"
);

// Optional volume excluded from mandatory
assert(sets.core === 4 && opt.core === 8, "7C-13. optional core excluded from mandatory volume");

if (failed > 0) {
  console.error(`\nvalidate:v3-program failed with ${failed} error(s)`);
  process.exit(1);
}
console.log("\nvalidate:v3-program passed");
