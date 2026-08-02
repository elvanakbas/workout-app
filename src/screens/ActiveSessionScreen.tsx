import { Fragment, useEffect, useMemo, useRef, useState, type TouchEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getMandatoryExercises, getWorkoutById } from "../data/program";
import { getLastWeightForExercise } from "../lib/history";
import { roleDisplayLabel } from "../lib/roleDisplay";
import { getMigratedActiveSessionDraft } from "../lib/draftMigration";
import {
  buildInitialEntries,
  createCompletionGuard,
  isExerciseEntryEmpty,
  measurementFieldsFor,
  reconcileEntries,
  visibleSetsForExercise
} from "../lib/sessionTracking";
import { buildCompletedWorkoutLog } from "../lib/workoutLogBuilder";
import {
  ACTIVE_DRAFT_SCHEMA_VERSION,
  clearActiveSessionDraft,
  DEFAULT_FEEDBACK,
  draftContentEquals,
  getActiveSessionDraft,
  saveActiveSessionDraft
} from "../storage/activeSessionDraft";
import { getProgramScheduleSettings } from "../storage/programSettings";
import { useAppData } from "../state/AppDataContext";
import { useCloudAuth } from "../cloud/CloudAuthContext";
import { syncAfterWorkoutComplete } from "../cloud/syncEngine";
import ExerciseVisual from "../components/ExerciseVisual";
import NumberStepper from "../components/NumberStepper";
import RestTimer from "../components/RestTimer";
import type {
  EnergyLevel,
  Exercise,
  ExerciseLog,
  SessionFeedback,
  SetLog
} from "../types";
import { PROGRAM_VERSION, IDENTITY_DISPLAY_LABEL } from "../types";
import styles from "./ActiveSessionScreen.module.css";

const LOW_ENERGY_MAX_SETS = 2;
const ENERGY_OPTIONS: EnergyLevel[] = ["low", "normal", "high"];
const DEFAULT_REST_SECONDS = 60;
const WEIGHT_STEP_KG = 2.5;
const DURATION_STEP_SECONDS = 5;

/** LEM: hide optionals; cap non-primary to 2 sets; never reduce Primary Lift. */
function applyLowEnergy(exercises: Exercise[], lowEnergyMode: boolean): Exercise[] {
  if (!lowEnergyMode) return exercises;
  return exercises
    .filter((exercise) => !exercise.optional)
    .map((exercise) =>
      exercise.role === "primary"
        ? exercise
        : { ...exercise, targetSets: Math.min(LOW_ENERGY_MAX_SETS, exercise.targetSets) }
    );
}

function unilateralLabel(exercise: Exercise): string | null {
  const label = exercise.targetUnitLabel || (exercise.unilateral ? "per side" : null);
  if (!label) return null;
  if (exercise.targetReps.toLowerCase().includes(label.toLowerCase())) return null;
  return label;
}

function setHasValues(set: SetLog): boolean {
  return set.reps > 0 || set.weight > 0 || (set.durationSeconds ?? 0) > 0;
}

/** Keeps pager chips readable without wrapping the strip. */
function shortName(name: string): string {
  return name.length <= 18 ? name : `${name.slice(0, 17)}…`;
}

export default function ActiveSessionScreen() {
  const { workoutId } = useParams<{ workoutId: string }>();
  const navigate = useNavigate();
  const { logs, completeWorkout } = useAppData();
  const { user, notifyLocalMutation } = useCloudAuth();
  const workout = workoutId ? getWorkoutById(workoutId) : undefined;

  const [hydrated, setHydrated] = useState(false);
  const [lowEnergyMode, setLowEnergyMode] = useState(false);
  const [optionalCoreEnabled, setOptionalCoreEnabled] = useState(false);
  const [optionalCardioEnabled, setOptionalCardioEnabled] = useState(false);
  const [cardioCompleted, setCardioCompleted] = useState(false);
  const [feedback, setFeedback] = useState<SessionFeedback>(DEFAULT_FEEDBACK);
  const [entries, setEntries] = useState<ExerciseLog[]>([]);
  const [sessionStartedAt, setSessionStartedAt] = useState<string | undefined>(undefined);
  const [completingWorkout, setCompletingWorkout] = useState(false);
  const [legacyEntries, setLegacyEntries] = useState<ExerciseLog[]>([]);
  const completionGuardRef = useRef(createCompletionGuard());

  /**
   * View-only state below this line. None of it is written to the draft, so
   * focusing an exercise or running a rest timer can never bump `updatedAt`
   * or race cloud sync.
   */
  const [focusIndex, setFocusIndex] = useState(0);
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const [restTotalSeconds, setRestTotalSeconds] = useState(DEFAULT_REST_SECONDS);
  const [restExerciseName, setRestExerciseName] = useState("");
  const [showFinishPanel, setShowFinishPanel] = useState(false);
  const pagerRef = useRef<HTMLDivElement | null>(null);

  const canUseLowEnergyMode = workout?.length === "short";
  const hideAddOns = lowEnergyMode;

  const mandatoryExercises = useMemo(
    () => (workout ? getMandatoryExercises(workout) : []),
    [workout]
  );

  const canonicalExercises = useMemo(() => {
    if (!workout) return [];
    const optional =
      optionalCoreEnabled && !hideAddOns ? (workout.optionalCore ?? []) : [];
    return [...mandatoryExercises, ...optional];
  }, [workout, mandatoryExercises, optionalCoreEnabled, hideAddOns]);

  const loggableExercises = useMemo(
    () => applyLowEnergy(canonicalExercises, lowEnergyMode),
    [canonicalExercises, lowEnergyMode]
  );

  const completedCount = loggableExercises.filter(
    (ex) => entries.find((e) => e.exerciseId === ex.id)?.completed
  ).length;

  useEffect(() => {
    if (!workout) return;
    const shortSession = workout.length === "short";
    const draft = getMigratedActiveSessionDraft(workout);
    const fullSeed = [...getMandatoryExercises(workout), ...(workout.optionalCore ?? [])];
    if (draft) {
      setLowEnergyMode(shortSession ? draft.lowEnergyMode : false);
      setOptionalCoreEnabled(draft.optionalCoreEnabled === true);
      setOptionalCardioEnabled(draft.optionalCardioEnabled === true);
      setCardioCompleted(draft.cardioCompleted);
      setFeedback({ ...DEFAULT_FEEDBACK, ...draft.feedback, note: draft.feedback.note ?? "" });
      setEntries(reconcileEntries(fullSeed, draft.entries));
      setLegacyEntries(draft.legacyEntries ?? []);
      setSessionStartedAt(draft.startedAt ?? draft.updatedAt ?? new Date().toISOString());
    } else {
      setLowEnergyMode(false);
      setOptionalCoreEnabled(false);
      setOptionalCardioEnabled(false);
      setCardioCompleted(false);
      setFeedback({ ...DEFAULT_FEEDBACK });
      setEntries(buildInitialEntries(fullSeed));
      setLegacyEntries([]);
      setSessionStartedAt(new Date().toISOString());
    }
    completionGuardRef.current = createCompletionGuard();
    setCompletingWorkout(false);
    setRestEndsAt(null);
    setShowFinishPanel(false);
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workout?.id]);

  useEffect(() => {
    if (!workout || !hydrated || completingWorkout) return;
    const next = {
      version: ACTIVE_DRAFT_SCHEMA_VERSION,
      workoutId: workout.id,
      updatedAt: new Date().toISOString(),
      startedAt: sessionStartedAt,
      lowEnergyMode: canUseLowEnergyMode ? lowEnergyMode : false,
      cardioCompleted,
      entries,
      feedback,
      programVersion: PROGRAM_VERSION,
      optionalCoreEnabled,
      optionalCardioEnabled,
      legacyEntries: legacyEntries.length > 0 ? legacyEntries : undefined
    } as const;
    const existing = getActiveSessionDraft(workout.id);
    // Avoid bumping updatedAt on hydrate/reload when nothing material changed (LWW-safe).
    if (existing && draftContentEquals(existing, next)) return;
    saveActiveSessionDraft(next);
  }, [
    workout,
    hydrated,
    lowEnergyMode,
    cardioCompleted,
    entries,
    feedback,
    canUseLowEnergyMode,
    completingWorkout,
    sessionStartedAt,
    optionalCoreEnabled,
    optionalCardioEnabled,
    legacyEntries
  ]);

  // Resume where the session left off, and never point past the end after a
  // Low-Energy or optional-block toggle changes the list length.
  const resumedRef = useRef(false);
  useEffect(() => {
    if (!hydrated || loggableExercises.length === 0) return;
    if (!resumedRef.current) {
      const firstIncomplete = loggableExercises.findIndex(
        (ex) => entries.find((e) => e.exerciseId === ex.id)?.completed !== true
      );
      setFocusIndex(firstIncomplete === -1 ? 0 : firstIncomplete);
      resumedRef.current = true;
      return;
    }
    setFocusIndex((prev) => Math.min(prev, loggableExercises.length - 1));
  }, [hydrated, loggableExercises, entries]);

  useEffect(() => {
    resumedRef.current = false;
  }, [workout?.id]);

  // Keep the focused chip in view when advancing between exercises.
  useEffect(() => {
    const pager = pagerRef.current;
    if (!pager) return;
    const chip = pager.querySelector<HTMLElement>(`[data-chip-index="${focusIndex}"]`);
    chip?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [focusIndex]);

  if (!workout) {
    return (
      <div className={styles.screen}>
        <p>Workout not found.</p>
        <Link to="/">Back to program</Link>
      </div>
    );
  }

  const toggleLowEnergyMode = () => {
    setLowEnergyMode((prev) => !prev);
    setEntries((prev) =>
      reconcileEntries(
        [...getMandatoryExercises(workout), ...(workout.optionalCore ?? [])],
        prev
      )
    );
  };

  const updateSet = (
    exerciseId: string,
    setIndex: number,
    field: keyof SetLog,
    value: number
  ) => {
    setEntries((prev) =>
      prev.map((entry) => {
        if (entry.exerciseId !== exerciseId) return entry;
        const sets = entry.sets.map((set, index) =>
          index === setIndex ? { ...set, [field]: value } : set
        );
        return { ...entry, sets };
      })
    );
  };

  /**
   * Relative set change from the −/+ steppers.
   *
   * Computed inside the updater so a burst of taps (going 20 → 60 kg) applies
   * every one of them; reading the rendered value instead would drop all but
   * the first tap of a batch.
   */
  const nudgeSet = (
    exerciseId: string,
    setIndex: number,
    field: keyof SetLog,
    delta: number
  ) => {
    setEntries((prev) =>
      prev.map((entry) => {
        if (entry.exerciseId !== exerciseId) return entry;
        const sets = entry.sets.map((set, index) => {
          if (index !== setIndex) return set;
          const current = field === "durationSeconds" ? (set.durationSeconds ?? 0) : set[field] ?? 0;
          // Round to one decimal so 2.5 kg steps never drift to 47.50000000000001.
          const next = Math.max(0, Number((current + delta).toFixed(1)));
          return { ...set, [field]: next };
        });
        return { ...entry, sets };
      })
    );
  };

  const startRest = (exercise: Exercise) => {
    const seconds = exercise.restSeconds ?? DEFAULT_REST_SECONDS;
    setRestTotalSeconds(seconds);
    setRestExerciseName(exercise.name);
    setRestEndsAt(Date.now() + seconds * 1000);
  };

  const markExerciseCompleted = (exercise: Exercise) => {
    const entry = entries.find((e) => e.exerciseId === exercise.id);
    if (isExerciseEntryEmpty(entry, exercise.measurementType)) {
      const ok = window.confirm(
        `No values entered for ${exercise.name}. Mark it complete anyway?`
      );
      if (!ok) return;
    }
    setEntries((prev) =>
      prev.map((e) => (e.exerciseId === exercise.id ? { ...e, completed: true } : e))
    );
    setRestEndsAt(null);
    goToNextIncomplete(exercise.id);
  };

  /** Advance to the next exercise still needing work, skipping the one just finished. */
  const goToNextIncomplete = (justCompletedId: string) => {
    const nextIndex = loggableExercises.findIndex((ex, index) => {
      if (index <= focusIndex) return false;
      if (ex.id === justCompletedId) return false;
      return entries.find((e) => e.exerciseId === ex.id)?.completed !== true;
    });
    if (nextIndex !== -1) {
      setFocusIndex(nextIndex);
      return;
    }
    const anyIncomplete = loggableExercises.findIndex(
      (ex) =>
        ex.id !== justCompletedId &&
        entries.find((e) => e.exerciseId === ex.id)?.completed !== true
    );
    if (anyIncomplete !== -1) {
      setFocusIndex(anyIncomplete);
    } else {
      setShowFinishPanel(true);
    }
  };

  const reopenExercise = (exerciseId: string) => {
    setEntries((prev) =>
      prev.map((e) => (e.exerciseId === exerciseId ? { ...e, completed: false } : e))
    );
  };

  const updateFeedback = <K extends keyof SessionFeedback>(field: K, value: SessionFeedback[K]) => {
    setFeedback((prev) => ({ ...prev, [field]: value }));
  };

  const handleDiscardDraft = () => {
    const ok = window.confirm(
      "Discard this workout draft? All entered reps, weights, durations, and completion marks for this session will be cleared."
    );
    if (!ok) return;
    clearActiveSessionDraft(workout.id);
    setLowEnergyMode(false);
    setOptionalCoreEnabled(false);
    setOptionalCardioEnabled(false);
    setCardioCompleted(false);
    setFeedback({ ...DEFAULT_FEEDBACK });
    setEntries(buildInitialEntries([...mandatoryExercises, ...(workout.optionalCore ?? [])]));
    setLegacyEntries([]);
    setSessionStartedAt(new Date().toISOString());
    completionGuardRef.current = createCompletionGuard();
    setCompletingWorkout(false);
    setFocusIndex(0);
    setRestEndsAt(null);
    setShowFinishPanel(false);
  };

  const handleCompleteWorkout = () => {
    if (!completionGuardRef.current.tryBegin()) return;
    setCompletingWorkout(true);

    const schedule = getProgramScheduleSettings();
    const snapshotCanonical = [
      ...mandatoryExercises,
      ...(optionalCoreEnabled ? (workout.optionalCore ?? []) : [])
    ];

    const log = buildCompletedWorkoutLog({
      workout,
      canonicalExercises: snapshotCanonical,
      visibleExercises: loggableExercises,
      entries,
      feedback,
      lowEnergyMode: canUseLowEnergyMode ? lowEnergyMode : false,
      cardioCompleted: optionalCardioEnabled ? cardioCompleted : false,
      startedAt: sessionStartedAt,
      programStartDateKey: schedule.startDateKey,
      optionalCoreSelected: optionalCoreEnabled,
      optionalCardioSelected: optionalCardioEnabled
    });

    completeWorkout(log);
    clearActiveSessionDraft(workout.id);
    notifyLocalMutation();
    void syncAfterWorkoutComplete(user?.id ?? null, workout.id);
    navigate("/", { replace: true });
  };

  if (!hydrated) {
    return (
      <div className={styles.screen}>
        <p className={styles.loading}>Loading session…</p>
      </div>
    );
  }

  const showCardioBlock = !!workout.cardio && optionalCardioEnabled && !hideAddOns;
  const showCorePrompt = (workout.optionalCore?.length ?? 0) > 0 && !hideAddOns;
  const showCardioPrompt = !!workout.cardio && !hideAddOns;

  const total = loggableExercises.length;
  const focused = loggableExercises[Math.min(focusIndex, total - 1)];
  const allDone = total > 0 && completedCount === total;

  return (
    <div className={styles.screen}>
      <div className={styles.stickyTop}>
        <div className={styles.topRow}>
          <Link to={`/workout/${workout.id}`} className={styles.back} aria-label="Back to workout">
            ← <span className={styles.backLabel}>{workout.title}</span>
          </Link>
          <span className={styles.counter}>
            {completedCount}/{total}
          </span>
        </div>
        <div
          className={styles.progressTrack}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={completedCount}
          aria-label="Exercises completed"
        >
          <div
            className={styles.progressFill}
            style={{ width: total > 0 ? `${(completedCount / total) * 100}%` : "0%" }}
          />
        </div>
        <div className={styles.pager} ref={pagerRef}>
          {loggableExercises.map((exercise, index) => {
            const done = entries.find((e) => e.exerciseId === exercise.id)?.completed === true;
            const isFocused = index === focusIndex;
            const chipClass = [
              styles.chip,
              done ? styles.chipDone : "",
              isFocused ? styles.chipActive : ""
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <button
                key={exercise.id}
                type="button"
                data-chip-index={index}
                className={chipClass}
                aria-current={isFocused ? "true" : undefined}
                onClick={() => setFocusIndex(index)}
              >
                <span className={styles.chipIndex}>{done ? "✓" : index + 1}</span>
                {shortName(exercise.name)}
              </button>
            );
          })}
        </div>
        {restEndsAt != null ? (
          <RestTimer
            endsAt={restEndsAt}
            totalSeconds={restTotalSeconds}
            exerciseName={restExerciseName}
            onExtend={(extra) => setRestEndsAt((prev) => (prev ?? Date.now()) + extra * 1000)}
            onDismiss={() => setRestEndsAt(null)}
          />
        ) : null}
      </div>

      {focused ? (
        <FocusedExercise
          key={focused.id}
          exercise={focused}
          entry={entries.find((e) => e.exerciseId === focused.id)}
          lastWeight={getLastWeightForExercise(logs, focused.id)}
          position={`${Math.min(focusIndex, total - 1) + 1} of ${total}`}
          onUpdateSet={updateSet}
          onNudgeSet={nudgeSet}
          onStartRest={() => startRest(focused)}
          onComplete={() => markExerciseCompleted(focused)}
          onReopen={() => reopenExercise(focused.id)}
          onNext={
            focusIndex < total - 1 ? () => setFocusIndex((prev) => prev + 1) : undefined
          }
          onSwipePrev={
            focusIndex > 0 ? () => setFocusIndex((prev) => Math.max(0, prev - 1)) : undefined
          }
          onSwipeNext={
            focusIndex < total - 1
              ? () => setFocusIndex((prev) => Math.min(total - 1, prev + 1))
              : undefined
          }
        />
      ) : (
        <p className={styles.loading}>No exercises to log.</p>
      )}

      <div className={styles.secondary}>
        {canUseLowEnergyMode ? (
          <section className={styles.card}>
            <div className={styles.toggleRow}>
              <span className={styles.cardTitle}>Low-Energy Mode</span>
              <button
                type="button"
                className={lowEnergyMode ? styles.switchOn : styles.switchOff}
                aria-pressed={lowEnergyMode}
                onClick={toggleLowEnergyMode}
              >
                {lowEnergyMode ? "On" : "Off"}
              </button>
            </div>
            <p className={styles.cardHint}>
              Keeps your Primary Lift at full sets, caps other lifts to {LOW_ENERGY_MAX_SETS} and
              hides optional add-ons without deleting their values. Shorter session — not a
              different workout.
            </p>
          </section>
        ) : null}

        {showCorePrompt || showCardioPrompt ? (
          <section className={styles.card}>
            <span className={styles.cardTitle}>Optional add-ons</span>
            <p className={styles.cardHint}>Skipping is fine — not required to finish.</p>
            <div className={styles.addonButtons}>
              {showCorePrompt ? (
                <button
                  type="button"
                  className={optionalCoreEnabled ? styles.pillOn : styles.pill}
                  aria-pressed={optionalCoreEnabled}
                  onClick={() => setOptionalCoreEnabled((v) => !v)}
                >
                  {optionalCoreEnabled ? "Core added" : "Add 10 min Core"}
                </button>
              ) : null}
              {showCardioPrompt ? (
                <button
                  type="button"
                  className={optionalCardioEnabled ? styles.pillOn : styles.pill}
                  aria-pressed={optionalCardioEnabled}
                  onClick={() => setOptionalCardioEnabled((v) => !v)}
                >
                  {optionalCardioEnabled
                    ? "Cardio added"
                    : `Add ${workout.cardio!.durationMinutes} min Cardio`}
                </button>
              ) : null}
            </div>
          </section>
        ) : null}

        {showCardioBlock ? (
          <section className={styles.card}>
            <span className={styles.cardTitle}>Cardio</span>
            <p className={styles.cardHint}>
              Elliptical or Stationary Bike — planned {workout.cardio!.durationMinutes} min
            </p>
            <ExerciseVisual visualAssetKey={workout.cardio!.visualAssetKey} variant="session" />
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={cardioCompleted}
                onChange={(e) => setCardioCompleted(e.target.checked)}
              />
              I completed the cardio block ({workout.cardio!.durationMinutes} min)
            </label>
          </section>
        ) : null}

        <section className={styles.card}>
          <button
            type="button"
            className={styles.disclosure}
            aria-expanded={showFinishPanel}
            onClick={() => setShowFinishPanel((v) => !v)}
          >
            <span className={styles.cardTitle}>
              {allDone ? "Ready to finish" : "Finish & feedback"}
            </span>
            <span className={styles.disclosureIcon}>{showFinishPanel ? "▾" : "▸"}</span>
          </button>
          {!showFinishPanel ? (
            <p className={styles.cardHint}>
              {allDone
                ? "All exercises logged. Open to add feedback and save."
                : `${completedCount} of ${total} exercises logged so far.`}
            </p>
          ) : null}

          {showFinishPanel ? (
            <div className={styles.finishPanel}>
              <label className={styles.feedbackField}>
                <span>Difficulty: {feedback.difficulty}/10</span>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={feedback.difficulty}
                  onChange={(e) => updateFeedback("difficulty", Number(e.target.value))}
                />
              </label>
              <div className={styles.feedbackField}>
                <span>Energy</span>
                <div className={styles.energyOptions}>
                  {ENERGY_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={
                        feedback.energy === option ? styles.energyOptionActive : styles.energyOption
                      }
                      onClick={() => updateFeedback("energy", option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
              <label className={styles.feedbackField}>
                <span>Lower-back pain: {feedback.lowerBackPain}/10</span>
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={feedback.lowerBackPain}
                  onChange={(e) => updateFeedback("lowerBackPain", Number(e.target.value))}
                />
              </label>
              <label className={styles.feedbackField}>
                <span>Knee pain: {feedback.kneePain}/10</span>
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={feedback.kneePain}
                  onChange={(e) => updateFeedback("kneePain", Number(e.target.value))}
                />
              </label>
              <label className={styles.feedbackField}>
                <span>Shoulder pain: {feedback.shoulderPain}/10</span>
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={feedback.shoulderPain}
                  onChange={(e) => updateFeedback("shoulderPain", Number(e.target.value))}
                />
              </label>
              <label className={styles.feedbackField}>
                <span>Note (optional)</span>
                <textarea
                  className={styles.noteInput}
                  value={feedback.note ?? ""}
                  onChange={(e) => updateFeedback("note", e.target.value)}
                  rows={3}
                  placeholder="Anything worth remembering for next time?"
                />
              </label>

              <button
                type="button"
                className={styles.completeButton}
                onClick={handleCompleteWorkout}
                disabled={completingWorkout}
              >
                {completingWorkout ? "Saving…" : "Complete Workout"}
              </button>
              <button
                type="button"
                className={styles.discardButton}
                onClick={handleDiscardDraft}
              >
                Discard Workout Draft
              </button>
            </div>
          ) : null}
        </section>

        <p className={styles.autosaveHint}>
          {IDENTITY_DISPLAY_LABEL[workout.identity]} · saved automatically as you type
        </p>
      </div>
    </div>
  );
}

interface FocusedExerciseProps {
  exercise: Exercise;
  entry: ExerciseLog | undefined;
  lastWeight: number | undefined;
  position: string;
  onUpdateSet: (exerciseId: string, setIndex: number, field: keyof SetLog, value: number) => void;
  onNudgeSet: (exerciseId: string, setIndex: number, field: keyof SetLog, delta: number) => void;
  onStartRest: () => void;
  onComplete: () => void;
  onReopen: () => void;
  onNext?: () => void;
  onSwipePrev?: () => void;
  onSwipeNext?: () => void;
}

const SWIPE_MIN_DISTANCE_PX = 60;
/** A swipe must be clearly horizontal, or scrolling the page would change exercise. */
const SWIPE_HORIZONTAL_RATIO = 1.8;

/**
 * The one exercise the user is actually doing right now, at full size.
 *
 * Showing every exercise at once turned the session into a scroll hunt; this
 * keeps the visual, the target and the set inputs on a single thumb-reachable
 * screen, with the pager above for jumping out of order.
 */
function FocusedExercise({
  exercise,
  entry,
  lastWeight,
  position,
  onUpdateSet,
  onNudgeSet,
  onStartRest,
  onComplete,
  onReopen,
  onNext,
  onSwipePrev,
  onSwipeNext
}: FocusedExerciseProps) {
  const swipeStartRef = useRef<{ x: number; y: number; onControl: boolean } | null>(null);

  const handleTouchStart = (event: TouchEvent<HTMLElement>) => {
    const touch = event.touches[0];
    if (!touch) return;
    // Starting on a stepper, slider or checkbox means the user is adjusting a
    // value, not navigating — never steal that gesture.
    const onControl = !!(event.target as HTMLElement).closest(
      "input, textarea, select, button, a"
    );
    swipeStartRef.current = { x: touch.clientX, y: touch.clientY, onControl };
  };

  const handleTouchEnd = (event: TouchEvent<HTMLElement>) => {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start || start.onControl) return;
    const touch = event.changedTouches[0];
    if (!touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < SWIPE_MIN_DISTANCE_PX) return;
    if (Math.abs(dx) < Math.abs(dy) * SWIPE_HORIZONTAL_RATIO) return;
    if (dx < 0) onSwipeNext?.();
    else onSwipePrev?.();
  };

  const fields = measurementFieldsFor(exercise.measurementType);
  const isCompleted = entry?.completed === true;
  const sideLabel = unilateralLabel(exercise);
  const displaySets = visibleSetsForExercise(entry, exercise.targetSets);
  const loggedSets = displaySets.filter(setHasValues).length;

  return (
    <section
      className={isCompleted ? `${styles.focus} ${styles.focusDone}` : styles.focus}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <ExerciseVisual visualAssetKey={exercise.visualAssetKey} variant="session" eager />
      {onSwipePrev || onSwipeNext ? (
        <p className={styles.swipeHint}>← swipe to change exercise →</p>
      ) : null}

      <div className={styles.focusHead}>
        <span className={styles.position}>{position}</span>
        <h1 className={styles.exerciseName}>{exercise.name}</h1>
        <div className={styles.metaRow}>
          <span className={styles.roleChip}>{roleDisplayLabel(exercise.role)}</span>
          <span className={styles.target}>
            {exercise.targetSets} × {exercise.targetReps}
          </span>
          {sideLabel ? <span className={styles.sideChip}>{sideLabel}</span> : null}
          {exercise.restSeconds ? (
            <span className={styles.restChip}>rest {exercise.restSeconds}s</span>
          ) : null}
        </div>
        {fields.showWeight && lastWeight !== undefined ? (
          <p className={styles.lastWeight}>
            Last session: <strong>{lastWeight} kg</strong>
          </p>
        ) : null}
      </div>

      {isCompleted ? (
        <div className={styles.completedSummary}>
          <p className={styles.completedNote}>
            Completed
            {displaySets.some(setHasValues)
              ? ` · ${displaySets
                  .map((s, i) => {
                    if (fields.showDurationSeconds) return `S${i + 1}: ${s.durationSeconds ?? 0}s`;
                    if (fields.showWeight) return `S${i + 1}: ${s.weight}×${s.reps}`;
                    return `S${i + 1}: ${s.reps}`;
                  })
                  .join(" · ")}`
              : ""}
          </p>
          <div className={styles.completedActions}>
            <button type="button" className={styles.secondaryButton} onClick={onReopen}>
              Edit Exercise
            </button>
            {onNext ? (
              <button type="button" className={styles.primaryButton} onClick={onNext}>
                Next exercise →
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <>
          <div className={styles.setList}>
            {displaySets.map((set, setIndex) => {
              const logged = setHasValues(set);
              return (
                <Fragment key={setIndex}>
                  <div className={logged ? `${styles.setRow} ${styles.setRowLogged}` : styles.setRow}>
                    <span className={styles.setNumber}>{setIndex + 1}</span>
                    <div className={styles.setFields}>
                      {fields.showReps ? (
                        <label className={styles.fieldGroup}>
                          <span className={styles.fieldLabel}>
                            Reps{sideLabel ? ` · ${sideLabel}` : ""}
                          </span>
                          <NumberStepper
                            value={set.reps}
                            step={1}
                            ariaLabel={`${exercise.name} set ${setIndex + 1} reps`}
                            onChange={(next) => onUpdateSet(exercise.id, setIndex, "reps", next)}
                            onNudge={(delta) => onNudgeSet(exercise.id, setIndex, "reps", delta)}
                          />
                        </label>
                      ) : null}
                      {fields.showWeight ? (
                        <label className={styles.fieldGroup}>
                          <span className={styles.fieldLabel}>Weight</span>
                          <NumberStepper
                            value={set.weight}
                            step={WEIGHT_STEP_KG}
                            unit="kg"
                            placeholder={lastWeight !== undefined ? String(lastWeight) : "0"}
                            ariaLabel={`${exercise.name} set ${setIndex + 1} weight in kg`}
                            onChange={(next) => onUpdateSet(exercise.id, setIndex, "weight", next)}
                            onNudge={(delta) => onNudgeSet(exercise.id, setIndex, "weight", delta)}
                          />
                        </label>
                      ) : null}
                      {fields.showDurationSeconds ? (
                        <label className={styles.fieldGroup}>
                          <span className={styles.fieldLabel}>
                            Duration{sideLabel ? ` · ${sideLabel}` : ""}
                          </span>
                          <NumberStepper
                            value={set.durationSeconds ?? 0}
                            step={DURATION_STEP_SECONDS}
                            unit="sec"
                            ariaLabel={`${exercise.name} set ${setIndex + 1} duration in seconds`}
                            onChange={(next) =>
                              onUpdateSet(exercise.id, setIndex, "durationSeconds", next)
                            }
                            onNudge={(delta) =>
                              onNudgeSet(exercise.id, setIndex, "durationSeconds", delta)
                            }
                          />
                        </label>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className={styles.restButton}
                      onClick={onStartRest}
                      aria-label={`Start rest timer after set ${setIndex + 1}`}
                      title="Start rest timer"
                    >
                      ⏱
                    </button>
                  </div>
                </Fragment>
              );
            })}
          </div>

          <button type="button" className={styles.primaryButtonWide} onClick={onComplete}>
            Complete Exercise
            {loggedSets > 0 ? (
              <span className={styles.buttonSub}>
                {loggedSets}/{displaySets.length} sets filled
              </span>
            ) : null}
          </button>
        </>
      )}

      {exercise.safetyNote ? (
        <p className={styles.safetyNote}>
          <span className={styles.safetyLabel}>Safety</span>
          {exercise.safetyNote}
        </p>
      ) : null}
      {exercise.notes ? <p className={styles.note}>{exercise.notes}</p> : null}
    </section>
  );
}
