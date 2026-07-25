import type { ActiveSessionDraft, ExerciseLog, SessionFeedback } from "../types";

/**
 * Versioned active-session draft store. Separate from completed WorkoutLog
 * history (`workout-app:v1:logs`) so unfinished sessions survive navigation,
 * refresh, and PWA reopen without polluting completed history.
 */
const DRAFTS_KEY = "workout-app:v1:active-drafts";

type DraftMap = Record<string, ActiveSessionDraft>;

const DEFAULT_FEEDBACK: SessionFeedback = {
  difficulty: 5,
  energy: "normal",
  lowerBackPain: 0,
  kneePain: 0,
  shoulderPain: 0,
  note: ""
};

function readDraftMap(): DraftMap {
  try {
    const raw = localStorage.getItem(DRAFTS_KEY);
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

/** Defensively validate and normalize a stored draft; return null if unusable. */
export function normalizeActiveSessionDraft(raw: unknown, expectedWorkoutId: string): ActiveSessionDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<ActiveSessionDraft>;
  if (candidate.version !== 1) return null;
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
    version: 1,
    workoutId: expectedWorkoutId,
    updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : new Date().toISOString(),
    lowEnergyMode: candidate.lowEnergyMode === true,
    cardioCompleted: candidate.cardioCompleted === true,
    entries,
    feedback
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function getActiveSessionDraft(workoutId: string): ActiveSessionDraft | null {
  const map = readDraftMap();
  return normalizeActiveSessionDraft(map[workoutId], workoutId);
}

export function saveActiveSessionDraft(draft: ActiveSessionDraft): void {
  if (draft.version !== 1 || !draft.workoutId) return;
  const map = readDraftMap();
  map[draft.workoutId] = {
    ...draft,
    updatedAt: new Date().toISOString()
  };
  writeDraftMap(map);
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
}

export function createEmptyDraft(
  workoutId: string,
  entries: ExerciseLog[],
  options?: { lowEnergyMode?: boolean }
): ActiveSessionDraft {
  return {
    version: 1,
    workoutId,
    updatedAt: new Date().toISOString(),
    lowEnergyMode: options?.lowEnergyMode === true,
    cardioCompleted: false,
    entries,
    feedback: { ...DEFAULT_FEEDBACK }
  };
}

export { DEFAULT_FEEDBACK, DRAFTS_KEY };
