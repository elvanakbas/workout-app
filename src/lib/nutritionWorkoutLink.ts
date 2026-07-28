import type { WorkoutLog } from "../types";
import { isoToLocalDateKey } from "./localDate";

/**
 * Local calendar date for a completed workout log.
 * Prefer startedAt when present; fall back to completedAt.
 * Never uses UTC date slicing.
 */
export function workoutLogLocalDateKey(log: WorkoutLog): string | null {
  const fromStart = isoToLocalDateKey(log.startedAt);
  if (fromStart) return fromStart;
  return isoToLocalDateKey(log.completedAt);
}

/**
 * Completed History logs whose local date matches `dateKey`.
 * Order: earliest matching timestamp first (stable for UI lists).
 */
export function completedWorkoutsForLocalDate(
  logs: WorkoutLog[],
  dateKey: string
): WorkoutLog[] {
  const matched = logs.filter((log) => workoutLogLocalDateKey(log) === dateKey);
  return matched.sort((a, b) => {
    const aIso = a.startedAt || a.completedAt;
    const bIso = b.startedAt || b.completedAt;
    return Date.parse(aIso) - Date.parse(bIso);
  });
}
