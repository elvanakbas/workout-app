import type { ActiveSessionDraft, WorkoutLog } from "../types";
import { PROGRAM_VERSION } from "../types";
import type { NutritionDay, NutritionEntry, NutritionSettings } from "../types/nutrition";
import { logRichnessScore, areConfidentDuplicates, mergeCompatibleFields } from "../storage/historyMigration";
import type { ProgramScheduleSettings } from "../storage/programSettings";
import type {
  NutritionDayCloudPayload,
  SettingsConflictChoice,
  UserSettingsPayload,
  WorkoutProgressPayload
} from "./cloudTypes";

function parseTime(iso: string | undefined | null): number {
  if (!iso) return 0;
  const n = Date.parse(iso);
  return Number.isFinite(n) ? n : 0;
}

/** Merge History by stable ID; richer compatible record wins; never drop distinct logs. */
export function mergeWorkoutLogs(local: WorkoutLog[], cloud: WorkoutLog[]): WorkoutLog[] {
  const byId = new Map<string, WorkoutLog>();

  for (const log of [...cloud, ...local]) {
    if (!log?.id) continue;
    const existing = byId.get(log.id);
    if (!existing) {
      byId.set(log.id, log);
      continue;
    }
    const winner = logRichnessScore(log) >= logRichnessScore(existing) ? log : existing;
    const other = winner === log ? existing : log;
    byId.set(log.id, mergeCompatibleFields(winner, other));
  }

  // Collapse confident duplicates with different IDs (legacy) without dropping same-day distinct workouts.
  const list = [...byId.values()];
  const result: WorkoutLog[] = [];
  for (const candidate of list) {
    const idx = result.findIndex((e) => areConfidentDuplicates(e, candidate));
    if (idx < 0) {
      result.push(candidate);
      continue;
    }
    const existing = result[idx];
    const winner =
      logRichnessScore(candidate) >= logRichnessScore(existing) ? candidate : existing;
    const other = winner === candidate ? existing : candidate;
    result[idx] = mergeCompatibleFields(winner, other);
  }
  return result;
}

function pickEntry(
  a: NutritionEntry,
  b: NutritionEntry
): NutritionEntry {
  const aT = parseTime(a.updatedAt ?? a.createdAt);
  const bT = parseTime(b.updatedAt ?? b.createdAt);
  if (bT > aT) return b;
  if (aT > bT) return a;
  // Prefer the one that has updatedAt set when times equal.
  if (b.updatedAt && !a.updatedAt) return b;
  return a;
}

/**
 * Merge Nutrition days by dateKey and entries by ID.
 * Day winner is the higher updatedAt; deletedEntryIds from the newer side win
 * and strip resurrected entries from the older side.
 */
export function mergeNutritionDays(
  local: NutritionDayCloudPayload[],
  cloud: NutritionDayCloudPayload[]
): NutritionDayCloudPayload[] {
  const keys = new Set([...local.map((d) => d.dateKey), ...cloud.map((d) => d.dateKey)]);
  const localMap = new Map(local.map((d) => [d.dateKey, d]));
  const cloudMap = new Map(cloud.map((d) => [d.dateKey, d]));
  const out: NutritionDayCloudPayload[] = [];

  for (const dateKey of keys) {
    const l = localMap.get(dateKey);
    const c = cloudMap.get(dateKey);
    if (l && !c) {
      out.push(l);
      continue;
    }
    if (c && !l) {
      out.push(c);
      continue;
    }
    if (!l || !c) continue;

    const newer = parseTime(c.updatedAt) >= parseTime(l.updatedAt) ? c : l;
    const older = newer === c ? l : c;
    const deleted = new Set([...(newer.deletedEntryIds ?? []), ...(older.deletedEntryIds ?? [])]);

    const byId = new Map<string, NutritionEntry>();
    for (const entry of [...older.entries, ...newer.entries]) {
      if (deleted.has(entry.id)) continue;
      const prev = byId.get(entry.id);
      byId.set(entry.id, prev ? pickEntry(prev, entry) : entry);
    }

    // If newer explicitly deleted an ID, ensure it stays gone even if older still has it.
    for (const id of newer.deletedEntryIds ?? []) {
      byId.delete(id);
      deleted.add(id);
    }

    out.push({
      dateKey,
      entries: [...byId.values()].sort((a, b) => parseTime(a.createdAt) - parseTime(b.createdAt)),
      updatedAt:
        parseTime(c.updatedAt) >= parseTime(l.updatedAt) ? c.updatedAt : l.updatedAt,
      deletedEntryIds: deleted.size > 0 ? [...deleted] : undefined
    });
  }

  return out.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
}

export function toCloudNutritionDay(day: NutritionDay, updatedAt?: string): NutritionDayCloudPayload {
  return {
    dateKey: day.dateKey,
    entries: day.entries,
    updatedAt: updatedAt ?? day.updatedAt ?? new Date().toISOString(),
    deletedEntryIds: day.deletedEntryIds ?? []
  };
}

export function fromCloudNutritionDay(day: NutritionDayCloudPayload): NutritionDay {
  const deleted = new Set(day.deletedEntryIds ?? []);
  return {
    dateKey: day.dateKey,
    entries: day.entries.filter((e) => !deleted.has(e.id)),
    updatedAt: day.updatedAt,
    deletedEntryIds: day.deletedEntryIds
  };
}

/**
 * Merge namespaced schedule settings.
 * Empty startDateKey never erases a non-empty value from the other side.
 */
export function mergeScheduleSettings(
  local: ProgramScheduleSettings | undefined,
  cloud: ProgramScheduleSettings | undefined
): { schedule: ProgramScheduleSettings | undefined; needsChoice: boolean } {
  if (!local && !cloud) return { schedule: undefined, needsChoice: false };
  if (local && !cloud) return { schedule: local, needsChoice: false };
  if (cloud && !local) return { schedule: cloud, needsChoice: false };

  const l = local!;
  const c = cloud!;
  const lStart = l.startDateKey;
  const cStart = c.startDateKey;

  if (lStart && cStart && lStart !== cStart) {
    return { schedule: undefined, needsChoice: true };
  }

  const startDateKey = lStart || cStart || null;
  const updatedAt =
    parseTime(c.updatedAt) >= parseTime(l.updatedAt) ? c.updatedAt : l.updatedAt;
  const programVersion =
    parseTime(c.updatedAt) >= parseTime(l.updatedAt) ? c.programVersion : l.programVersion;

  return {
    schedule: {
      programVersion: programVersion || l.programVersion || c.programVersion,
      startDateKey,
      updatedAt
    },
    needsChoice: false
  };
}

/**
 * Settings: merge nutrition and schedule as namespaced fields.
 * Empty schedule must not erase non-empty cloud schedule.
 * Conflicting non-empty nutrition targets or start dates → needsChoice.
 * Explicit nutrition choice never implicitly deletes the other side's schedule.
 */
export function mergeSettings(
  local: UserSettingsPayload | null,
  cloud: UserSettingsPayload | null,
  choice?: SettingsConflictChoice
): { settings: UserSettingsPayload | null; needsChoice: boolean } {
  if (!local && !cloud) return { settings: null, needsChoice: false };
  if (local && !cloud) return { settings: local, needsChoice: false };
  if (cloud && !local) return { settings: cloud, needsChoice: false };

  const nutritionSame =
    local!.nutrition.calorieTarget === cloud!.nutrition.calorieTarget &&
    local!.nutrition.proteinTargetGrams === cloud!.nutrition.proteinTargetGrams;

  const scheduleMerge = mergeScheduleSettings(local!.schedule, cloud!.schedule);

  if (!nutritionSame || scheduleMerge.needsChoice) {
    if (!choice) return { settings: null, needsChoice: true };
    const picked = choice === "use-device" ? local! : cloud!;
    const other = choice === "use-device" ? cloud! : local!;
    // Always apply empty-start-safe schedule merge independently of nutrition choice.
    // Conflicting non-empty dates: honor the picked side (user chose that device).
    const scheduleOnChoice = mergeScheduleSettings(picked.schedule, other.schedule);
    const schedule = scheduleOnChoice.needsChoice
      ? (picked.schedule ?? other.schedule)
      : scheduleOnChoice.schedule;
    return {
      settings: {
        nutrition: picked.nutrition,
        schedule,
        updatedAt: picked.updatedAt
      },
      needsChoice: false
    };
  }

  const updatedAt =
    parseTime(cloud!.updatedAt) >= parseTime(local!.updatedAt)
      ? cloud!.updatedAt
      : local!.updatedAt;

  return {
    settings: {
      nutrition: local!.nutrition,
      schedule: scheduleMerge.schedule,
      updatedAt
    },
    needsChoice: false
  };
}

export function mergeProgress(
  local: WorkoutProgressPayload | null,
  cloud: WorkoutProgressPayload | null
): WorkoutProgressPayload {
  const set = new Set<number>();
  for (const n of local?.completedOrders ?? []) {
    if (Number.isFinite(n)) set.add(n);
  }
  for (const n of cloud?.completedOrders ?? []) {
    if (Number.isFinite(n)) set.add(n);
  }
  const updatedAtCandidates = [local?.updatedAt, cloud?.updatedAt].filter(Boolean) as string[];
  const updatedAt =
    updatedAtCandidates.sort((a, b) => parseTime(b) - parseTime(a))[0] ??
    new Date().toISOString();
  return {
    completedOrders: [...set].sort((a, b) => a - b),
    updatedAt
  };
}

/** Higher = more compatible with current program identity draft shape. */
export function draftProgramRank(draft: ActiveSessionDraft): number {
  if (draft.programVersion === PROGRAM_VERSION) return 2;
  if (typeof draft.programVersion === "string" && draft.programVersion.startsWith("v3")) return 1;
  return 0;
}

/** Newer draft wins within the same program rank; V3 migrated beats pre-V3 layout. */
export function mergeDrafts(
  local: ActiveSessionDraft[],
  cloud: ActiveSessionDraft[]
): ActiveSessionDraft[] {
  const map = new Map<string, ActiveSessionDraft>();
  for (const d of cloud) {
    if (d?.workoutId) map.set(d.workoutId, d);
  }
  for (const d of local) {
    if (!d?.workoutId) continue;
    const existing = map.get(d.workoutId);
    if (!existing) {
      map.set(d.workoutId, d);
      continue;
    }
    const localRank = draftProgramRank(d);
    const cloudRank = draftProgramRank(existing);
    if (localRank !== cloudRank) {
      map.set(d.workoutId, localRank > cloudRank ? d : existing);
      continue;
    }
    const lT = parseTime(d.updatedAt);
    const cT = parseTime(existing.updatedAt);
    if (lT >= cT) map.set(d.workoutId, d);
  }
  return [...map.values()];
}

export function settingsEqual(a: NutritionSettings, b: NutritionSettings): boolean {
  return a.calorieTarget === b.calorieTarget && a.proteinTargetGrams === b.proteinTargetGrams;
}
