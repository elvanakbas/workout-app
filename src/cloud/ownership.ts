import {
  CLOUD_LAST_USER_KEY,
  CLOUD_SYNC_STATE_KEY,
  DEFAULT_CLOUD_SYNC_STATE,
  type CloudSyncStateV1,
  type LocalDataSummary
} from "./cloudTypes";

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
    // ignore
  }
}

export function readCloudSyncState(): CloudSyncStateV1 {
  const raw = safeGet(CLOUD_SYNC_STATE_KEY);
  if (!raw) return { ...DEFAULT_CLOUD_SYNC_STATE };
  try {
    const parsed = JSON.parse(raw) as Partial<CloudSyncStateV1>;
    return {
      ...DEFAULT_CLOUD_SYNC_STATE,
      ...parsed,
      version: 1
    };
  } catch {
    return { ...DEFAULT_CLOUD_SYNC_STATE };
  }
}

export function writeCloudSyncState(state: CloudSyncStateV1): void {
  safeSet(CLOUD_SYNC_STATE_KEY, JSON.stringify({ ...state, version: 1 }));
  if (state.lastUserId) {
    safeSet(CLOUD_LAST_USER_KEY, state.lastUserId);
  } else {
    try {
      localStorage.removeItem(CLOUD_LAST_USER_KEY);
    } catch {
      // ignore
    }
  }
}

export function readLastCloudUserId(): string | null {
  const fromState = readCloudSyncState().lastUserId;
  if (fromState) return fromState;
  return safeGet(CLOUD_LAST_USER_KEY);
}

export type OwnershipSituation =
  | "no-local-data"
  | "unowned-local"
  | "same-user"
  | "different-user"
  | "first-resolve-needed";

/**
 * Ownership state machine (local browser ↔ cloud user).
 *
 * - Signed-out local data is unowned until first successful merge for a user.
 * - Sign-out does NOT clear lastUserId / ownershipResolved (prevents silent re-upload as unowned).
 * - Different user → never silent upload; require explicit keep-local / load-cloud / cancel.
 * - Same user with ownershipResolved → normal sync, no first-sync prompt.
 */
export function classifyOwnership(
  signedInUserId: string,
  localSummary: LocalDataSummary
): OwnershipSituation {
  const state = readCloudSyncState();
  const last = state.lastUserId ?? readLastCloudUserId();
  const hasLocal =
    localSummary.historyCount > 0 ||
    localSummary.nutritionDayCount > 0 ||
    localSummary.draftCount > 0;

  if (!hasLocal && !state.ownershipResolved) {
    return "no-local-data";
  }

  if (last && last !== signedInUserId) {
    return "different-user";
  }

  if (last === signedInUserId && state.ownershipResolved) {
    return "same-user";
  }

  if (hasLocal && !state.ownershipResolved) {
    return last === signedInUserId ? "first-resolve-needed" : "unowned-local";
  }

  if (!hasLocal && last === signedInUserId) {
    return "same-user";
  }

  return hasLocal ? "unowned-local" : "no-local-data";
}

export function markOwnershipResolved(userId: string): void {
  const state = readCloudSyncState();
  writeCloudSyncState({
    ...state,
    lastUserId: userId,
    ownershipResolved: true,
    lastError: null
  });
}

export function markSyncSuccess(userId: string): void {
  const state = readCloudSyncState();
  writeCloudSyncState({
    ...state,
    lastUserId: userId,
    ownershipResolved: true,
    lastSuccessfulSyncAt: new Date().toISOString(),
    pendingUpload: false,
    lastError: null
  });
}

export function markSyncError(message: string): void {
  const state = readCloudSyncState();
  writeCloudSyncState({
    ...state,
    lastError: message,
    pendingUpload: true
  });
}

export function markPendingUpload(): void {
  const state = readCloudSyncState();
  writeCloudSyncState({ ...state, pendingUpload: true });
}

/**
 * Sign-out: clear pending flags/errors but keep lastUserId + ownershipResolved
 * so the next sign-in knows this browser was associated with an account.
 */
export function onSignOutPreserveOwnership(): void {
  const state = readCloudSyncState();
  writeCloudSyncState({
    ...state,
    pendingUpload: false,
    lastError: null,
    settingsConflictPending: false
  });
}
