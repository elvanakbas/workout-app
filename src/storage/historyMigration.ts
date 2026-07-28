import type { WorkoutLog } from "../types";
import { normalizeWorkoutLog } from "../lib/workoutLogNormalize";

/** Canonical completed-History key (unchanged since initial release). */
export const HISTORY_CANONICAL_KEY = "workout-app:v1:logs";

/**
 * Known legacy / alternate History keys. Git history shows only
 * `workout-app:v1:logs` was ever written for completed workouts, but these
 * candidates are scanned so a future mistaken namespace or manual export
 * restore cannot strand records.
 */
export const HISTORY_LEGACY_LOG_KEYS = [
  "workout-app:v2:logs",
  "workout-app:logs",
  "workout-app:history",
  "workout-app:v1:history",
  "workout-app:v2:history"
] as const;

/** Increment when migration algorithm changes in a non-idempotent way. */
export const HISTORY_MIGRATION_VERSION = 1;

export const HISTORY_MIGRATION_VERSION_KEY = "workout-app:history-migration-version";
export const HISTORY_BACKUP_KEY = "workout-app:history-backup:v1-to-phase4b";
export const HISTORY_RECOVERY_KEY = "workout-app:history-recovery";

/** Non-History keys that coexist in localStorage (never treated as History). */
export const KNOWN_NON_HISTORY_KEYS = [
  "workout-app:v1:progress",
  "workout-app:v1:active-drafts",
  "workout-app:v2:active-drafts",
  "workout-app:nutrition:settings:v1",
  "workout-app:nutrition:days:v1",
  "workout-app:nutrition:migration-version",
  "workout-app:nutrition:backup:v1",
  "workout-app:nutrition:recovery"
] as const;

export interface HistoryBackupDocument {
  createdAt: string;
  migrationVersion: number;
  keys: Record<string, string | null>;
}

export interface HistoryRecoveryDocument {
  updatedAt: string;
  malformed: Array<{
    sourceKey: string;
    index: number;
    raw: unknown;
    reason: string;
  }>;
}

export interface HistoryMigrationResult {
  ran: boolean;
  alreadyComplete: boolean;
  beforeCanonicalCount: number;
  afterCanonicalCount: number;
  importedFromLegacy: number;
  duplicatesCollapsed: number;
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

/** FNV-1a 32-bit hash → stable hex for deterministic legacy IDs. */
export function stableHash(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/**
 * Deterministic identity for legacy records that lack a stable `id`.
 * Same immutable fields → same ID across launches (no Date.now()).
 */
export function deriveDeterministicLogId(raw: Record<string, unknown>): string {
  if (typeof raw.id === "string" && raw.id.trim()) return raw.id.trim();

  const entries = Array.isArray(raw.entries) ? raw.entries : [];
  const setCount = entries.reduce((sum, entry) => {
    if (!isObject(entry) || !Array.isArray(entry.sets)) return sum;
    return sum + entry.sets.length;
  }, 0);

  const fingerprint = [
    String(raw.completedAt ?? ""),
    String(raw.workoutId ?? ""),
    String(raw.workoutTitle ?? ""),
    String(raw.order ?? ""),
    String(raw.durationSeconds ?? ""),
    String(entries.length),
    String(setCount)
  ].join("|");

  return `legacy-${stableHash(fingerprint)}`;
}

/** Discover every localStorage key that looks like History data. */
export function discoverHistorySourceKeys(): string[] {
  const discovered = new Set<string>([HISTORY_CANONICAL_KEY, ...HISTORY_LEGACY_LOG_KEYS]);

  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith("workout-app:")) continue;
      if ((KNOWN_NON_HISTORY_KEYS as readonly string[]).includes(key)) continue;
      if (key === HISTORY_MIGRATION_VERSION_KEY) continue;
      if (key === HISTORY_BACKUP_KEY) continue;
      if (key === HISTORY_RECOVERY_KEY) continue;
      if (/(^|:)(logs|history)$/.test(key)) {
        discovered.add(key);
      }
    }
  } catch {
    // private mode / blocked storage
  }

  return [...discovered];
}

export function readCanonicalRawArray(): unknown[] {
  const raw = safeGetItem(HISTORY_CANONICAL_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeCanonicalLogs(rawLogs: unknown[]): boolean {
  return safeSetItem(HISTORY_CANONICAL_KEY, JSON.stringify(rawLogs));
}

function parseSourceArray(raw: string | null): unknown[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function coerceRawRecord(
  raw: unknown,
  sourceKey: string
): { log: WorkoutLog | null; malformed: HistoryRecoveryDocument["malformed"][number] | null } {
  if (!isObject(raw)) {
    return {
      log: null,
      malformed: {
        sourceKey,
        index: -1,
        raw,
        reason: "not-an-object"
      }
    };
  }

  const copy: Record<string, unknown> = { ...raw };
  copy.id = deriveDeterministicLogId(copy);

  if (typeof copy.workoutTitle !== "string") {
    return {
      log: null,
      malformed: { sourceKey, index: -1, raw, reason: "missing-workoutTitle" }
    };
  }
  if (typeof copy.completedAt !== "string") {
    return {
      log: null,
      malformed: { sourceKey, index: -1, raw, reason: "missing-completedAt" }
    };
  }
  if (typeof copy.workoutId !== "string" || !copy.workoutId) {
    copy.workoutId = "unknown";
  }
  if (typeof copy.order !== "number" || !Number.isFinite(copy.order)) {
    copy.order = 0;
  }
  if (!Array.isArray(copy.entries)) {
    copy.entries = [];
  }

  if (sourceKey !== HISTORY_CANONICAL_KEY) {
    if (sourceKey.includes(":v1:") || sourceKey.endsWith(":v1:logs")) {
      copy.historySource = "legacy-v1";
    } else if (!copy.historySource) {
      copy.historySource = "legacy-unknown";
    }
  }

  const log = normalizeWorkoutLog(copy);
  if (!log) {
    return {
      log: null,
      malformed: { sourceKey, index: -1, raw, reason: "normalize-failed" }
    };
  }
  return { log, malformed: null };
}

/** Richness score for duplicate resolution (higher wins). */
export function logRichnessScore(log: WorkoutLog): number {
  let score = 0;
  if (log.schemaVersion === 2) score += 1000;
  if (log.feedback) score += 50;
  if (log.cardio) score += 40;
  if (typeof log.durationSeconds === "number") score += 20;
  if (log.variantLabel || log.variant || log.length) score += 30;
  if (log.lowEnergyMode) score += 5;

  for (const entry of log.entries) {
    score += 10;
    if (entry.name) score += 15;
    if (entry.measurementType) score += 10;
    for (const set of entry.sets) {
      if (set.reps > 0 || set.weight > 0 || (set.durationSeconds ?? 0) > 0) score += 3;
    }
  }
  return score;
}

/**
 * Confident duplicate: same stable id, OR same completedAt+workoutId+title+order
 * with matching set/exercise counts when both lack distinguishing duration.
 */
export function areConfidentDuplicates(a: WorkoutLog, b: WorkoutLog): boolean {
  if (a.id === b.id) return true;

  if (a.completedAt !== b.completedAt) return false;
  if (a.workoutId !== b.workoutId) return false;
  if (a.workoutTitle !== b.workoutTitle) return false;
  if (a.order !== b.order) return false;

  const aSets = a.entries.reduce((n, e) => n + e.sets.length, 0);
  const bSets = b.entries.reduce((n, e) => n + e.sets.length, 0);
  if (a.entries.length !== b.entries.length || aSets !== bSets) return false;

  // Same-day different workouts: different completedAt already filtered.
  // Same timestamp + same identity fields → duplicate.
  return true;
}

/** Merge only clearly compatible missing fields onto the richer base. */
export function mergeCompatibleFields(winner: WorkoutLog, other: WorkoutLog): WorkoutLog {
  const merged: WorkoutLog = { ...winner, entries: winner.entries.map((e) => ({ ...e, sets: e.sets.map((s) => ({ ...s })) })) };

  // Never overwrite original title/timestamp/id.
  if (!merged.feedback && other.feedback) merged.feedback = other.feedback;
  if (merged.cardioCompleted === undefined && other.cardioCompleted !== undefined) {
    merged.cardioCompleted = other.cardioCompleted;
  }
  if (!merged.cardio && other.cardio) merged.cardio = other.cardio;
  if (merged.lowEnergyMode === undefined && other.lowEnergyMode) merged.lowEnergyMode = true;
  if (!merged.startedAt && other.startedAt) merged.startedAt = other.startedAt;
  if (merged.durationSeconds === undefined && other.durationSeconds !== undefined) {
    merged.durationSeconds = other.durationSeconds;
  }
  if (!merged.variantLabel && other.variantLabel) merged.variantLabel = other.variantLabel;
  if (!merged.variant && other.variant) merged.variant = other.variant;
  if (!merged.focusArea && other.focusArea) merged.focusArea = other.focusArea;
  if (!merged.length && other.length) merged.length = other.length;
  if (!merged.schemaVersion && other.schemaVersion) merged.schemaVersion = other.schemaVersion;
  if (!merged.historySource && other.historySource) merged.historySource = other.historySource;

  // Prefer richer entries when winner has empty shells and other has names/values.
  if (logRichnessScore(other) > logRichnessScore(winner) * 0.9 && other.entries.length >= winner.entries.length) {
    // Only replace entries if winner has no named measurement snapshots and other does.
    const winnerHasNames = winner.entries.some((e) => !!e.name);
    const otherHasNames = other.entries.some((e) => !!e.name);
    if (!winnerHasNames && otherHasNames) {
      merged.entries = other.entries.map((e) => ({ ...e, sets: e.sets.map((s) => ({ ...s })) }));
    }
  }

  return merged;
}

export function dedupeLogs(logs: WorkoutLog[]): { logs: WorkoutLog[]; collapsed: number } {
  const result: WorkoutLog[] = [];
  let collapsed = 0;

  for (const candidate of logs) {
    const idx = result.findIndex((existing) => areConfidentDuplicates(existing, candidate));
    if (idx < 0) {
      result.push(candidate);
      continue;
    }
    collapsed += 1;
    const existing = result[idx];
    const winner =
      logRichnessScore(candidate) > logRichnessScore(existing) ? candidate : existing;
    const other = winner === candidate ? existing : candidate;
    result[idx] = mergeCompatibleFields(winner, other);
  }

  return { logs: result, collapsed };
}

function readBackup(): HistoryBackupDocument | null {
  const raw = safeGetItem(HISTORY_BACKUP_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isObject(parsed) || typeof parsed.createdAt !== "string") return null;
    return parsed as unknown as HistoryBackupDocument;
  } catch {
    return null;
  }
}

function writeRecovery(malformed: HistoryRecoveryDocument["malformed"]): void {
  if (malformed.length === 0) return;
  const existingRaw = safeGetItem(HISTORY_RECOVERY_KEY);
  let existing: HistoryRecoveryDocument = { updatedAt: new Date().toISOString(), malformed: [] };
  if (existingRaw) {
    try {
      const parsed: unknown = JSON.parse(existingRaw);
      if (isObject(parsed) && Array.isArray(parsed.malformed)) {
        existing = parsed as unknown as HistoryRecoveryDocument;
      }
    } catch {
      // replace
    }
  }
  const doc: HistoryRecoveryDocument = {
    updatedAt: new Date().toISOString(),
    malformed: [...existing.malformed, ...malformed].slice(-200)
  };
  safeSetItem(HISTORY_RECOVERY_KEY, JSON.stringify(doc));
}

function getStoredMigrationVersion(): number | null {
  const raw = safeGetItem(HISTORY_MIGRATION_VERSION_KEY);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/**
 * Idempotent History migration. Safe to call on every app launch.
 * Never uses localStorage.clear(). Never replaces History with [].
 */
export function ensureHistoryMigrated(): HistoryMigrationResult {
  const already = getStoredMigrationVersion();
  if (already !== null && already >= HISTORY_MIGRATION_VERSION) {
    const canonical = readCanonicalRawArray();
    return {
      ran: false,
      alreadyComplete: true,
      beforeCanonicalCount: canonical.length,
      afterCanonicalCount: canonical.length,
      importedFromLegacy: 0,
      duplicatesCollapsed: 0,
      malformedCount: 0,
      backupCreated: false
    };
  }

  const sourceKeys = discoverHistorySourceKeys();
  const beforeCanonical = readCanonicalRawArray();
  const beforeCanonicalCount = beforeCanonical.length;

  const collected: WorkoutLog[] = [];
  const malformed: HistoryRecoveryDocument["malformed"] = [];
  let importedFromLegacy = 0;

  const rawByKey: Record<string, string | null> = {};

  for (const key of sourceKeys) {
    const rawText = safeGetItem(key);
    rawByKey[key] = rawText;
    const arr = parseSourceArray(rawText);
    arr.forEach((item, index) => {
      const { log, malformed: bad } = coerceRawRecord(item, key);
      if (bad) {
        malformed.push({ ...bad, index });
        return;
      }
      if (!log) return;
      if (key !== HISTORY_CANONICAL_KEY) importedFromLegacy += 1;
      collected.push(log);
    });
  }

  // If canonical raw was a non-array corrupt blob, preserve it in recovery.
  const canonicalRawText = rawByKey[HISTORY_CANONICAL_KEY];
  if (canonicalRawText) {
    try {
      const parsed: unknown = JSON.parse(canonicalRawText);
      if (!Array.isArray(parsed)) {
        malformed.push({
          sourceKey: HISTORY_CANONICAL_KEY,
          index: -1,
          raw: parsed,
          reason: "canonical-not-array"
        });
      }
    } catch {
      malformed.push({
        sourceKey: HISTORY_CANONICAL_KEY,
        index: -1,
        raw: canonicalRawText,
        reason: "canonical-json-parse-failed"
      });
    }
  }

  const { logs: merged, collapsed } = dedupeLogs(collected);

  // Never write an empty array over a non-empty canonical unless we truly have nothing
  // and canonical was already empty / corrupt.
  if (merged.length === 0 && beforeCanonicalCount > 0) {
    // Prefer keeping previous canonical raw bytes rather than wiping.
    writeRecovery(malformed);
    return {
      ran: true,
      alreadyComplete: false,
      beforeCanonicalCount,
      afterCanonicalCount: beforeCanonicalCount,
      importedFromLegacy: 0,
      duplicatesCollapsed: collapsed,
      malformedCount: malformed.length,
      backupCreated: false
    };
  }

  let backupCreated = false;
  const existingBackup = readBackup();
  if (!existingBackup) {
    const backup: HistoryBackupDocument = {
      createdAt: new Date().toISOString(),
      migrationVersion: HISTORY_MIGRATION_VERSION,
      keys: rawByKey
    };
    backupCreated = safeSetItem(HISTORY_BACKUP_KEY, JSON.stringify(backup));
  }

  const writeOk = writeCanonicalLogs(merged);
  if (!writeOk) {
    writeRecovery(malformed);
    return {
      ran: true,
      alreadyComplete: false,
      beforeCanonicalCount,
      afterCanonicalCount: beforeCanonicalCount,
      importedFromLegacy,
      duplicatesCollapsed: collapsed,
      malformedCount: malformed.length,
      backupCreated
    };
  }

  // Read-back validation
  const readBack = readCanonicalRawArray();
  const readBackValid = readBack
    .map((item) => coerceRawRecord(item, HISTORY_CANONICAL_KEY).log)
    .filter((log): log is WorkoutLog => log !== null);

  if (readBackValid.length < merged.length) {
    // Do not mark migration complete; leave backup for recovery.
    writeRecovery([
      ...malformed,
      {
        sourceKey: HISTORY_CANONICAL_KEY,
        index: -1,
        raw: { expected: merged.length, got: readBackValid.length },
        reason: "readback-count-mismatch"
      }
    ]);
    return {
      ran: true,
      alreadyComplete: false,
      beforeCanonicalCount,
      afterCanonicalCount: readBackValid.length,
      importedFromLegacy,
      duplicatesCollapsed: collapsed,
      malformedCount: malformed.length + 1,
      backupCreated
    };
  }

  writeRecovery(malformed);
  safeSetItem(HISTORY_MIGRATION_VERSION_KEY, String(HISTORY_MIGRATION_VERSION));

  return {
    ran: true,
    alreadyComplete: false,
    beforeCanonicalCount,
    afterCanonicalCount: readBackValid.length,
    importedFromLegacy,
    duplicatesCollapsed: collapsed,
    malformedCount: malformed.length,
    backupCreated: backupCreated || !existingBackup
  };
}

/** Test helper: clear migration marker only (does not touch History). */
export function clearHistoryMigrationMarkerForTests(): void {
  try {
    localStorage.removeItem(HISTORY_MIGRATION_VERSION_KEY);
  } catch {
    // ignore
  }
}
