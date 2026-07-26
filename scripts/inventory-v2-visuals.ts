/**
 * Read-only Phase 3 helper: inventory active V2 visual keys vs registry/files.
 * Run: npx tsx scripts/inventory-v2-visuals.ts
 * Do not commit until Phase 3 docs are accepted (or as instructed).
 */
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { programSlots } from "../src/data/program";
import { EXERCISE_VISUALS } from "../src/data/exerciseVisuals";
import { collectVisualAssetReferences } from "../src/lib/visualAssetValidation";
import type { Exercise, Workout } from "../src/types";

const workouts: Workout[] = programSlots
  .filter((slot): slot is Extract<typeof slot, { status: "ready" }> => slot.status === "ready")
  .map((slot) => slot.workout);

const refs = collectVisualAssetReferences(workouts);
const keyCounts = new Map<string, number>();
for (const ref of refs) {
  if (!ref.visualAssetKey) continue;
  keyCounts.set(ref.visualAssetKey, (keyCounts.get(ref.visualAssetKey) ?? 0) + 1);
}

const catalogById = new Map<string, Exercise>();
for (const workout of workouts) {
  for (const exercise of [...workout.strength, ...workout.core]) {
    if (!catalogById.has(exercise.id)) catalogById.set(exercise.id, exercise);
  }
}

const assetsDir = join(process.cwd(), "public", "exercise-visuals");
const filesOnDisk = existsSync(assetsDir)
  ? readdirSync(assetsDir).filter((name) => name.toLowerCase().endsWith(".webp"))
  : [];
const fileSet = new Set(filesOnDisk);

const registryByKey = new Map(EXERCISE_VISUALS.map((e) => [e.visualAssetKey, e]));
const activeKeys = [...keyCounts.keys()].sort();
const registryKeys = EXERCISE_VISUALS.map((e) => e.visualAssetKey).sort();

const missingFromRegistry = activeKeys.filter((k) => !registryByKey.has(k));
const unreferencedRegistry = registryKeys.filter((k) => !keyCounts.has(k));
const registryFilenames = EXERCISE_VISUALS.map((e) => e.filename);
const obsoleteFiles = filesOnDisk.filter((f) => !registryFilenames.includes(f));
const missingFilesForReady = EXERCISE_VISUALS.filter(
  (e) => e.status === "ready" && e.assetPath && !fileSet.has(e.filename)
);

// Workday frequency: workouts with length === "short"
const workdayKeyCounts = new Map<string, number>();
for (const workout of workouts.filter((w) => w.length === "short")) {
  for (const exercise of [...workout.strength, ...workout.core]) {
    if (!exercise.visualAssetKey) continue;
    workdayKeyCounts.set(
      exercise.visualAssetKey,
      (workdayKeyCounts.get(exercise.visualAssetKey) ?? 0) + 1
    );
  }
  for (const item of workout.warmup) {
    if (!item.visualAssetKey) continue;
    workdayKeyCounts.set(item.visualAssetKey, (workdayKeyCounts.get(item.visualAssetKey) ?? 0) + 1);
  }
  if (workout.cardio?.visualAssetKey) {
    workdayKeyCounts.set(
      workout.cardio.visualAssetKey,
      (workdayKeyCounts.get(workout.cardio.visualAssetKey) ?? 0) + 1
    );
  }
}

console.log("=== ACTIVE V2 CATALOG EXERCISES ===");
console.log(`count=${catalogById.size}`);
for (const exercise of [...catalogById.values()].sort((a, b) => a.id.localeCompare(b.id))) {
  const key = exercise.visualAssetKey ?? "(none)";
  const entry = exercise.visualAssetKey ? registryByKey.get(exercise.visualAssetKey) : undefined;
  const workoutsUsing = workouts.filter((w) =>
    [...w.strength, ...w.core].some((e) => e.id === exercise.id)
  ).length;
  const fileExists = entry ? fileSet.has(entry.filename) : false;
  console.log(
    [
      exercise.id,
      JSON.stringify(exercise.name),
      key,
      exercise.equipmentCategory,
      exercise.measurementType,
      entry?.visualType ?? "n/a",
      entry?.status ?? "missing-registry",
      entry?.assetPath ?? "",
      `workouts=${workoutsUsing}`,
      `refs=${keyCounts.get(key) ?? 0}`,
      `file=${fileExists}`,
      `workdayRefs=${workdayKeyCounts.get(key) ?? 0}`
    ].join(" | ")
  );
}

console.log("\n=== ACTIVE VISUAL KEYS (all refs: strength/core/warmup/cardio) ===");
console.log(`uniqueKeys=${activeKeys.length}`);
for (const key of activeKeys) {
  const entry = registryByKey.get(key);
  console.log(
    `${key} | refs=${keyCounts.get(key)} | workdayRefs=${workdayKeyCounts.get(key) ?? 0} | registry=${entry ? entry.status : "MISSING"} | file=${entry ? fileSet.has(entry.filename) : false}`
  );
}

console.log("\n=== MISSING FROM REGISTRY ===");
console.log(missingFromRegistry.join("\n") || "(none)");

console.log("\n=== UNREFERENCED REGISTRY KEYS ===");
console.log(unreferencedRegistry.join("\n") || "(none)");

console.log("\n=== FILES ON DISK ===");
console.log(`count=${filesOnDisk.length}`);
console.log(filesOnDisk.sort().join("\n"));

console.log("\n=== ORPHAN FILES (on disk, not in registry filenames) ===");
console.log(obsoleteFiles.join("\n") || "(none)");

console.log("\n=== READY BUT FILE MISSING ===");
console.log(
  missingFilesForReady.map((e) => e.visualAssetKey).join("\n") || "(none)"
);

console.log("\n=== DUPLICATES ===");
const dupKeys = registryKeys.filter((k, i) => registryKeys.indexOf(k) !== i);
const dupFiles = registryFilenames.filter((f, i) => registryFilenames.indexOf(f) !== i);
console.log(`dupKeys=${dupKeys.join(",") || "(none)"}`);
console.log(`dupFilenames=${dupFiles.join(",") || "(none)"}`);

console.log("\n=== WARMUP/CARDIO KEYS ===");
const warmupCardio = new Set<string>();
for (const w of workouts) {
  for (const item of w.warmup) if (item.visualAssetKey) warmupCardio.add(item.visualAssetKey);
  if (w.cardio?.visualAssetKey) warmupCardio.add(w.cardio.visualAssetKey);
}
console.log([...warmupCardio].sort().join("\n"));
