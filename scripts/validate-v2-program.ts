/**
 * V2 program structure + muscle-volume validation.
 * Run: npx tsx scripts/validate-v2-program.ts
 */
import { getAllWorkouts, getV2CatalogEntries } from "../src/data/program";
import { EXERCISE_VISUALS } from "../src/data/exerciseVisuals";
import { validateV2Program } from "../src/lib/programValidation";
import { WEEKLY_MUSCLE_TARGETS } from "../src/lib/muscleVolume";
import type { MuscleGroup } from "../src/types";

const workouts = getAllWorkouts();
const result = validateV2Program(workouts);

console.log("=== V2 Program Structure ===");
console.log(`workouts: ${result.workoutCount}`);
console.log(`weeks: ${result.weekCount}`);
console.log(`per week: ${result.workoutsPerWeek.join(", ")}`);
console.log(`workday/off-day: ${result.workdayCount}/${result.offDayCount}`);
console.log(`block1 weeks: ${result.block1Weeks.join(", ")}`);
console.log(`deload weeks: ${result.deloadWeeks.join(", ")}`);
console.log(`block2 weeks: ${result.block2Weeks.join(", ")}`);
console.log(`machine-ab-crunch refs: ${result.machineAbCrunchReferences}`);
console.log(`missing measurementType: ${result.missingMeasurementType.length}`);
console.log(`duration shows weight: ${result.durationShowsWeight.length}`);
console.log(`reps-only shows weight: ${result.repsOnlyShowsWeight.length}`);

console.log("\n=== Weekly Muscle Volume (direct sets) ===");
for (const week of result.muscleVolume) {
  const tag = week.isDeload ? "DELOAD" : `Block ${week.trainingBlock}`;
  const parts = (Object.keys(WEEKLY_MUSCLE_TARGETS) as MuscleGroup[]).map(
    (m) => `${m}=${week.sets[m]}`
  );
  console.log(`Week ${week.week} [${tag}]: ${parts.join(" ")}`);
  if (week.misses.length > 0) {
    for (const miss of week.misses) {
      console.log(
        `  MISS ${miss.muscle}: ${miss.sets} (target ${miss.min}-${miss.max}) ${miss.direction}`
      );
    }
  }
}

if (result.normalWeekMisses.length > 0) {
  console.log("\n=== Normal-week target misses (not auto-fixed) ===");
  for (const row of result.normalWeekMisses) {
    for (const miss of row.misses) {
      console.log(
        `Week ${row.week} ${miss.muscle}: ${miss.sets} vs ${miss.min}-${miss.max} (${miss.direction})`
      );
    }
  }
}

const catalog = getV2CatalogEntries();
const registryKeys = new Set(EXERCISE_VISUALS.map((e) => e.visualAssetKey));
const referencedKeys = new Set(
  workouts.flatMap((w) =>
    [...w.warmup, ...w.strength, ...w.core, ...(w.cardio ? [w.cardio] : [])]
      .map((m) => m.visualAssetKey)
      .filter((k): k is string => !!k)
  )
);
const missingVisuals = [...referencedKeys].filter((k) => !registryKeys.has(k)).sort();
const reusableVisuals = [...referencedKeys].filter((k) => registryKeys.has(k)).sort();

console.log(`\n=== Catalog: ${catalog.length} exercises ===`);
console.log(`Referenced visual keys: ${referencedKeys.size}`);
console.log(`Reusable existing registry keys: ${reusableVisuals.length}`);
console.log(`Missing / new visual keys needed: ${missingVisuals.length}`);
for (const key of missingVisuals) console.log(`  - ${key}`);

if (result.errors.length > 0) {
  console.log("\n=== ERRORS ===");
  for (const err of result.errors) console.log(`  - ${err}`);
}

if (!result.ok) {
  process.exit(1);
}
console.log("\nV2 program validation passed (structure). Review muscle-volume misses above if any.");
