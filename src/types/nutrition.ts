/** One food entry on a NutritionDay. IDs stay stable across edits. */
export type NutritionEntry = {
  id: string;
  name: string;
  calories: number;
  proteinGrams: number;
  createdAt: string;
  updatedAt?: string;
};

/** Date-keyed day record. Empty days need not be stored permanently. */
export type NutritionDay = {
  dateKey: string;
  entries: NutritionEntry[];
};

/** Global targets (not snapshotted per day in V1). */
export type NutritionSettings = {
  calorieTarget: number;
  proteinTargetGrams: number;
};

/** Read-only Nutrition JSON export document (schemaVersion 1). */
export type NutritionExport = {
  schemaVersion: 1;
  exportedAt: string;
  settings: NutritionSettings;
  days: NutritionDay[];
};

export const NUTRITION_EXPORT_SCHEMA_VERSION = 1 as const;

/** Sensible default targets when nothing is stored yet. */
export const DEFAULT_NUTRITION_SETTINGS: NutritionSettings = {
  calorieTarget: 2100,
  proteinTargetGrams: 140
};
