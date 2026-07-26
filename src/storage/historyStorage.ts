import type { WorkoutLog } from "../types";
import { normalizeWorkoutLogs } from "../lib/workoutLogNormalize";
import {
  HISTORY_CANONICAL_KEY,
  ensureHistoryMigrated,
  readCanonicalRawArray,
  writeCanonicalLogs
} from "./historyMigration";

/**
 * Canonical History storage API.
 *
 * All History reads/writes go through this module. Callers must not touch
 * History localStorage keys directly.
 */

export { HISTORY_CANONICAL_KEY };

/** Return normalized valid logs from the canonical store (runs migration first). */
export function getLogs(): WorkoutLog[] {
  ensureHistoryMigrated();
  return normalizeWorkoutLogs(readCanonicalRawArray());
}

/** Append one completed log without rewriting unrelated/malformed siblings. */
export function appendLog(log: WorkoutLog): void {
  ensureHistoryMigrated();
  const raw = readCanonicalRawArray();
  raw.push(log);
  writeCanonicalLogs(raw);
}

/**
 * Read-only snapshot for export. Does not mutate History.
 * Malformed items are omitted from the returned collection.
 */
export function getLogsForExport(): WorkoutLog[] {
  return getLogs();
}

/** Expose migration ensure for app bootstrap / tests. */
export function ensureHistoryReady(): void {
  ensureHistoryMigrated();
}
