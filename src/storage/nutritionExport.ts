import type { NutritionExport } from "../types/nutrition";
import { NUTRITION_EXPORT_SCHEMA_VERSION } from "../types/nutrition";
import { getNutritionForExport } from "./nutritionStorage";

/** Build a Nutrition export document without mutating storage. */
export function buildNutritionExportDocument(): NutritionExport {
  const { settings, days } = getNutritionForExport();
  return {
    schemaVersion: NUTRITION_EXPORT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    settings,
    days
  };
}

export function nutritionExportFilename(exportedAt = new Date()): string {
  const y = exportedAt.getFullYear();
  const m = String(exportedAt.getMonth() + 1).padStart(2, "0");
  const d = String(exportedAt.getDate()).padStart(2, "0");
  return `workout-app-nutrition-${y}-${m}-${d}.json`;
}

/**
 * Trigger a browser download of the Nutrition JSON backup.
 * Returns false if the download could not be initiated.
 * Does not modify Nutrition data. Import is deferred (not in V1).
 */
export function downloadNutritionExport(): boolean {
  try {
    const doc = buildNutritionExportDocument();
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = nutritionExportFilename();
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    return true;
  } catch {
    return false;
  }
}
