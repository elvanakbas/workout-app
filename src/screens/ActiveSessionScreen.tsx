import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getWorkoutById } from "../data/program";
import { getLastWeightForExercise } from "../lib/history";
import {
  buildInitialEntries,
  buildLogEntriesFromSession,
  createCompletionGuard,
  isExerciseEntryEmpty,
  measurementFieldsFor,
  reconcileEntries,
  visibleSetsForExercise
} from "../lib/sessionTracking";
import {
  ACTIVE_DRAFT_SCHEMA_VERSION,
  clearActiveSessionDraft,
  DEFAULT_FEEDBACK,
  getActiveSessionDraft,
  saveActiveSessionDraft
} from "../storage/activeSessionDraft";
import { useAppData } from "../state/AppDataContext";
import ExerciseVisual from "../components/ExerciseVisual";
import type {
  EnergyLevel,
  Exercise,
  ExerciseLog,
  SessionFeedback,
  SetLog,
  WorkoutLog
} from "../types";
import styles from "./ActiveSessionScreen.module.css";

const LOW_ENERGY_MAX_SETS = 2;
const ENERGY_OPTIONS: EnergyLevel[] = ["low", "normal", "high"];

function applyLowEnergy(exercises: Exercise[], lowEnergyMode: boolean): Exercise[] {
  if (!lowEnergyMode) return exercises;
  return exercises
    .filter((exercise) => !exercise.optional)
    .map((exercise) => ({
      ...exercise,
      targetSets: Math.min(LOW_ENERGY_MAX_SETS, exercise.targetSets)
    }));
}

function unilateralLabel(exercise: Exercise): string | null {
  const label = exercise.targetUnitLabel || (exercise.unilateral ? "per side" : null);
  if (!label) return null;
  // Avoid duplicating when targetReps already includes the unit (e.g. "8-12 per side").
  if (exercise.targetReps.toLowerCase().includes(label.toLowerCase())) return null;
  return label;
}

export default function ActiveSessionScreen() {
  const { workoutId } = useParams<{ workoutId: string }>();
  const navigate = useNavigate();
  const { logs, completeWorkout } = useAppData();
  const workout = workoutId ? getWorkoutById(workoutId) : undefined;

  const [hydrated, setHydrated] = useState(false);
  const [lowEnergyMode, setLowEnergyMode] = useState(false);
  const [cardioCompleted, setCardioCompleted] = useState(false);
  const [feedback, setFeedback] = useState<SessionFeedback>(DEFAULT_FEEDBACK);
  const [entries, setEntries] = useState<ExerciseLog[]>([]);
  const [completingWorkout, setCompletingWorkout] = useState(false);
  const completionGuardRef = useRef(createCompletionGuard());

  const canUseLowEnergyMode = workout?.length === "short";

  /** Full authored strength+core list (never LEM-trimmed). Draft source of truth. */
  const canonicalExercises = useMemo(() => {
    if (!workout) return [];
    return [...workout.strength, ...workout.core];
  }, [workout]);

  /** Visible list for logging UI (LEM may hide optionals and cap set count). */
  const loggableExercises = useMemo(() => {
    if (!workout) return [];
    return applyLowEnergy(canonicalExercises, lowEnergyMode);
  }, [workout, canonicalExercises, lowEnergyMode]);

  // Restore draft (or seed empty entries) once per workout id.
  useEffect(() => {
    if (!workout) return;
    const shortSession = workout.length === "short";
    const full = [...workout.strength, ...workout.core];
    const draft = getActiveSessionDraft(workout.id);
    if (draft) {
      const mode = shortSession ? draft.lowEnergyMode : false;
      setLowEnergyMode(mode);
      setCardioCompleted(draft.cardioCompleted);
      setFeedback({ ...DEFAULT_FEEDBACK, ...draft.feedback, note: draft.feedback.note ?? "" });
      // Always reconcile against the full catalog so LEM-hidden / extra sets survive.
      setEntries(reconcileEntries(full, draft.entries));
    } else {
      setLowEnergyMode(false);
      setCardioCompleted(false);
      setFeedback({ ...DEFAULT_FEEDBACK });
      setEntries(buildInitialEntries(full));
    }
    completionGuardRef.current = createCompletionGuard();
    setCompletingWorkout(false);
    setHydrated(true);
    // Intentionally only re-hydrate when the workout identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workout?.id]);

  // Auto-save draft whenever session state changes.
  useEffect(() => {
    if (!workout || !hydrated || completingWorkout) return;
    saveActiveSessionDraft({
      version: ACTIVE_DRAFT_SCHEMA_VERSION,
      workoutId: workout.id,
      updatedAt: new Date().toISOString(),
      lowEnergyMode: canUseLowEnergyMode ? lowEnergyMode : false,
      cardioCompleted,
      entries,
      feedback
    });
  }, [workout, hydrated, lowEnergyMode, cardioCompleted, entries, feedback, canUseLowEnergyMode, completingWorkout]);

  if (!workout) {
    return (
      <div className={styles.screen}>
        <p>Workout not found.</p>
        <Link to="/">Back to program</Link>
      </div>
    );
  }

  const toggleLowEnergyMode = () => {
    const next = !lowEnergyMode;
    setLowEnergyMode(next);
    // Keep full catalog entries; UI filters visibility. Reconcile pads/truncates
    // to canonical targetSets without dropping hidden optional drafts.
    setEntries((prev) => reconcileEntries(canonicalExercises, prev));
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
    setCardioCompleted(false);
    setFeedback({ ...DEFAULT_FEEDBACK });
    setEntries(buildInitialEntries(canonicalExercises));
    completionGuardRef.current = createCompletionGuard();
    setCompletingWorkout(false);
  };

  const handleCompleteWorkout = () => {
    if (!completionGuardRef.current.tryBegin()) return;
    setCompletingWorkout(true);

    const log: WorkoutLog = {
      id: `${workout.id}-${Date.now()}`,
      workoutId: workout.id,
      order: workout.order,
      workoutTitle: workout.title,
      completedAt: new Date().toISOString(),
      entries: buildLogEntriesFromSession(loggableExercises, entries),
      cardioCompleted: workout.cardio ? cardioCompleted : undefined,
      lowEnergyMode: canUseLowEnergyMode ? lowEnergyMode : undefined,
      feedback: {
        ...feedback,
        note: feedback.note?.trim() ? feedback.note.trim() : undefined
      }
    };

    completeWorkout(log);
    clearActiveSessionDraft(workout.id);
    navigate("/", { replace: true });
  };

  if (!hydrated) {
    return (
      <div className={styles.screen}>
        <p className={styles.exerciseMeta}>Loading session…</p>
      </div>
    );
  }

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <Link to={`/workout/${workout.id}`} className={styles.back}>
          &larr; {workout.title}
        </Link>
        <h1 className={styles.title}>Log Your Sets</h1>
        <p className={styles.draftHint}>Progress is saved automatically. Leave and return anytime.</p>
      </header>

      {canUseLowEnergyMode ? (
        <div className={styles.lowEnergyToggle}>
          <div>
            <span className={styles.lowEnergyLabel}>Low-Energy Mode</span>
            <p className={styles.lowEnergyHint}>
              Trims to core exercises at 2 sets, skips optional work, and makes cardio optional. Targets
              ~20-25 min.
            </p>
          </div>
          <button
            type="button"
            className={lowEnergyMode ? styles.toggleOn : styles.toggleOff}
            aria-pressed={lowEnergyMode}
            onClick={toggleLowEnergyMode}
          >
            {lowEnergyMode ? "On" : "Off"}
          </button>
        </div>
      ) : null}

      <div className={styles.exerciseList}>
        {loggableExercises.map((exercise) => {
          const entry = entries.find((e) => e.exerciseId === exercise.id);
          const lastWeight = getLastWeightForExercise(logs, exercise.id);
          const fields = measurementFieldsFor(exercise.measurementType);
          const isCompleted = entry?.completed === true;
          const sideLabel = unilateralLabel(exercise);
          const displaySets = visibleSetsForExercise(entry, exercise.targetSets);
          const gridClass = fields.showWeight
            ? styles.setsGridWeight
            : fields.showDurationSeconds
              ? styles.setsGridDuration
              : styles.setsGridRepsOnly;

          return (
            <section
              key={exercise.id}
              className={isCompleted ? `${styles.exercise} ${styles.exerciseCompleted}` : styles.exercise}
            >
              <div className={styles.exerciseHeaderRow}>
                <h2 className={styles.exerciseName}>{exercise.name}</h2>
                {isCompleted ? <span className={styles.completedBadge}>Completed</span> : null}
              </div>
              <p className={styles.exerciseMeta}>
                Target: {exercise.targetSets} sets x {exercise.targetReps}
                {sideLabel ? (
                  <span className={styles.perSideLabel}> · {sideLabel}</span>
                ) : null}
              </p>
              <ExerciseVisual visualAssetKey={exercise.visualAssetKey} variant="session" />
              {fields.showWeight && lastWeight !== undefined ? (
                <p className={styles.lastWeight}>Last: {lastWeight} kg</p>
              ) : null}

              {isCompleted ? (
                <p className={styles.completedNote}>
                  Exercise marked complete. Full workout is not finished until you tap Complete Workout
                  below.
                </p>
              ) : null}

              <div className={gridClass} aria-disabled={isCompleted}>
                <span className={styles.setsGridLabel}>Set</span>
                {fields.showReps ? (
                  <span className={styles.setsGridLabel}>
                    Reps{sideLabel ? ` (${sideLabel})` : ""}
                  </span>
                ) : null}
                {fields.showWeight ? <span className={styles.setsGridLabel}>Weight (kg)</span> : null}
                {fields.showDurationSeconds ? (
                  <span className={styles.setsGridLabel}>
                    Duration (sec){sideLabel ? ` (${sideLabel})` : ""}
                  </span>
                ) : null}

                {displaySets.map((set, setIndex) => (
                  <Fragment key={setIndex}>
                    <span className={styles.setNumber}>{setIndex + 1}</span>
                    {fields.showReps ? (
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        className={styles.setInput}
                        value={set.reps === 0 ? "" : set.reps}
                        placeholder="0"
                        disabled={isCompleted}
                        aria-label={`${exercise.name} set ${setIndex + 1} reps`}
                        onChange={(e) =>
                          updateSet(exercise.id, setIndex, "reps", Number(e.target.value) || 0)
                        }
                      />
                    ) : null}
                    {fields.showWeight ? (
                      <div className={styles.weightInputWrap}>
                        <input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          className={styles.setInput}
                          value={set.weight === 0 ? "" : set.weight}
                          placeholder={lastWeight !== undefined ? String(lastWeight) : "0"}
                          disabled={isCompleted}
                          aria-label={`${exercise.name} set ${setIndex + 1} weight kg`}
                          onChange={(e) =>
                            updateSet(exercise.id, setIndex, "weight", Number(e.target.value) || 0)
                          }
                        />
                        <span className={styles.weightUnit}>kg</span>
                      </div>
                    ) : null}
                    {fields.showDurationSeconds ? (
                      <div className={styles.weightInputWrap}>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          className={styles.setInput}
                          value={!set.durationSeconds ? "" : set.durationSeconds}
                          placeholder="0"
                          disabled={isCompleted}
                          aria-label={`${exercise.name} set ${setIndex + 1} duration seconds`}
                          onChange={(e) =>
                            updateSet(
                              exercise.id,
                              setIndex,
                              "durationSeconds",
                              Number(e.target.value) || 0
                            )
                          }
                        />
                        <span className={styles.weightUnit}>sec</span>
                      </div>
                    ) : null}
                  </Fragment>
                ))}
              </div>

              {isCompleted ? (
                <button
                  type="button"
                  className={styles.reopenButton}
                  onClick={() => reopenExercise(exercise.id)}
                >
                  Edit Exercise
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.completeExerciseButton}
                  onClick={() => markExerciseCompleted(exercise)}
                >
                  Complete Exercise
                </button>
              )}
            </section>
          );
        })}
      </div>

      {workout.cardio ? (
        <section className={styles.cardioSection}>
          <h2 className={styles.exerciseName}>
            Cardio{workout.cardio.optional || lowEnergyMode ? " (Optional)" : ""}
          </h2>
          <p className={styles.exerciseMeta}>
            {workout.cardio.machine === "elliptical"
              ? "Elliptical"
              : workout.cardio.machine === "stationary_bike"
                ? "Stationary Bike"
                : "Rowing Machine"}
            {workout.cardio.alternateMachine === "stationary_bike"
              ? " or Stationary Bike"
              : workout.cardio.alternateMachine === "elliptical"
                ? " or Elliptical"
                : ""}
            {" — "}
            Planned {workout.cardio.durationMinutes} min - {workout.cardio.intensity}
          </p>
          <ExerciseVisual visualAssetKey={workout.cardio.visualAssetKey} variant="session" />
          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={cardioCompleted}
              onChange={(e) => setCardioCompleted(e.target.checked)}
            />
            I completed the cardio block ({workout.cardio.durationMinutes} min)
          </label>
        </section>
      ) : null}

      <section className={styles.feedbackSection}>
        <h2 className={styles.exerciseName}>How did that feel?</h2>

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
                className={feedback.energy === option ? styles.energyOptionActive : styles.energyOption}
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
      </section>

      <button
        type="button"
        className={styles.completeButton}
        onClick={handleCompleteWorkout}
        disabled={completingWorkout}
      >
        {completingWorkout ? "Saving…" : "Complete Workout"}
      </button>

      <button type="button" className={styles.discardButton} onClick={handleDiscardDraft}>
        Discard Workout Draft
      </button>
    </div>
  );
}
