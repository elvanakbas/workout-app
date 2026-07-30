import type { ActiveSessionDraft, Exercise, ExerciseLog, Workout } from "../types";
import { PROGRAM_VERSION } from "../types";
import { getMandatoryExercises } from "../data/program";
import {
  ACTIVE_DRAFT_SCHEMA_VERSION,
  getActiveSessionDraft,
  saveActiveSessionDraft
} from "../storage/activeSessionDraft";
import { reconcileEntries } from "../lib/sessionTracking";

/**
 * Reconcile a stored draft against the live V3 workout definition.
 * Matching exercise IDs keep values; removed IDs go to legacyEntries;
 * new IDs are initialized empty. Idempotent.
 */
export function migrateDraftToCurrentProgram(
  draft: ActiveSessionDraft,
  workout: Workout
): ActiveSessionDraft {
  const liveIds = new Set(
    [...getMandatoryExercises(workout), ...(workout.optionalCore ?? [])].map((e) => e.id)
  );

  const matching: ExerciseLog[] = [];
  const legacy: ExerciseLog[] = [...(draft.legacyEntries ?? [])];
  const seenLegacy = new Set(legacy.map((e) => e.exerciseId));

  for (const entry of draft.entries) {
    if (liveIds.has(entry.exerciseId)) {
      matching.push(entry);
    } else if (!seenLegacy.has(entry.exerciseId)) {
      legacy.push(entry);
      seenLegacy.add(entry.exerciseId);
    }
  }

  const liveExercises: Exercise[] = [
    ...getMandatoryExercises(workout),
    ...(workout.optionalCore ?? [])
  ];
  const reconciled = reconcileEntries(liveExercises, matching);

  return {
    ...draft,
    version: ACTIVE_DRAFT_SCHEMA_VERSION,
    programVersion: PROGRAM_VERSION,
    entries: reconciled,
    legacyEntries: legacy.length > 0 ? legacy : undefined,
    optionalCoreEnabled: draft.optionalCoreEnabled === true,
    optionalCardioEnabled: draft.optionalCardioEnabled === true
  };
}

/**
 * True when migration changes structure enough that sync must treat this draft
 * as newer than an incompatible pre-V3 cloud copy.
 */
export function draftMigrationNeedsPersist(
  raw: ActiveSessionDraft,
  migrated: ActiveSessionDraft
): boolean {
  return (
    raw.programVersion !== PROGRAM_VERSION ||
    (migrated.legacyEntries?.length ?? 0) !== (raw.legacyEntries?.length ?? 0) ||
    migrated.entries.length !== raw.entries.length
  );
}

/**
 * Load, migrate if needed, persist when not yet on PROGRAM_VERSION.
 * Material migration bumps updatedAt once so LWW cannot restore a pre-V3 cloud draft.
 * Idempotent: already-migrated drafts are not rewritten.
 */
export function getMigratedActiveSessionDraft(workout: Workout): ActiveSessionDraft | null {
  const raw = getActiveSessionDraft(workout.id);
  if (!raw) return null;

  const migrated = migrateDraftToCurrentProgram(raw, workout);
  if (draftMigrationNeedsPersist(raw, migrated)) {
    // Bump updatedAt on material V3 migration only (do not preserve old timestamp).
    saveActiveSessionDraft({
      ...migrated,
      updatedAt: new Date().toISOString()
    });
    return getActiveSessionDraft(workout.id) ?? migrated;
  }
  return migrated;
}
