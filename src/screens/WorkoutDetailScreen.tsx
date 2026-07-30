import { Link, useParams } from "react-router-dom";
import { getMandatoryExercises, getWorkoutById, programSlots } from "../data/program";
import { getSlotDisplayStatus } from "../lib/progress";
import { roleDisplayLabel } from "../lib/roleDisplay";
import { plannedDateKeyForOrder, scheduleStatusCopy } from "../lib/schedule";
import { formatLocalDateKeyLabel, todayLocalDateKey } from "../lib/localDate";
import { getProgramScheduleSettings } from "../storage/programSettings";
import { getLastWeightForExercise } from "../lib/history";
import { useAppData } from "../state/AppDataContext";
import StatusBadge from "../components/StatusBadge";
import ExerciseVisual from "../components/ExerciseVisual";
import type { Exercise, ExerciseRole } from "../types";
import {
  IDENTITY_DISPLAY_LABEL,
  PREFERRED_WEEKDAY_LABEL,
  MUSCLE_GROUP_LABEL
} from "../types";
import styles from "./WorkoutDetailScreen.module.css";

function roleClass(role: ExerciseRole): string {
  if (role === "primary") return styles.rolePrimary;
  if (role === "secondary") return styles.roleSecondary;
  if (role === "isolation") return styles.roleAccessory;
  if (role === "core") return styles.roleStability;
  return styles.roleAccessory;
}

function ExerciseRow({
  exercise,
  emphasize,
  lastPerformance
}: {
  exercise: Exercise;
  emphasize?: boolean;
  lastPerformance?: string | null;
}) {
  return (
    <li className={`${styles.exercise} ${emphasize ? styles.exercisePrimary : ""}`}>
      <ExerciseVisual visualAssetKey={exercise.visualAssetKey} variant="detail" />
      <div className={styles.exerciseHeader}>
        <span className={styles.exerciseName}>{exercise.name}</span>
        <span className={`${styles.roleBadge} ${roleClass(exercise.role)}`}>
          {roleDisplayLabel(exercise.role)}
        </span>
      </div>
      <span className={styles.exerciseMeta}>
        {exercise.targetSets} sets × {exercise.targetReps}
        {exercise.restSeconds ? ` · rest ${exercise.restSeconds}s` : ""}
      </span>
      {lastPerformance ? (
        <span className={styles.lastPerf}>Last time: {lastPerformance}</span>
      ) : null}
      {exercise.safetyNote ? <p className={styles.safetyNote}>Safety: {exercise.safetyNote}</p> : null}
    </li>
  );
}

function cardioLabel(machine: string): string {
  if (machine === "elliptical") return "Elliptical";
  if (machine === "stationary_bike") return "Stationary Bike";
  return "Rowing Machine";
}

function groupByRole(exercises: Exercise[]): { role: ExerciseRole; items: Exercise[] }[] {
  const order: ExerciseRole[] = ["primary", "secondary", "isolation", "core"];
  const map = new Map<ExerciseRole, Exercise[]>();
  for (const ex of exercises) {
    const list = map.get(ex.role) ?? [];
    list.push(ex);
    map.set(ex.role, list);
  }
  return order.filter((r) => map.has(r)).map((role) => ({ role, items: map.get(role)! }));
}

export default function WorkoutDetailScreen() {
  const { workoutId } = useParams<{ workoutId: string }>();
  const { completedOrders, recommendedNextOrder, logs } = useAppData();
  const workout = workoutId ? getWorkoutById(workoutId) : undefined;
  const schedule = getProgramScheduleSettings();

  if (!workout) {
    return (
      <div className={styles.screen}>
        <p>Workout not found.</p>
        <Link to="/">Back to program</Link>
      </div>
    );
  }

  const slot = programSlots.find((s) => s.order === workout.order);
  const status = slot ? getSlotDisplayStatus(slot, completedOrders, recommendedNextOrder) : undefined;
  const mandatory = getMandatoryExercises(workout);
  const primary = mandatory.find((e) => e.role === "primary");
  const planned = schedule.startDateKey
    ? plannedDateKeyForOrder(schedule.startDateKey, workout.order)
    : null;
  const muscleLine = workout.primaryMuscleGroups.map((m) => MUSCLE_GROUP_LABEL[m]).join(" · ");
  const mandatorySets = mandatory.reduce((n, e) => n + e.targetSets, 0);

  const lastPrimary =
    primary != null
      ? (() => {
          const w = getLastWeightForExercise(logs, primary.id);
          return w != null ? `${w} kg (prior session)` : null;
        })()
      : null;

  const hasAddOns = (workout.optionalCore?.length ?? 0) > 0 || !!workout.cardio;

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <Link to="/" className={styles.back}>
          &larr; Program
        </Link>
        <p className={styles.identityKicker}>
          {IDENTITY_DISPLAY_LABEL[workout.identity]} · {workout.variantLabel}
        </p>
        <h1 className={styles.title}>{workout.title}</h1>
        <div className={styles.metaRow}>
          <span className={workout.length === "short" ? styles.tagWorkday : styles.tagOffDay}>
            {workout.length === "short" ? "Workday" : "Off day"}
          </span>
          <span className={styles.metaText}>
            {PREFERRED_WEEKDAY_LABEL[workout.preferredWeekday]}
          </span>
          <span className={styles.metaText}>
            ~{workout.estimatedDurationMinutes.min}–{workout.estimatedDurationMinutes.max} min main
          </span>
          {status ? <StatusBadge status={status} /> : null}
        </div>
        <p className={styles.focus}>{workout.focus}</p>
        <p className={styles.metaText}>
          {scheduleStatusCopy({
            preferredWeekday: workout.preferredWeekday,
            plannedDateKey: planned,
            isCompleted: completedOrders.has(workout.order),
            isRecommendedNext: status === "recommendedNext",
            todayKey: todayLocalDateKey()
          })}
          {planned ? ` · ${formatLocalDateKeyLabel(planned)}` : ""}
        </p>
        <p className={styles.metaText}>
          Week {workout.week} · {workout.phaseLabel} · {mandatory.length} exercises · {mandatorySets}{" "}
          mandatory sets
        </p>
        <p className={styles.guidance}>{workout.intensityGuidance}</p>
        <p className={styles.focus}>{muscleLine}</p>
      </header>

      {primary ? (
        <section className={styles.primaryCallout}>
          <h2 className={styles.sectionTitle}>Primary Lift</h2>
          <ExerciseRow exercise={primary} emphasize lastPerformance={lastPrimary} />
        </section>
      ) : null}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Warm-up</h2>
        <ul className={styles.warmupList}>
          {workout.warmup.map((item) => (
            <li key={item.id} className={styles.warmupItem}>
              <ExerciseVisual visualAssetKey={item.visualAssetKey} variant="detail" />
              <span className={styles.warmupName}>{item.name}</span>
              <span className={styles.warmupDuration}>{item.duration}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Main workout</h2>
        {groupByRole(mandatory.filter((e) => e.role !== "primary")).map(({ role, items }) => (
          <div key={role} className={styles.roleGroup}>
            <h3 className={styles.roleGroupTitle}>{roleDisplayLabel(role)}</h3>
            <ul className={styles.exerciseList}>
              {items.map((exercise) => (
                <ExerciseRow key={exercise.id} exercise={exercise} />
              ))}
            </ul>
          </div>
        ))}
      </section>

      {hasAddOns ? (
        <section className={styles.addons}>
          <h2 className={styles.sectionTitle}>Optional add-ons</h2>
          <p className={styles.addonHint}>
            Not required to finish the workout. Skipping is fine.
          </p>
          {workout.optionalCore && workout.optionalCore.length > 0 ? (
            <div className={styles.addonCard}>
              <h3 className={styles.addonTitle}>Add 10 min Core</h3>
              <ul className={styles.exerciseList}>
                {workout.optionalCore.map((exercise) => (
                  <ExerciseRow key={exercise.id} exercise={exercise} />
                ))}
              </ul>
            </div>
          ) : null}
          {workout.cardio ? (
            <div className={styles.addonCard}>
              <h3 className={styles.addonTitle}>
                Add {workout.cardio.durationMinutes} min Cardio
              </h3>
              <div className={styles.cardioBlock}>
                <ExerciseVisual visualAssetKey={workout.cardio.visualAssetKey} variant="detail" />
                <span className={styles.exerciseName}>
                  {cardioLabel(workout.cardio.machine)}
                  {workout.cardio.alternateMachine
                    ? ` or ${cardioLabel(workout.cardio.alternateMachine)}`
                    : ""}
                </span>
                <span className={styles.exerciseMeta}>{workout.cardio.intensity}</span>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <Link to={`/workout/${workout.id}/session`} className={styles.startButton}>
        Start Workout
      </Link>
    </div>
  );
}
