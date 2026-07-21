import type { WorkoutLog } from "../types";

/**
 * All persisted data lives under versioned keys so a future schema change
 * can migrate or reset cleanly without clobbering unrelated data.
 *
 * `progress` is a legacy key from an earlier "strict sequential lock"
 * design and is no longer written. It's still removed by `resetAllData`
 * for anyone with that leftover key from before flexible scheduling.
 */
const KEYS = {
  progress: "workout-app:v1:progress",
  logs: "workout-app:v1:logs"
} as const;

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    // Corrupt or unreadable data should never crash the app - fall back
    // to a safe default instead.
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage can throw (e.g. quota exceeded, private browsing). This
    // is a local-only hobby app, so we swallow the error rather than crash;
    // the in-memory state for this session still works.
  }
}

export function getLogs(): WorkoutLog[] {
  return readJson<WorkoutLog[]>(KEYS.logs, []);
}

export function appendLog(log: WorkoutLog): void {
  const logs = getLogs();
  logs.push(log);
  writeJson(KEYS.logs, logs);
}

/** Clears all locally stored progress and history. Used for manual testing/reset. */
export function resetAllData(): void {
  localStorage.removeItem(KEYS.progress);
  localStorage.removeItem(KEYS.logs);
}
