import { clearAllActiveSessionDrafts } from "./activeSessionDraft";
import {
  appendLog as appendHistoryLog,
  ensureHistoryReady,
  getLogs as getHistoryLogs,
  getLogsForExport,
  HISTORY_CANONICAL_KEY
} from "./historyStorage";
import type { WorkoutLog } from "../types";

/**
 * App persistence helpers.
 *
 * History (completed WorkoutLog[]) is owned exclusively by `historyStorage` /
 * `historyMigration`. This module keeps the legacy progress key cleanup and
 * re-exports History APIs so existing imports keep working.
 *
 * Never call localStorage.clear().
 */

const PROGRESS_KEY = "workout-app:v1:progress";

/** @deprecated Prefer importing from historyStorage; kept for call-site stability. */
export const HISTORY_LOGS_KEY = HISTORY_CANONICAL_KEY;

export function getLogs(): WorkoutLog[] {
  return getHistoryLogs();
}

export function appendLog(log: WorkoutLog): void {
  appendHistoryLog(log);
}

export { getLogsForExport, ensureHistoryReady, HISTORY_CANONICAL_KEY };

/**
 * Clears progress leftovers, canonical History, and active drafts.
 * Does NOT clear History migration backup/recovery keys (preserve forensics).
 * Does NOT call localStorage.clear().
 */
export function resetAllData(): void {
  try {
    localStorage.removeItem(PROGRESS_KEY);
  } catch {
    // ignore
  }
  try {
    localStorage.removeItem(HISTORY_CANONICAL_KEY);
  } catch {
    // ignore
  }
  clearAllActiveSessionDrafts();
}
