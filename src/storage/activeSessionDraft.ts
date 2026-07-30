import type { ActiveSessionDraft, ExerciseLog, SessionFeedback } from "../types";

/**
 * Versioned active-session draft store. Separate from completed WorkoutLog
 * history (`workout-app:v1:logs`) so unfinished sessions survive navigation,
 * refresh, and PWA reopen without polluting completed history.
 *
 * Storage key is Phase 2: `workout-app:v2:active-drafts`. Valid drafts from
 * the legacy `workout-app:v1:active-drafts` key are migrated once on first
 * read so an in-progress gym session is not lost after the Phase 2 upgrade.
 */
const DRAFTS_KEY = "workout-app:v2:active-drafts";
const LEGACY_DRAFTS_KEY = "workout-app:v1:active-drafts";

/** Current ActiveSessionDraft.document schema version accepted by normalize. */
export const ACTIVE_DRAFT_SCHEMA_VERSION = 1 as const;

type DraftMap = Record<string, ActiveSessionDraft>;

const DEFAULT_FEEDBACK: SessionFeedback = {
  difficulty: 5,
  energy: "normal",
  lowerBackPain: 0,
  kneePain: 0,
  shoulderPain: 0,
  note: ""
};

let legacyMigrationAttempted = false;

function readRawMap(key: string): DraftMap {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as DraftMap;
  } catch {
    return {};
  }
}

function writeDraftMap(map: DraftMap): void {
  try {
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(map));
  } catch {
    // Quota / private mode - keep in-memory session usable.
  }
}

/**
 * One-time copy of valid legacy v1 drafts into the v2 key. Malformed legacy
 * entries are skipped (fail-safe). Legacy key is removed after a successful
 * migration attempt so we do not keep rewriting history-adjacent storage.
 */
function migrateLegacyDraftsIfNeeded(): void {
  if (legacyMigrationAttempted) return;
  legacyMigrationAttempted = true;

  let legacyRaw: string | null = null;
  try {
    legacyRaw = localStorage.getItem(LEGACY_DRAFTS_KEY);
  } catch {
    return;
  }
  if (!legacyRaw) return;

  const legacyMap = readRawMap(LEGACY_DRAFTS_KEY);
  const current = readRawMap(DRAFTS_KEY);
  let changed = false;

  for (const [workoutId, raw] of Object.entries(legacyMap)) {
    if (current[workoutId]) continue;
    const normalized = normalizeActiveSessionDraft(raw, workoutId);
    if (!normalized) continue;
    current[workoutId] = normalized;
    changed = true;
  }

  if (changed) writeDraftMap(current);

  try {
    localStorage.removeItem(LEGACY_DRAFTS_KEY);
  } catch {
    // ignore
  }
}

function readDraftMap(): DraftMap {
  migrateLegacyDraftsIfNeeded();
  return readRawMap(DRAFTS_KEY);
}

/** Defensively validate and normalize a stored draft; return null if unusable. */
export function normalizeActiveSessionDraft(raw: unknown, expectedWorkoutId: string): ActiveSessionDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<ActiveSessionDraft>;
  if (candidate.version !== ACTIVE_DRAFT_SCHEMA_VERSION) return null;
  if (candidate.workoutId !== expectedWorkoutId) return null;
  if (!Array.isArray(candidate.entries)) return null;

  const entries: ExerciseLog[] = candidate.entries
    .filter((entry): entry is ExerciseLog => {
      return (
        !!entry &&
        typeof entry === "object" &&
        typeof entry.exerciseId === "string" &&
        Array.isArray(entry.sets)
      );
    })
    .map((entry) => ({
      exerciseId: entry.exerciseId,
      completed: entry.completed === true,
      sets: entry.sets.map((set) => ({
        reps: typeof set?.reps === "number" && Number.isFinite(set.reps) ? set.reps : 0,
        weight: typeof set?.weight === "number" && Number.isFinite(set.weight) ? set.weight : 0,
        durationSeconds:
          typeof set?.durationSeconds === "number" && Number.isFinite(set.durationSeconds)
            ? set.durationSeconds
            : undefined
      }))
    }));

  const feedbackRaw = candidate.feedback;
  const feedback: SessionFeedback = {
    difficulty:
      typeof feedbackRaw?.difficulty === "number" ? clamp(feedbackRaw.difficulty, 1, 10) : DEFAULT_FEEDBACK.difficulty,
    energy:
      feedbackRaw?.energy === "low" || feedbackRaw?.energy === "normal" || feedbackRaw?.energy === "high"
        ? feedbackRaw.energy
        : DEFAULT_FEEDBACK.energy,
    lowerBackPain:
      typeof feedbackRaw?.lowerBackPain === "number"
        ? clamp(feedbackRaw.lowerBackPain, 0, 10)
        : DEFAULT_FEEDBACK.lowerBackPain,
    kneePain:
      typeof feedbackRaw?.kneePain === "number" ? clamp(feedbackRaw.kneePain, 0, 10) : DEFAULT_FEEDBACK.kneePain,
    shoulderPain:
      typeof feedbackRaw?.shoulderPain === "number"
        ? clamp(feedbackRaw.shoulderPain, 0, 10)
        : DEFAULT_FEEDBACK.shoulderPain,
    note: typeof feedbackRaw?.note === "string" ? feedbackRaw.note : ""
  };

  return {
    version: ACTIVE_DRAFT_SCHEMA_VERSION,
    workoutId: expectedWorkoutId,
    updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : new Date().toISOString(),
    startedAt: typeof candidate.startedAt === "string" ? candidate.startedAt : undefined,
    lowEnergyMode: candidate.lowEnergyMode === true,
    cardioCompleted: candidate.cardioCompleted === true,
    entries,
    feedback,
    programVersion:
      typeof candidate.programVersion === "string" ? candidate.programVersion : undefined,
    optionalCoreEnabled: candidate.optionalCoreEnabled === true,
    optionalCardioEnabled: candidate.optionalCardioEnabled === true,
    legacyEntries: Array.isArray(candidate.legacyEntries)
      ? candidate.legacyEntries.filter(
          (entry): entry is ExerciseLog =>
            !!entry &&
            typeof entry === "object" &&
            typeof entry.exerciseId === "string" &&
            Array.isArray(entry.sets)
        )
      : undefined
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function getActiveSessionDraft(workoutId: string): ActiveSessionDraft | null {
  const map = readDraftMap();
  const normalized = normalizeActiveSessionDraft(map[workoutId], workoutId);
  if (map[workoutId] !== undefined && normalized === null) {
    // Malformed or older schema for this workout only - drop just that entry.
    delete map[workoutId];
    writeDraftMap(map);
  }
  return normalized;
}

/** Compare draft payloads ignoring updatedAt (for no-op autosave / sync stability). */
export function draftContentEquals(a: ActiveSessionDraft, b: ActiveSessionDraft): boolean {
  const strip = (d: ActiveSessionDraft) => {
    const { updatedAt: _u, ...rest } = d;
    return rest;
  };
  return JSON.stringify(strip(a)) === JSON.stringify(strip(b));
}

export function saveActiveSessionDraft(
  draft: ActiveSessionDraft,
  options?: { preserveUpdatedAt?: boolean }
): void {
  if (draft.version !== ACTIVE_DRAFT_SCHEMA_VERSION || !draft.workoutId) return;
  const map = readDraftMap();
  const existing = map[draft.workoutId];
  const startedAt =
    typeof draft.startedAt === "string"
      ? draft.startedAt
      : typeof existing?.startedAt === "string"
        ? existing.startedAt
        : new Date().toISOString();
  map[draft.workoutId] = {
    ...draft,
    startedAt,
    updatedAt: options?.preserveUpdatedAt
      ? typeof draft.updatedAt === "string"
        ? draft.updatedAt
        : new Date().toISOString()
      : new Date().toISOString()
  };
  writeDraftMap(map);
}

/** All valid normalized drafts currently stored. */
export function listActiveSessionDrafts(): ActiveSessionDraft[] {
  const map = readDraftMap();
  const out: ActiveSessionDraft[] = [];
  for (const [workoutId, raw] of Object.entries(map)) {
    const normalized = normalizeActiveSessionDraft(raw, workoutId);
    if (normalized) out.push(normalized);
  }
  return out;
}

export function clearActiveSessionDraft(workoutId: string): void {
  const map = readDraftMap();
  if (!(workoutId in map)) return;
  delete map[workoutId];
  writeDraftMap(map);
}

export function clearAllActiveSessionDrafts(): void {
  try {
    localStorage.removeItem(DRAFTS_KEY);
  } catch {
    // ignore
  }
  try {
    localStorage.removeItem(LEGACY_DRAFTS_KEY);
  } catch {
    // ignore
  }
}

export function listActiveSessionDraftWorkoutIds(): string[] {
  return Object.keys(readDraftMap());
}

export function createEmptyDraft(
  workoutId: string,
  entries: ExerciseLog[],
  options?: { lowEnergyMode?: boolean; cardioCompleted?: boolean; startedAt?: string }
): ActiveSessionDraft {
  const now = new Date().toISOString();
  return {
    version: ACTIVE_DRAFT_SCHEMA_VERSION,
    workoutId,
    updatedAt: now,
    startedAt: options?.startedAt ?? now,
    lowEnergyMode: options?.lowEnergyMode === true,
    cardioCompleted: options?.cardioCompleted === true,
    entries,
    feedback: { ...DEFAULT_FEEDBACK }
  };
}

export { DEFAULT_FEEDBACK, DRAFTS_KEY, LEGACY_DRAFTS_KEY };
