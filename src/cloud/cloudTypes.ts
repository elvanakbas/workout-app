import type { ActiveSessionDraft, WorkoutLog } from "../types";
import type { NutritionDay, NutritionSettings } from "../types/nutrition";
import type { ProgramScheduleSettings } from "../storage/programSettings";

export type SyncUiStatus =
  | "local-only"
  | "not-configured"
  | "syncing"
  | "synced"
  | "offline"
  | "needs-attention"
  | "awaiting-ownership";

export type CloudOwnershipDecision =
  | "merge-local"
  | "download-cloud-only"
  | "cancel"
  | "keep-local-separate";

export type SettingsConflictChoice = "use-device" | "use-cloud";

export interface CloudSyncStateV1 {
  version: 1;
  lastUserId: string | null;
  lastSuccessfulSyncAt: string | null;
  pendingUpload: boolean;
  lastError: string | null;
  ownershipResolved: boolean;
  settingsConflictPending: boolean;
}

export interface LocalDataSummary {
  historyCount: number;
  nutritionDayCount: number;
  draftCount: number;
  hasSettings: boolean;
  completedOrderCount: number;
}

export interface WorkoutProgressPayload {
  completedOrders: number[];
  updatedAt: string;
}

export interface UserSettingsPayload {
  nutrition: NutritionSettings;
  /** Namespaced program schedule — merge independently of nutrition. */
  schedule?: ProgramScheduleSettings;
  updatedAt: string;
}

export interface NutritionDayCloudPayload {
  dateKey: string;
  entries: NutritionDay["entries"];
  updatedAt: string;
  deletedEntryIds?: string[];
}

export interface CloudSnapshot {
  logs: WorkoutLog[];
  nutritionDays: NutritionDayCloudPayload[];
  settings: UserSettingsPayload | null;
  progress: WorkoutProgressPayload | null;
  drafts: ActiveSessionDraft[];
}

export const CLOUD_LAST_USER_KEY = "workout-app:cloud:last-user-id";
export const CLOUD_SYNC_STATE_KEY = "workout-app:cloud:sync-state:v1";
export const CLOUD_PENDING_QUEUE_KEY = "workout-app:cloud:pending-queue:v1";

export const DEFAULT_CLOUD_SYNC_STATE: CloudSyncStateV1 = {
  version: 1,
  lastUserId: null,
  lastSuccessfulSyncAt: null,
  pendingUpload: false,
  lastError: null,
  ownershipResolved: false,
  settingsConflictPending: false
};
