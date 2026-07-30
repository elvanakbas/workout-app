import { PROGRAM_VERSION } from "../types";
import { isDateKeyFormat } from "../lib/localDate";

export const PROGRAM_SETTINGS_KEY = "workout-app:program:settings:v1";

export interface ProgramScheduleSettings {
  programVersion: string;
  /** Local YYYY-MM-DD for Week 1 Upper A (Workout 1). null = unset. */
  startDateKey: string | null;
  updatedAt: string;
}

export function defaultProgramScheduleSettings(): ProgramScheduleSettings {
  return {
    programVersion: PROGRAM_VERSION,
    startDateKey: null,
    updatedAt: new Date().toISOString()
  };
}

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore quota / private mode
  }
}

export function normalizeProgramScheduleSettings(raw: unknown): ProgramScheduleSettings {
  const base = defaultProgramScheduleSettings();
  if (!raw || typeof raw !== "object") return base;
  const obj = raw as Record<string, unknown>;
  let startDateKey: string | null = null;
  if (typeof obj.startDateKey === "string" && isDateKeyFormat(obj.startDateKey)) {
    startDateKey = obj.startDateKey;
  } else if (obj.startDateKey === null) {
    startDateKey = null;
  }
  return {
    programVersion:
      typeof obj.programVersion === "string" && obj.programVersion.trim()
        ? obj.programVersion
        : PROGRAM_VERSION,
    startDateKey,
    updatedAt:
      typeof obj.updatedAt === "string" && obj.updatedAt.trim()
        ? obj.updatedAt
        : base.updatedAt
  };
}

export function getProgramScheduleSettings(): ProgramScheduleSettings {
  const raw = safeGet(PROGRAM_SETTINGS_KEY);
  if (!raw) return defaultProgramScheduleSettings();
  try {
    return normalizeProgramScheduleSettings(JSON.parse(raw) as unknown);
  } catch {
    return defaultProgramScheduleSettings();
  }
}

/** Partial update — never touches Nutrition storage keys. */
export function saveProgramScheduleSettings(
  partial: Partial<ProgramScheduleSettings>
): ProgramScheduleSettings {
  const current = getProgramScheduleSettings();
  const next = normalizeProgramScheduleSettings({
    ...current,
    ...partial,
    updatedAt: partial.updatedAt ?? new Date().toISOString()
  });
  safeSet(PROGRAM_SETTINGS_KEY, JSON.stringify(next));
  return next;
}

export function clearProgramStartDate(): ProgramScheduleSettings {
  return saveProgramScheduleSettings({ startDateKey: null });
}
