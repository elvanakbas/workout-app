import type { NutritionDay, NutritionEntry, NutritionSettings } from "../types/nutrition";
import { DEFAULT_NUTRITION_SETTINGS } from "../types/nutrition";
import {
  ensureNutritionMigrated,
  normalizeNutritionDay,
  normalizeNutritionEntry,
  normalizeNutritionSettings,
  NUTRITION_DAYS_KEY,
  NUTRITION_SETTINGS_KEY,
  parseNutritionDaysRaw,
  readNutritionDaysRaw,
  readNutritionSettingsRaw,
  writeNutritionDaysRaw,
  writeNutritionSettingsRaw
} from "./nutritionMigration";

/**
 * Canonical Nutrition storage API.
 * Screens must use this module — never touch Nutrition localStorage keys directly.
 */

export {
  NUTRITION_SETTINGS_KEY,
  NUTRITION_DAYS_KEY,
  ensureNutritionMigrated
};

export function ensureNutritionReady(): void {
  ensureNutritionMigrated();
}

export function getNutritionSettings(): NutritionSettings {
  ensureNutritionMigrated();
  const raw = readNutritionSettingsRaw();
  if (!raw) return { ...DEFAULT_NUTRITION_SETTINGS };
  try {
    return normalizeNutritionSettings(JSON.parse(raw) as unknown);
  } catch {
    return { ...DEFAULT_NUTRITION_SETTINGS };
  }
}

export function saveNutritionSettings(settings: NutritionSettings): NutritionSettings {
  ensureNutritionMigrated();
  const normalized = normalizeNutritionSettings(settings);
  writeNutritionSettingsRaw(normalized);
  return normalized;
}

/** All stored days (empty days are not kept permanently). */
export function getAllNutritionDays(): NutritionDay[] {
  ensureNutritionMigrated();
  return parseNutritionDaysRaw(readNutritionDaysRaw()).days;
}

export function getNutritionDay(dateKey: string): NutritionDay | undefined {
  return getAllNutritionDays().find((d) => d.dateKey === dateKey);
}

/**
 * Replace or upsert a full day. Empty entry lists remove the day from storage.
 * Other days are preserved. Malformed siblings in storage are re-normalized
 * without wiping the collection.
 */
export function saveNutritionDay(day: NutritionDay): NutritionDay {
  ensureNutritionMigrated();
  const { day: normalized } = normalizeNutritionDay(day);
  if (!normalized) {
    throw new Error("Invalid NutritionDay");
  }

  const existing = parseNutritionDaysRaw(readNutritionDaysRaw()).days;
  const next = existing.filter((d) => d.dateKey !== normalized.dateKey);
  if (normalized.entries.length > 0) {
    next.push(normalized);
  }
  next.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  writeNutritionDaysRaw(next);
  return normalized;
}

export function createNutritionEntryId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `n-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Add a food entry for a dateKey. Newest entries are appended last
 * (oldest-first list order).
 */
export function addNutritionEntry(
  dateKey: string,
  input: { name: string; calories: number; proteinGrams: number }
): NutritionEntry {
  const name = input.name.trim();
  const now = new Date().toISOString();
  const entry = normalizeNutritionEntry({
    id: createNutritionEntryId(),
    name,
    calories: input.calories,
    proteinGrams: input.proteinGrams,
    createdAt: now
  });
  if (!entry) throw new Error("Invalid nutrition entry");

  const existing = getNutritionDay(dateKey) ?? { dateKey, entries: [] };
  saveNutritionDay({
    dateKey,
    entries: [...existing.entries, entry]
  });
  return entry;
}

/**
 * Edit an entry while preserving id and createdAt.
 * Returns null if the entry is not found on that day.
 */
export function updateNutritionEntry(
  dateKey: string,
  entryId: string,
  input: { name: string; calories: number; proteinGrams: number }
): NutritionEntry | null {
  const day = getNutritionDay(dateKey);
  if (!day) return null;
  const index = day.entries.findIndex((e) => e.id === entryId);
  if (index < 0) return null;

  const previous = day.entries[index];
  const updated = normalizeNutritionEntry({
    id: previous.id,
    name: input.name.trim(),
    calories: input.calories,
    proteinGrams: input.proteinGrams,
    createdAt: previous.createdAt,
    updatedAt: new Date().toISOString()
  });
  if (!updated) throw new Error("Invalid nutrition entry update");

  const entries = [...day.entries];
  entries[index] = updated;
  saveNutritionDay({ dateKey, entries });
  return updated;
}

/** Delete one entry on one day. Other days are untouched. */
export function deleteNutritionEntry(dateKey: string, entryId: string): boolean {
  const day = getNutritionDay(dateKey);
  if (!day) return false;
  const nextEntries = day.entries.filter((e) => e.id !== entryId);
  if (nextEntries.length === day.entries.length) return false;
  saveNutritionDay({ dateKey, entries: nextEntries });
  return true;
}

/** Read-only snapshot for export (valid records only). */
export function getNutritionForExport(): {
  settings: NutritionSettings;
  days: NutritionDay[];
} {
  return {
    settings: getNutritionSettings(),
    days: getAllNutritionDays()
  };
}
