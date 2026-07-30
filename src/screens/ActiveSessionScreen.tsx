import { Fragment, useEffect, useMemo, useRef, useState } from "react";
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
  saveActiveSessionDraft
} from "../storage/activeSessionDraft";
import { getProgramScheduleSettings } from "../storage/programSettings";
import { useAppData } from "../state/AppDataContext";
import { useCloudAuth } from "../cloud/CloudAuthContext";
import { syncAfterWorkoutComplete } from "../cloud/syncEngine";
import ExerciseVisual from "../components/ExerciseVisual";
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
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workout?.id]);

  useEffect(() => {
    if (!workout || !hydrated || completingWorkout) return;
    saveActiveSessionDraft({
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
    });
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
    setOptionalCoreEnabled(false);
    setOptionalCardioEnabled(false);
    setCardioCompleted(false);
    setFeedback({ ...DEFAULT_FEEDBACK });
    setEntries(buildInitialEntries([...mandatoryExercises, ...(workout.optionalCore ?? [])]));
    setLegacyEntries([]);
    setSessionStartedAt(new Date().toISOString());
    completionGuardRef.current = createCompletionGuard();
    setCompletingWorkout(false);
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
        <p className={styles.exerciseMeta}>Loading session…</p>
      </div>
    );
  }

  const showCardioBlock = !!workout.cardio && optionalCardioEnabled && !hideAddOns;
  const showCorePrompt = (workout.optionalCore?.length ?? 0) > 0 && !hideAddOns;
  const showCardioPrompt = !!workout.cardio && !hideAddOns;

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <Link to={`/workout/${workout.id}`} className={styles.back}>
          &larr; {workout.title}
        </Link>
        <p className={styles.draftHint}>
          {IDENTITY_DISPLAY_LABEL[workout.identity]} · {completedCount}/{loggableExercises.length}{" "}
          done · saved automatically
        </p>
        <h1 className={styles.title}>Log Your Sets</h1>
      </header>

      {canUseLowEnergyMode ? (
        <div className={styles.lowEnergyToggle}>
          <div>
            <span className={styles.lowEnergyLabel}>Low-Energy Mode</span>
            <p className={styles.lowEnergyHint}>
              Keeps your Primary Lift at full sets. Caps other mandatory lifts to 2 sets and hides
              optional add-ons without deleting their values. Shorter session — not a different
              workout.
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
              className={
                isCompleted ? `${styles.exercise} ${styles.exerciseCompleted}` : styles.exercise
              }
            >
              <div className={styles.exerciseHeaderRow}>
                <h2 className={styles.exerciseName}>{exercise.name}</h2>
                <span className={styles.roleChip}>{roleDisplayLabel(exercise.role)}</span>
                {isCompleted ? <span className={styles.completedBadge}>Completed</span> : null}
              </div>
              <p className={styles.exerciseMeta}>
                Target: {exercise.targetSets} sets × {exercise.targetReps}
                {sideLabel ? <span className={styles.perSideLabel}> · {sideLabel}</span> : null}
              </p>
              <ExerciseVisual visualAssetKey={exercise.visualAssetKey} variant="session" />
              {fields.showWeight && lastWeight !== undefined ? (
                <p className={styles.lastWeight}>Last: {lastWeight} kg</p>
              ) : null}

              {isCompleted ? (
                <div className={styles.completedSummary}>
                  <p className={styles.completedNote}>
                    Marked complete
                    {displaySets.some(
                      (s) =>
                        s.reps > 0 ||
                        s.weight > 0 ||
                        (s.durationSeconds ?? 0) > 0
                    )
                      ? ` · ${displaySets
                          .map((s, i) => {
                            if (fields.showDurationSeconds) {
                              return `S${i + 1}: ${s.durationSeconds ?? 0}s`;
                            }
                            if (fields.showWeight) {
                              return `S${i + 1}: ${s.weight}×${s.reps}`;
                            }
                            return `S${i + 1}: ${s.reps}`;
                          })
                          .join(" · ")}`
                      : ""}
                    . Finish with Complete Workout below when ready.
                  </p>
                  <button
                    type="button"
                    className={styles.reopenButton}
                    onClick={() => reopenExercise(exercise.id)}
                  >
                    Edit Exercise
                  </button>
                </div>
              ) : (
                <>
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

                <button
                  type="button"
                  className={styles.completeExerciseButton}
                  onClick={() => markExerciseCompleted(exercise)}
                >
                  Complete Exercise
                </button>
                </>
              )}
            </section>
          );
        })}
      </div>

      {showCorePrompt || showCardioPrompt ? (
        <section className={styles.cardioSection}>
          <h2 className={styles.exerciseName}>Optional add-ons</h2>
          <p className={styles.exerciseMeta}>Skipping is fine — not required to finish.</p>
          {showCorePrompt ? (
            <button
              type="button"
              className={optionalCoreEnabled ? styles.toggleOn : styles.completeExerciseButton}
              onClick={() => setOptionalCoreEnabled((v) => !v)}
            >
              {optionalCoreEnabled ? "Hide 10 min Core" : "Add 10 min Core"}
            </button>
          ) : null}
          {showCardioPrompt ? (
            <button
              type="button"
              className={optionalCardioEnabled ? styles.toggleOn : styles.completeExerciseButton}
              onClick={() => setOptionalCardioEnabled((v) => !v)}
              style={{ marginTop: 8 }}
            >
              {optionalCardioEnabled
                ? "Hide Cardio"
                : `Add ${workout.cardio!.durationMinutes} min Cardio`}
            </button>
          ) : null}
        </section>
      ) : null}

      {showCardioBlock ? (
        <section className={styles.cardioSection}>
          <h2 className={styles.exerciseName}>Cardio (Optional)</h2>
          <p className={styles.exerciseMeta}>
            Elliptical or Stationary Bike — Planned {workout.cardio!.durationMinutes} min
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
