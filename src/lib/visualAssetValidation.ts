/**
 * Small, typed consistency checker between the workout program's
 * `visualAssetKey` references (warm-up items, strength/core exercises,
 * cardio blocks) and the visual asset registry in
 * `src/data/exerciseVisuals.ts`. Intentionally minimal - a handful of pure
 * functions, no framework, not wired into the UI or build yet.
 */
import type { Workout } from "../types";
import type { VisualAssetEntry } from "../data/exerciseVisuals";

/** One reference to a `visualAssetKey` found somewhere in a workout. */
export interface VisualAssetReference {
  /** e.g. "chest-press-machine" (exercise/warm-up id) or "w3:cardio" (cardio has no id). */
  movementId: string;
  workoutOrder: number;
  visualAssetKey: string | undefined;
}

export interface VisualAssetValidationResult {
  /** References with no `visualAssetKey` set at all. */
  missingKeyReferences: VisualAssetReference[];
  /** References pointing at a key that doesn't exist in the registry. */
  unknownKeyReferences: VisualAssetReference[];
  /** Registry keys that appear on more than one registry entry. */
  duplicateRegistryKeys: string[];
  /** Filenames that appear on more than one registry entry. */
  duplicateFilenames: string[];
  /** Registry entries that no workout movement references. */
  unreferencedRegistryKeys: string[];
  /** `status: "ready"` entries with no `assetPath` set. */
  readyEntriesMissingAssetPath: string[];
  /** `assetPath` values that appear on more than one registry entry. */
  duplicateAssetPaths: string[];
  /** True only if every check above found nothing. */
  isValid: boolean;
}

/** Collects every `visualAssetKey` reference across warm-up, strength, core, and cardio. */
export function collectVisualAssetReferences(workouts: Workout[]): VisualAssetReference[] {
  const refs: VisualAssetReference[] = [];

  for (const workout of workouts) {
    for (const item of workout.warmup) {
      refs.push({ movementId: item.id, workoutOrder: workout.order, visualAssetKey: item.visualAssetKey });
    }
    for (const exercise of [...workout.strength, ...workout.core]) {
      refs.push({ movementId: exercise.id, workoutOrder: workout.order, visualAssetKey: exercise.visualAssetKey });
    }
    if (workout.cardio) {
      refs.push({
        movementId: `cardio:${workout.cardio.machine}`,
        workoutOrder: workout.order,
        visualAssetKey: workout.cardio.visualAssetKey
      });
    }
  }

  return refs;
}

export function validateVisualAssets(
  workouts: Workout[],
  registry: VisualAssetEntry[]
): VisualAssetValidationResult {
  const references = collectVisualAssetReferences(workouts);
  const registryKeys = registry.map((entry) => entry.visualAssetKey);
  const registryKeySet = new Set(registryKeys);

  const missingKeyReferences = references.filter((ref) => !ref.visualAssetKey);
  const unknownKeyReferences = references.filter(
    (ref) => ref.visualAssetKey && !registryKeySet.has(ref.visualAssetKey)
  );

  const duplicateRegistryKeys = findDuplicates(registryKeys);
  const duplicateFilenames = findDuplicates(registry.map((entry) => entry.filename));

  const referencedKeys = new Set(
    references.filter((ref): ref is VisualAssetReference & { visualAssetKey: string } => !!ref.visualAssetKey).map(
      (ref) => ref.visualAssetKey
    )
  );
  const unreferencedRegistryKeys = registryKeys.filter((key) => !referencedKeys.has(key));

  const readyEntries = registry.filter((entry) => entry.status === "ready");
  const readyEntriesMissingAssetPath = readyEntries
    .filter((entry) => !entry.assetPath)
    .map((entry) => entry.visualAssetKey);

  const assetPaths = registry.filter((entry) => !!entry.assetPath).map((entry) => entry.assetPath as string);
  const duplicateAssetPaths = findDuplicates(assetPaths);

  return {
    missingKeyReferences,
    unknownKeyReferences,
    duplicateRegistryKeys,
    duplicateFilenames,
    unreferencedRegistryKeys,
    readyEntriesMissingAssetPath,
    duplicateAssetPaths,
    isValid:
      missingKeyReferences.length === 0 &&
      unknownKeyReferences.length === 0 &&
      duplicateRegistryKeys.length === 0 &&
      duplicateFilenames.length === 0 &&
      unreferencedRegistryKeys.length === 0 &&
      readyEntriesMissingAssetPath.length === 0 &&
      duplicateAssetPaths.length === 0
  };
}

function findDuplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    }
    seen.add(value);
  }
  return Array.from(duplicates);
}
