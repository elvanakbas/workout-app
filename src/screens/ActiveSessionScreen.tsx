import { Fragment, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getWorkoutById } from "../data/program";
import { getLastWeightForExercise } from "../lib/history";
import { useAppData } from "../state/AppDataContext";
import ExerciseVisual from "../components/ExerciseVisual";
import type { EnergyLevel, Exercise, ExerciseLog, SessionFeedback, SetLog, WorkoutLog } from "../types";
import styles from "./ActiveSessionScreen.module.css";

const LOW_ENERGY_MAX_SETS = 2;
const ENERGY_OPTIONS: EnergyLevel[] = ["low", "normal", "high"];

const DEFAULT_FEEDBACK: SessionFeedback = {
  difficulty: 5,
  energy: "normal",
  lowerBackPain: 0,
  kneePain: 0,
  shoulderPain: 0,
  note: ""
};

function applyLowEnergy(exercises: Exercise[], lowEnergyMode: boolean): Exercise[] {
  if (!lowEnergyMode) return exercises;
  return exercises
    .filter((exercise) => !exercise.optional)
    .map((exercise) => ({
      ...exercise,
      targetSets: Math.min(LOW_ENERGY_MAX_SETS, exercise.targetSets)
    }));
}

function buildInitialEntries(exercises: Exercise[]): ExerciseLog[] {
  return exercises.map((exercise) => ({
    exerciseId: exercise.id,
    sets: Array.from({ length: exercise.targetSets }, () => ({ reps: 0, weight: 0 }))
  }));
}

export default function ActiveSessionScreen() {
  const { workoutId } = useParams<{ workoutId: string }>();
  const navigate = useNavigate();
  const { logs, completeWorkout } = useAppData();
  const workout = workoutId ? getWorkoutById(workoutId) : undefined;

  const [lowEnergyMode, setLowEnergyMode] = useState(false);
  const [cardioCompleted, setCardioCompleted] = useState(false);
  const [feedback, setFeedback] = useState<SessionFeedback>(DEFAULT_FEEDBACK);

  const loggableExercises = useMemo(() => {
    if (!workout) return [];
    return applyLowEnergy([...workout.strength, ...workout.core], lowEnergyMode);
  }, [workout, lowEnergyMode]);

  const [entries, setEntries] = useState<ExerciseLog[]>(() => buildInitialEntries(loggableExercises));

  const canUseLowEnergyMode = workout?.length === "short";

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
    setEntries(buildInitialEntries(applyLowEnergy([...workout.strength, ...workout.core], next)));
  };

  const updateSet = (exerciseId: string, setIndex: number, field: keyof SetLog, value: number) => {
    setEntries((prev) =>
      prev.map((entry) =>
        entry.exerciseId !== exerciseId
          ? entry
          : {
              ...entry,
              sets: entry.sets.map((set, index) =>
                index === setIndex ? { ...set, [field]: value } : set
              )
            }
      )
    );
  };

  const updateFeedback = <K extends keyof SessionFeedback>(field: K, value: SessionFeedback[K]) => {
    setFeedback((prev) => ({ ...prev, [field]: value }));
  };

  const handleComplete = () => {
    const log: WorkoutLog = {
      id: `${workout.id}-${Date.now()}`,
      workoutId: workout.id,
      order: workout.order,
      workoutTitle: workout.title,
      completedAt: new Date().toISOString(),
      entries,
      cardioCompleted: workout.cardio ? cardioCompleted : undefined,
      lowEnergyMode: canUseLowEnergyMode ? lowEnergyMode : undefined,
      feedback: {
        ...feedback,
        note: feedback.note?.trim() ? feedback.note.trim() : undefined
      }
    };
    completeWorkout(log);
    navigate("/", { replace: true });
  };

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <Link to={`/workout/${workout.id}`} className={styles.back}>
          &larr; {workout.title}
        </Link>
        <h1 className={styles.title}>Log Your Sets</h1>
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
          return (
            <section key={exercise.id} className={styles.exercise}>
              <h2 className={styles.exerciseName}>{exercise.name}</h2>
              <p className={styles.exerciseMeta}>
                Target: {exercise.targetSets} sets x {exercise.targetReps}
              </p>
              <ExerciseVisual visualAssetKey={exercise.visualAssetKey} variant="session" />
              {lastWeight !== undefined ? (
                <p className={styles.lastWeight}>Last: {lastWeight} kg</p>
              ) : null}
              <div className={styles.setsGrid}>
                <span className={styles.setsGridLabel}>Set</span>
                <span className={styles.setsGridLabel}>Reps</span>
                <span className={styles.setsGridLabel}>Weight (kg)</span>
                {entry?.sets.map((set, setIndex) => (
                  <Fragment key={setIndex}>
                    <span className={styles.setNumber}>{setIndex + 1}</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      className={styles.setInput}
                      value={set.reps === 0 ? "" : set.reps}
                      placeholder="0"
                      onChange={(e) =>
                        updateSet(exercise.id, setIndex, "reps", Number(e.target.value) || 0)
                      }
                    />
                    <div className={styles.weightInputWrap}>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        className={styles.setInput}
                        value={set.weight === 0 ? "" : set.weight}
                        placeholder={lastWeight !== undefined ? String(lastWeight) : "0"}
                        onChange={(e) =>
                          updateSet(exercise.id, setIndex, "weight", Number(e.target.value) || 0)
                        }
                      />
                      <span className={styles.weightUnit}>kg</span>
                    </div>
                  </Fragment>
                ))}
              </div>
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
            {workout.cardio.durationMinutes} min - {workout.cardio.intensity}
          </p>
          <ExerciseVisual visualAssetKey={workout.cardio.visualAssetKey} variant="session" />
          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={cardioCompleted}
              onChange={(e) => setCardioCompleted(e.target.checked)}
            />
            I completed the cardio block
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

      <button type="button" className={styles.completeButton} onClick={handleComplete}>
        Complete Workout
      </button>
    </div>
  );
}
