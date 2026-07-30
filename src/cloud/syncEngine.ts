import type { ActiveSessionDraft, WorkoutLog } from "../types";
import { getLogs } from "../storage/historyStorage";
import { writeCanonicalLogs } from "../storage/historyMigration";
import {
  getAllNutritionDays,
  getNutritionSettings,
  saveNutritionSettings,
  saveNutritionDay
} from "../storage/nutritionStorage";
import {
  getProgramScheduleSettings,
  saveProgramScheduleSettings
} from "../storage/programSettings";
import {
  clearActiveSessionDraft,
  listActiveSessionDrafts,
  saveActiveSessionDraft
} from "../storage/activeSessionDraft";
import { getCompletedOrders } from "../lib/progress";
import { getSupabaseClient, isCloudConfigured } from "./supabaseClient";
import {
  classifyOwnership,
  markOwnershipResolved,
  markPendingUpload,
  markSyncError,
  markSyncSuccess,
  readCloudSyncState,
  writeCloudSyncState
} from "./ownership";
import {
  fromCloudNutritionDay,
  mergeDrafts,
  mergeNutritionDays,
  mergeProgress,
  mergeSettings,
  mergeWorkoutLogs,
  toCloudNutritionDay
} from "./mergeRules";
import type {
  CloudSnapshot,
  LocalDataSummary,
  NutritionDayCloudPayload,
  SettingsConflictChoice,
  SyncUiStatus,
  UserSettingsPayload,
  WorkoutProgressPayload
} from "./cloudTypes";

let syncInFlight: Promise<SyncResult> | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export interface SyncResult {
  ok: boolean;
  status: SyncUiStatus;
  message?: string;
  ownership?: ReturnType<typeof classifyOwnership>;
  needsSettingsChoice?: boolean;
  summary?: LocalDataSummary;
}

export function summarizeLocalData(): LocalDataSummary {
  const logs = getLogs();
  const days = getAllNutritionDays();
  const drafts = listActiveSessionDrafts();
  return {
    historyCount: logs.length,
    nutritionDayCount: days.filter((d) => d.entries.length > 0).length,
    draftCount: drafts.length,
    hasSettings: true,
    completedOrderCount: getCompletedOrders(logs).size
  };
}

function localSettingsPayload(): UserSettingsPayload {
  const state = readCloudSyncState();
  const schedule = getProgramScheduleSettings();
  return {
    nutrition: getNutritionSettings(),
    schedule,
    updatedAt: state.lastSuccessfulSyncAt ?? schedule.updatedAt ?? new Date().toISOString()
  };
}

function localProgressPayload(): WorkoutProgressPayload {
  const orders = [...getCompletedOrders(getLogs())];
  return {
    completedOrders: orders,
    updatedAt: new Date().toISOString()
  };
}

function localNutritionCloudDays(): NutritionDayCloudPayload[] {
  return getAllNutritionDays().map((d) => toCloudNutritionDay(d));
}

async function pullCloudSnapshot(userId: string): Promise<CloudSnapshot> {
  const sb = getSupabaseClient();
  if (!sb) {
    return { logs: [], nutritionDays: [], settings: null, progress: null, drafts: [] };
  }

  const [logsRes, daysRes, settingsRes, progressRes, draftsRes] = await Promise.all([
    sb.from("workout_logs").select("payload").eq("user_id", userId).is("deleted_at", null),
    sb.from("nutrition_days").select("payload, updated_at, date_key").eq("user_id", userId).is("deleted_at", null),
    sb.from("user_settings").select("payload, updated_at").eq("user_id", userId).maybeSingle(),
    sb.from("workout_progress").select("payload, updated_at").eq("user_id", userId).maybeSingle(),
    sb.from("active_drafts").select("payload").eq("user_id", userId)
  ]);

  if (logsRes.error) throw new Error(logsRes.error.message);
  if (daysRes.error) throw new Error(daysRes.error.message);
  if (settingsRes.error) throw new Error(settingsRes.error.message);
  if (progressRes.error) throw new Error(progressRes.error.message);
  if (draftsRes.error) throw new Error(draftsRes.error.message);

  const logs = (logsRes.data ?? [])
    .map((row) => row.payload as WorkoutLog)
    .filter((l) => l && typeof l.id === "string");

  const nutritionDays: NutritionDayCloudPayload[] = (daysRes.data ?? []).map((row) => {
    const payload = row.payload as NutritionDayCloudPayload;
    return {
      ...payload,
      dateKey: payload.dateKey ?? String(row.date_key),
      updatedAt: payload.updatedAt ?? row.updated_at
    };
  });

  const settings: UserSettingsPayload | null = settingsRes.data
    ? {
        nutrition: (settingsRes.data.payload as UserSettingsPayload).nutrition,
        schedule: (settingsRes.data.payload as UserSettingsPayload).schedule,
        updatedAt:
          (settingsRes.data.payload as UserSettingsPayload).updatedAt ??
          settingsRes.data.updated_at
      }
    : null;

  const progress: WorkoutProgressPayload | null = progressRes.data
    ? {
        completedOrders: (progressRes.data.payload as WorkoutProgressPayload).completedOrders ?? [],
        updatedAt:
          (progressRes.data.payload as WorkoutProgressPayload).updatedAt ??
          progressRes.data.updated_at
      }
    : null;

  const drafts = (draftsRes.data ?? [])
    .map((row) => row.payload as ActiveSessionDraft)
    .filter((d) => d && typeof d.workoutId === "string");

  return { logs, nutritionDays, settings, progress, drafts };
}

async function pushSnapshot(userId: string, snap: {
  logs: WorkoutLog[];
  nutritionDays: NutritionDayCloudPayload[];
  settings: UserSettingsPayload | null;
  progress: WorkoutProgressPayload;
  drafts: ActiveSessionDraft[];
}): Promise<void> {
  const sb = getSupabaseClient();
  if (!sb) throw new Error("Cloud sync not configured");

  if (snap.logs.length > 0) {
    const rows = snap.logs.map((log) => ({
      user_id: userId,
      id: log.id,
      workout_id: log.workoutId,
      completed_at: log.completedAt,
      started_at: log.startedAt ?? null,
      schema_version: log.schemaVersion ?? null,
      payload: log,
      deleted_at: null
    }));
    const { error } = await sb.from("workout_logs").upsert(rows, { onConflict: "user_id,id" });
    if (error) throw new Error(error.message);
  }

  if (snap.nutritionDays.length > 0) {
    const rows = snap.nutritionDays.map((day) => ({
      user_id: userId,
      date_key: day.dateKey,
      payload: day,
      deleted_at: null
    }));
    const { error } = await sb.from("nutrition_days").upsert(rows, { onConflict: "user_id,date_key" });
    if (error) throw new Error(error.message);
  }

  if (snap.settings) {
    const { error } = await sb.from("user_settings").upsert(
      {
        user_id: userId,
        payload: snap.settings
      },
      { onConflict: "user_id" }
    );
    if (error) throw new Error(error.message);
  }

  {
    const { error } = await sb.from("workout_progress").upsert(
      {
        user_id: userId,
        payload: snap.progress
      },
      { onConflict: "user_id" }
    );
    if (error) throw new Error(error.message);
  }

  // Replace drafts: upsert current, delete missing cloud-side for this user that are no longer local.
  if (snap.drafts.length > 0) {
    const rows = snap.drafts.map((d) => ({
      user_id: userId,
      workout_id: d.workoutId,
      payload: d
    }));
    const { error } = await sb.from("active_drafts").upsert(rows, {
      onConflict: "user_id,workout_id"
    });
    if (error) throw new Error(error.message);
  }

  const localIds = new Set(snap.drafts.map((d) => d.workoutId));
  const { data: remoteDrafts, error: listErr } = await sb
    .from("active_drafts")
    .select("workout_id")
    .eq("user_id", userId);
  if (listErr) throw new Error(listErr.message);
  const toDelete = (remoteDrafts ?? [])
    .map((r) => r.workout_id as string)
    .filter((id) => !localIds.has(id));
  if (toDelete.length > 0) {
    const { error } = await sb
      .from("active_drafts")
      .delete()
      .eq("user_id", userId)
      .in("workout_id", toDelete);
    if (error) throw new Error(error.message);
  }
}

function applyMergedLocal(merged: {
  logs: WorkoutLog[];
  nutritionDays: NutritionDayCloudPayload[];
  settings: UserSettingsPayload | null;
  drafts: ActiveSessionDraft[];
}): void {
  // Never write empty over non-empty for History.
  const currentLogs = getLogs();
  if (merged.logs.length > 0 || currentLogs.length === 0) {
    writeCanonicalLogs(merged.logs);
  }

  for (const day of merged.nutritionDays) {
    saveNutritionDay(fromCloudNutritionDay(day));
  }

  if (merged.settings) {
    saveNutritionSettings(merged.settings.nutrition);
    if (merged.settings.schedule) {
      saveProgramScheduleSettings(merged.settings.schedule);
    }
  }

  const currentDraftIds = new Set(listActiveSessionDrafts().map((d) => d.workoutId));
  const mergedIds = new Set(merged.drafts.map((d) => d.workoutId));
  for (const d of merged.drafts) {
    saveActiveSessionDraft(d, { preserveUpdatedAt: true });
  }
  for (const id of currentDraftIds) {
    if (!mergedIds.has(id)) clearActiveSessionDraft(id);
  }
}

export async function runCloudSync(options?: {
  userId: string;
  forceOwnership?: "merge-local" | "download-cloud-only";
  settingsChoice?: SettingsConflictChoice;
  skipOwnershipGate?: boolean;
}): Promise<SyncResult> {
  if (!isCloudConfigured()) {
    return { ok: true, status: "not-configured", message: "Cloud sync not configured" };
  }
  if (typeof navigator !== "undefined" && "onLine" in navigator && navigator.onLine === false) {
    markPendingUpload();
    return { ok: false, status: "offline", message: "Offline — changes stay on this device" };
  }

  // Queue callers so ownership decisions / settings choices are not dropped onto an
  // in-flight "awaiting-ownership" probe that ignored their options.
  const run = async (): Promise<SyncResult> => {
    try {
      const userId = options?.userId;
      if (!userId) {
        return { ok: false, status: "local-only", message: "Not signed in" };
      }

      const summary = summarizeLocalData();
      const ownership = classifyOwnership(userId, summary);

      if (
        !options?.skipOwnershipGate &&
        !options?.forceOwnership &&
        (ownership === "unowned-local" ||
          ownership === "first-resolve-needed" ||
          ownership === "different-user")
      ) {
        return {
          ok: false,
          status: "awaiting-ownership",
          ownership,
          summary,
          message: "Confirm how to handle data on this device"
        };
      }

      if (options?.forceOwnership === "download-cloud-only") {
        const cloud = await pullCloudSnapshot(userId);
        // Empty cloud must not wipe non-empty local when user chose download-only on empty account —
        // still apply cloud when present; if cloud empty keep local but mark ownership.
        if (
          cloud.logs.length > 0 ||
          cloud.nutritionDays.length > 0 ||
          cloud.settings ||
          cloud.drafts.length > 0
        ) {
          applyMergedLocal({
            logs: cloud.logs.length > 0 ? cloud.logs : getLogs(),
            nutritionDays:
              cloud.nutritionDays.length > 0
                ? cloud.nutritionDays
                : localNutritionCloudDays(),
            settings: cloud.settings ?? localSettingsPayload(),
            drafts: cloud.drafts.length > 0 ? cloud.drafts : listActiveSessionDrafts()
          });
        }
        markOwnershipResolved(userId);
        markSyncSuccess(userId);
        return { ok: true, status: "synced", ownership: "same-user", summary: summarizeLocalData() };
      }

      // merge-local or same-user / no-local-data path
      const cloud = await pullCloudSnapshot(userId);
      const localLogs = getLogs();
      const localDays = localNutritionCloudDays();
      const localSettings = localSettingsPayload();
      const localProgress = localProgressPayload();
      const localDrafts = listActiveSessionDrafts();

      // Empty cloud never wipes local; empty local never wipes cloud — merge handles both.
      const mergedLogs = mergeWorkoutLogs(localLogs, cloud.logs);
      const mergedDays = mergeNutritionDays(localDays, cloud.nutritionDays);
      const settingsMerge = mergeSettings(
        localSettings,
        cloud.settings,
        options?.settingsChoice
      );
      if (settingsMerge.needsChoice) {
        const state = readCloudSyncState();
        writeCloudSyncState({ ...state, settingsConflictPending: true });
        return {
          ok: false,
          status: "needs-attention",
          needsSettingsChoice: true,
          message: "Choose whether to keep this device’s targets or cloud targets"
        };
      }

      const mergedProgress = mergeProgress(localProgress, cloud.progress);
      const mergedDrafts = mergeDrafts(localDrafts, cloud.drafts);

      applyMergedLocal({
        logs: mergedLogs,
        nutritionDays: mergedDays,
        settings: settingsMerge.settings,
        drafts: mergedDrafts
      });

      await pushSnapshot(userId, {
        logs: mergedLogs,
        nutritionDays: mergedDays,
        settings: settingsMerge.settings,
        progress: mergedProgress,
        drafts: mergedDrafts
      });

      // Read-back validation (counts)
      const verify = await pullCloudSnapshot(userId);
      if (verify.logs.length < mergedLogs.length) {
        throw new Error("Cloud read-back History count lower than merged local");
      }

      markOwnershipResolved(userId);
      markSyncSuccess(userId);
      const state = readCloudSyncState();
      writeCloudSyncState({ ...state, settingsConflictPending: false });

      return {
        ok: true,
        status: "synced",
        ownership: "same-user",
        summary: summarizeLocalData()
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sync failed";
      markSyncError(message);
      // Preserve all local data on failure.
      return { ok: false, status: "needs-attention", message };
    }
  };

  const queued = (syncInFlight ?? Promise.resolve()).then(run, run);
  syncInFlight = queued.finally(() => {
    if (syncInFlight === queued) syncInFlight = null;
  });
  return queued;
}

export function scheduleCloudSync(userId: string | null, delayMs = 1200): void {
  if (!userId || !isCloudConfigured()) return;
  markPendingUpload();
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    void runCloudSync({ userId, skipOwnershipGate: true });
  }, delayMs);
}

export function getSyncUiStatus(signedIn: boolean): SyncUiStatus {
  if (!isCloudConfigured()) return "not-configured";
  if (!signedIn) return "local-only";
  if (typeof navigator !== "undefined" && "onLine" in navigator && navigator.onLine === false) return "offline";
  const state = readCloudSyncState();
  if (state.settingsConflictPending) return "needs-attention";
  if (syncInFlight) return "syncing";
  if (state.lastError) return "needs-attention";
  if (state.pendingUpload) return "syncing";
  if (state.lastSuccessfulSyncAt) return "synced";
  return "local-only";
}

/** After workout completion, remove matching cloud draft once log sync is attempted. */
export async function syncAfterWorkoutComplete(
  userId: string | null,
  workoutId: string
): Promise<void> {
  if (!userId) return;
  clearActiveSessionDraft(workoutId);
  await runCloudSync({ userId, skipOwnershipGate: true });
}

export function __resetSyncLockForTests(): void {
  syncInFlight = null;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = null;
}
