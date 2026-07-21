import type { WorkoutLog } from "../types";

/**
 * Finds the most recent recorded weight (kg) for a given exercise, searching
 * across all logs regardless of which workout they belong to - exercise ids
 * are stable across recurring weeks, so this reflects true progression on
 * that movement over time.
 */
export function getLastWeightForExercise(logs: WorkoutLog[], exerciseId: string): number | undefined {
  const sorted = [...logs].sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
  );

  for (const log of sorted) {
    const entry = log.entries.find((e) => e.exerciseId === exerciseId);
    if (!entry) continue;
    const loggedSets = entry.sets.filter((set) => set.weight > 0);
    if (loggedSets.length === 0) continue;
    return loggedSets[loggedSets.length - 1].weight;
  }

  return undefined;
}
