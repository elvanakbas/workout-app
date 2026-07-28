import type { NutritionDay, NutritionEntry, NutritionSettings } from "../types/nutrition";
import { DEFAULT_NUTRITION_SETTINGS } from "../types/nutrition";
import { isDateKeyFormat } from "../lib/localDate";

/**
 * Nutrition persistence keys (stable across bundle hashes / app versions).
 *
 * | Key | Role |
 * |---|---|
 * | workout-app:nutrition:settings:v1 | Global calorie/protein targets |
 * | workout-app:nutrition:days:v1 | Map/array of NutritionDay records |
 * | workout-app:nutrition:migration-version | Marker; current value `1` |
 * | workout-app:nutrition:backup:v1 | Raw pre-migration snapshot (once) |
 * | workout-app:nutrition:recovery | Quarantine for malformed records |
 */

export const NUTRITION_SETTINGS_KEY = "workout-app:nutrition:settings:v1";
export const NUTRITION_DAYS_KEY = "workout-app:nutrition:days:v1";
export const NUTRITION_MIGRATION_VERSION = 1;
export const NUTRITION_MIGRATION_VERSION_KEY = "workout-app:nutrition:migration-version";
export const NUTRITION_BACKUP_KEY = "workout-app:nutrition:backup:v1";
export const NUTRITION_RECOVERY_KEY = "workout-app:nutrition:recovery";

/** Known Nutrition keys so History discovery never treats them as History. */
export const NUTRITION_STORAGE_KEYS = [
  NUTRITION_SETTINGS_KEY,
  NUTRITION_DAYS_KEY,
  NUTRITION_MIGRATION_VERSION_KEY,
  NUTRITION_BACKUP_KEY,
  NUTRITION_RECOVERY_KEY
] as const;

export interface NutritionBackupDocument {
  createdAt: string;
  migrationVersion: number;
  keys: Record<string, string | null>;
}

export interface NutritionRecoveryDocument {
  updatedAt: string;
  malformed: Array<{
    sourceKey: string;
    index: number;
    dateKey?: string;
    raw: unknown;
    reason: string;
  }>;
}

export interface NutritionMigrationResult {
  ran: boolean;
  alreadyComplete: boolean;
  dayCount: number;
  malformedCount: number;
  backupCreated: boolean;
}

function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isFiniteNonNegative(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n >= 0;
}

/** Normalize one food entry; return null if unusable. */
export function normalizeNutritionEntry(raw: unknown): NutritionEntry | null {
  if (!isObject(raw)) return null;
  if (typeof raw.id !== "string" || !raw.id.trim()) return null;
  if (typeof raw.name !== "string") return null;
  const name = raw.name.trim();
  if (!name) return null;
  if (!isFiniteNonNegative(raw.calories)) return null;
  if (!isFiniteNonNegative(raw.proteinGrams)) return null;
  if (typeof raw.createdAt !== "string" || !raw.createdAt) return null;

  const entry: NutritionEntry = {
    id: raw.id.trim(),
    name,
    calories: raw.calories,
    proteinGrams: raw.proteinGrams,
    createdAt: raw.createdAt
  };
  if (typeof raw.updatedAt === "string" && raw.updatedAt) {
    entry.updatedAt = raw.updatedAt;
  }
  return entry;
}

/**
 * Normalize one day. Malformed entries are dropped (caller may quarantine).
 * Returns null if the day itself is unusable (bad dateKey).
 */
export function normalizeNutritionDay(
  raw: unknown
): { day: NutritionDay | null; droppedEntries: unknown[]; reason?: string } {
  if (!isObject(raw)) {
    return { day: null, droppedEntries: [], reason: "not-an-object" };
  }
  if (typeof raw.dateKey !== "string" || !isDateKeyFormat(raw.dateKey)) {
    return { day: null, droppedEntries: [], reason: "bad-dateKey" };
  }
  const entriesRaw = Array.isArray(raw.entries) ? raw.entries : [];
  const entries: NutritionEntry[] = [];
  const droppedEntries: unknown[] = [];
  for (const item of entriesRaw) {
    const entry = normalizeNutritionEntry(item);
    if (entry) entries.push(entry);
    else droppedEntries.push(item);
  }
  return { day: { dateKey: raw.dateKey, entries }, droppedEntries };
}

export function normalizeNutritionSettings(raw: unknown): NutritionSettings {
  if (!isObject(raw)) return { ...DEFAULT_NUTRITION_SETTINGS };
  const calorieTarget =
    typeof raw.calorieTarget === "number" &&
    Number.isFinite(raw.calorieTarget) &&
    raw.calorieTarget > 0
      ? Math.round(raw.calorieTarget)
      : DEFAULT_NUTRITION_SETTINGS.calorieTarget;
  const proteinTargetGrams =
    typeof raw.proteinTargetGrams === "number" &&
    Number.isFinite(raw.proteinTargetGrams) &&
    raw.proteinTargetGrams > 0
      ? raw.proteinTargetGrams
      : DEFAULT_NUTRITION_SETTINGS.proteinTargetGrams;
  return { calorieTarget, proteinTargetGrams };
}

/**
 * Parse the days store. Accepts either:
 * - NutritionDay[] (preferred)
 * - Record<dateKey, NutritionDay> (also accepted defensively)
 *
 * A malformed day does not erase other valid days.
 */
export function parseNutritionDaysRaw(rawText: string | null): {
  days: NutritionDay[];
  malformed: NutritionRecoveryDocument["malformed"];
} {
  const malformed: NutritionRecoveryDocument["malformed"] = [];
  if (!rawText) return { days: [], malformed };

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    malformed.push({
      sourceKey: NUTRITION_DAYS_KEY,
      index: -1,
      raw: rawText,
      reason: "days-json-parse-failed"
    });
    return { days: [], malformed };
  }

  const items: unknown[] = [];
  if (Array.isArray(parsed)) {
    items.push(...parsed);
  } else if (isObject(parsed)) {
    for (const [key, value] of Object.entries(parsed)) {
      if (isObject(value) && typeof value.dateKey !== "string") {
        items.push({ ...value, dateKey: key });
      } else {
        items.push(value);
      }
    }
  } else {
    malformed.push({
      sourceKey: NUTRITION_DAYS_KEY,
      index: -1,
      raw: parsed,
      reason: "days-not-array-or-object"
    });
    return { days: [], malformed };
  }

  const byKey = new Map<string, NutritionDay>();
  items.forEach((item, index) => {
    const { day, droppedEntries, reason } = normalizeNutritionDay(item);
    if (!day) {
      malformed.push({
        sourceKey: NUTRITION_DAYS_KEY,
        index,
        raw: item,
        reason: reason ?? "day-normalize-failed"
      });
      return;
    }
    for (const dropped of droppedEntries) {
      malformed.push({
        sourceKey: NUTRITION_DAYS_KEY,
        index,
        dateKey: day.dateKey,
        raw: dropped,
        reason: "entry-normalize-failed"
      });
    }
    // Keep non-empty days only in canonical write path; empty days are allowed
    // in memory when actively edited then pruned on save.
    byKey.set(day.dateKey, day);
  });

  const days = [...byKey.values()].sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  return { days, malformed };
}

function readBackup(): NutritionBackupDocument | null {
  const raw = safeGetItem(NUTRITION_BACKUP_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isObject(parsed) || typeof parsed.createdAt !== "string") return null;
    return parsed as unknown as NutritionBackupDocument;
  } catch {
    return null;
  }
}

function writeRecovery(malformed: NutritionRecoveryDocument["malformed"]): void {
  if (malformed.length === 0) return;
  const existingRaw = safeGetItem(NUTRITION_RECOVERY_KEY);
  let existing: NutritionRecoveryDocument = {
    updatedAt: new Date().toISOString(),
    malformed: []
  };
  if (existingRaw) {
    try {
      const parsed: unknown = JSON.parse(existingRaw);
      if (isObject(parsed) && Array.isArray(parsed.malformed)) {
        existing = parsed as unknown as NutritionRecoveryDocument;
      }
    } catch {
      // replace
    }
  }
  const doc: NutritionRecoveryDocument = {
    updatedAt: new Date().toISOString(),
    malformed: [...existing.malformed, ...malformed].slice(-200)
  };
  safeSetItem(NUTRITION_RECOVERY_KEY, JSON.stringify(doc));
}

function getStoredMigrationVersion(): number | null {
  const raw = safeGetItem(NUTRITION_MIGRATION_VERSION_KEY);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/**
 * Idempotent Nutrition migration (V1 has no legacy keys yet).
 * Backs up raw settings/days once, normalizes, validates read-back, then marks complete.
 * Never wipes the entire localStorage store.
 */
export function ensureNutritionMigrated(): NutritionMigrationResult {
  const already = getStoredMigrationVersion();
  if (already !== null && already >= NUTRITION_MIGRATION_VERSION) {
    const { days } = parseNutritionDaysRaw(safeGetItem(NUTRITION_DAYS_KEY));
    return {
      ran: false,
      alreadyComplete: true,
      dayCount: days.length,
      malformedCount: 0,
      backupCreated: false
    };
  }

  const settingsRaw = safeGetItem(NUTRITION_SETTINGS_KEY);
  const daysRaw = safeGetItem(NUTRITION_DAYS_KEY);

  let backupCreated = false;
  const existingBackup = readBackup();
  if (!existingBackup) {
    const backup: NutritionBackupDocument = {
      createdAt: new Date().toISOString(),
      migrationVersion: NUTRITION_MIGRATION_VERSION,
      keys: {
        [NUTRITION_SETTINGS_KEY]: settingsRaw,
        [NUTRITION_DAYS_KEY]: daysRaw
      }
    };
    backupCreated = safeSetItem(NUTRITION_BACKUP_KEY, JSON.stringify(backup));
  }

  const settings = normalizeNutritionSettings(
    settingsRaw
      ? (() => {
          try {
            return JSON.parse(settingsRaw) as unknown;
          } catch {
            return null;
          }
        })()
      : null
  );

  const { days, malformed } = parseNutritionDaysRaw(daysRaw);
  // Persist only days that still have entries (empty days not permanent).
  const nonEmpty = days.filter((d) => d.entries.length > 0);

  const settingsOk = safeSetItem(NUTRITION_SETTINGS_KEY, JSON.stringify(settings));
  const daysOk = safeSetItem(NUTRITION_DAYS_KEY, JSON.stringify(nonEmpty));
  if (!settingsOk || !daysOk) {
    writeRecovery(malformed);
    return {
      ran: true,
      alreadyComplete: false,
      dayCount: nonEmpty.length,
      malformedCount: malformed.length,
      backupCreated
    };
  }

  // Read-back validation
  const settingsRead = normalizeNutritionSettings(
    (() => {
      try {
        return JSON.parse(safeGetItem(NUTRITION_SETTINGS_KEY) ?? "null") as unknown;
      } catch {
        return null;
      }
    })()
  );
  const { days: daysRead } = parseNutritionDaysRaw(safeGetItem(NUTRITION_DAYS_KEY));

  if (
    settingsRead.calorieTarget !== settings.calorieTarget ||
    settingsRead.proteinTargetGrams !== settings.proteinTargetGrams ||
    daysRead.length !== nonEmpty.length
  ) {
    writeRecovery([
      ...malformed,
      {
        sourceKey: NUTRITION_DAYS_KEY,
        index: -1,
        raw: { expectedDays: nonEmpty.length, gotDays: daysRead.length },
        reason: "readback-mismatch"
      }
    ]);
    return {
      ran: true,
      alreadyComplete: false,
      dayCount: daysRead.length,
      malformedCount: malformed.length + 1,
      backupCreated
    };
  }

  writeRecovery(malformed);
  safeSetItem(NUTRITION_MIGRATION_VERSION_KEY, String(NUTRITION_MIGRATION_VERSION));

  return {
    ran: true,
    alreadyComplete: false,
    dayCount: nonEmpty.length,
    malformedCount: malformed.length,
    backupCreated: backupCreated || !existingBackup
  };
}

/** Test helper: clear migration marker only. */
export function clearNutritionMigrationMarkerForTests(): void {
  try {
    localStorage.removeItem(NUTRITION_MIGRATION_VERSION_KEY);
  } catch {
    // ignore
  }
}

export function readNutritionSettingsRaw(): string | null {
  return safeGetItem(NUTRITION_SETTINGS_KEY);
}

export function readNutritionDaysRaw(): string | null {
  return safeGetItem(NUTRITION_DAYS_KEY);
}

export function writeNutritionSettingsRaw(settings: NutritionSettings): boolean {
  return safeSetItem(NUTRITION_SETTINGS_KEY, JSON.stringify(settings));
}

export function writeNutritionDaysRaw(days: NutritionDay[]): boolean {
  const nonEmpty = days.filter((d) => d.entries.length > 0);
  return safeSetItem(NUTRITION_DAYS_KEY, JSON.stringify(nonEmpty));
}
