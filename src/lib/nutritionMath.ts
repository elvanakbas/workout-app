import type { NutritionDay, NutritionEntry, NutritionSettings } from "../types/nutrition";

export type DayTotals = {
  calories: number;
  proteinGrams: number;
};

export type RemainingSummary = {
  caloriesRemaining: number;
  proteinRemaining: number;
  caloriesOverTarget: boolean;
  proteinOverTarget: boolean;
  caloriesOverBy: number;
  proteinOverBy: number;
};

function isFiniteNonNegative(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n >= 0;
}

/**
 * Sum calories for a day. Ignores malformed entries; never returns NaN.
 * Calories are treated as finite non-negative numbers (integers preferred in UI).
 */
export function totalCaloriesForDay(day: NutritionDay | null | undefined): number {
  if (!day || !Array.isArray(day.entries)) return 0;
  let sum = 0;
  for (const entry of day.entries) {
    if (!entry || !isFiniteNonNegative(entry.calories)) continue;
    sum += entry.calories;
  }
  return sum;
}

/**
 * Sum protein grams for a day. Supports decimals. Ignores malformed entries.
 */
export function totalProteinForDay(day: NutritionDay | null | undefined): number {
  if (!day || !Array.isArray(day.entries)) return 0;
  let sum = 0;
  for (const entry of day.entries) {
    if (!entry || !isFiniteNonNegative(entry.proteinGrams)) continue;
    sum += entry.proteinGrams;
  }
  // Avoid floating noise like 1.2000000002 for display math callers.
  return Math.round(sum * 1000) / 1000;
}

export function dayTotals(day: NutritionDay | null | undefined): DayTotals {
  return {
    calories: totalCaloriesForDay(day),
    proteinGrams: totalProteinForDay(day)
  };
}

/**
 * remaining = target - consumed.
 * When over target, remaining is negative; overBy is the absolute surplus.
 */
export function remainingSummary(
  totals: DayTotals,
  settings: NutritionSettings
): RemainingSummary {
  const calorieTarget =
    isFiniteNonNegative(settings.calorieTarget) && settings.calorieTarget > 0
      ? settings.calorieTarget
      : 0;
  const proteinTarget =
    isFiniteNonNegative(settings.proteinTargetGrams) && settings.proteinTargetGrams > 0
      ? settings.proteinTargetGrams
      : 0;

  const caloriesRemaining = calorieTarget - totals.calories;
  const proteinRemaining = Math.round((proteinTarget - totals.proteinGrams) * 1000) / 1000;

  return {
    caloriesRemaining,
    proteinRemaining,
    caloriesOverTarget: caloriesRemaining < 0,
    proteinOverTarget: proteinRemaining < 0,
    caloriesOverBy: caloriesRemaining < 0 ? Math.abs(caloriesRemaining) : 0,
    proteinOverBy: proteinRemaining < 0 ? Math.abs(proteinRemaining) : 0
  };
}

/** Look up a NutritionDay by dateKey from a days collection. */
export function findNutritionDay(
  days: NutritionDay[],
  dateKey: string
): NutritionDay | undefined {
  return days.find((d) => d.dateKey === dateKey);
}

/** True when an entry looks usable for totals (defensive). */
export function isUsableNutritionEntry(entry: NutritionEntry | null | undefined): boolean {
  if (!entry) return false;
  if (typeof entry.id !== "string" || !entry.id.trim()) return false;
  if (typeof entry.name !== "string" || !entry.name.trim()) return false;
  if (!isFiniteNonNegative(entry.calories)) return false;
  if (!isFiniteNonNegative(entry.proteinGrams)) return false;
  return true;
}
