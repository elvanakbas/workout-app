import { Link, useParams } from "react-router-dom";
import { getWorkoutById, programSlots } from "../data/program";
import { getSlotDisplayStatus } from "../lib/progress";
import { useAppData } from "../state/AppDataContext";
import StatusBadge from "../components/StatusBadge";
import ExerciseVisual from "../components/ExerciseVisual";
import type { Exercise } from "../types";
import styles from "./WorkoutDetailScreen.module.css";

function ExerciseRow({ exercise }: { exercise: Exercise }) {
  return (
    <li className={styles.exercise}>
      <ExerciseVisual visualAssetKey={exercise.visualAssetKey} variant="detail" />
      <div className={styles.exerciseHeader}>
        <span className={styles.exerciseName}>{exercise.name}</span>
        {exercise.optional ? <span className={styles.optionalTag}>Optional</span> : null}
      </div>
      <span className={styles.exerciseMeta}>
        {exercise.targetSets} sets x {exercise.targetReps}
        {exercise.restSeconds ? ` - rest ${exercise.restSeconds}s` : ""}
      </span>
      {exercise.safetyNote ? <p className={styles.safetyNote}>Safety: {exercise.safetyNote}</p> : null}
    </li>
  );
}

export default function WorkoutDetailScreen() {
  const { workoutId } = useParams<{ workoutId: string }>();
  const { completedOrders, recommendedNextOrder } = useAppData();
  const workout = workoutId ? getWorkoutById(workoutId) : undefined;

  if (!workout) {
    return (
      <div className={styles.screen}>
        <p>Workout not found.</p>
        <Link to="/">Back to program</Link>
      </div>
    );
  }

  // Flexible scheduling: every authored workout is always openable, in any
  // order - there is no locked state to check here anymore.
  const slot = programSlots.find((s) => s.order === workout.order);
  const status = slot ? getSlotDisplayStatus(slot, completedOrders, recommendedNextOrder) : undefined;

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <Link to="/" className={styles.back}>
          &larr; Program
        </Link>
        <h1 className={styles.title}>{workout.title}</h1>
        <div className={styles.metaRow}>
          <span className={workout.length === "short" ? styles.tagWorkday : styles.tagOffDay}>
            {workout.length === "short" ? "Workday" : "Off Day"}
          </span>
          <span className={styles.metaText}>
            Week {workout.week} - {workout.phaseLabel}
          </span>
          <span className={styles.metaText}>
            ~{workout.estimatedDurationMinutes.min}-{workout.estimatedDurationMinutes.max} min
          </span>
          {status ? <StatusBadge status={status} /> : null}
        </div>
        <p className={styles.focus}>{workout.focus}</p>
        <p className={styles.guidance}>{workout.intensityGuidance}</p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Warm-Up</h2>
        <ul className={styles.warmupList}>
          {workout.warmup.map((item) => (
            <li key={item.id} className={styles.warmupItem}>
              <ExerciseVisual visualAssetKey={item.visualAssetKey} variant="detail" />
              <span className={styles.warmupName}>{item.name}</span>
              <span className={styles.warmupDuration}>{item.duration}</span>
              {item.safetyNote ? <p className={styles.safetyNote}>Safety: {item.safetyNote}</p> : null}
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Strength</h2>
        <ul className={styles.exerciseList}>
          {workout.strength.map((exercise) => (
            <ExerciseRow key={exercise.id} exercise={exercise} />
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Core</h2>
        <ul className={styles.exerciseList}>
          {workout.core.map((exercise) => (
            <ExerciseRow key={exercise.id} exercise={exercise} />
          ))}
        </ul>
      </section>

      {workout.cardio ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Cardio{workout.cardio.optional ? " (Optional)" : ""}</h2>
          <div className={styles.cardioBlock}>
            <ExerciseVisual visualAssetKey={workout.cardio.visualAssetKey} variant="detail" />
            <span className={styles.exerciseName}>
              {workout.cardio.machine === "elliptical"
                ? "Elliptical"
                : workout.cardio.machine === "stationary_bike"
                  ? "Stationary Bike"
                  : "Rowing Machine"}
            </span>
            <span className={styles.exerciseMeta}>
              {workout.cardio.durationMinutes} min - {workout.cardio.intensity}
            </span>
            {workout.cardio.safetyNote ? (
              <p className={styles.safetyNote}>Safety: {workout.cardio.safetyNote}</p>
            ) : null}
          </div>
        </section>
      ) : null}

      <Link to={`/workout/${workout.id}/session`} className={styles.startButton}>
        Start Workout
      </Link>
    </div>
  );
}
