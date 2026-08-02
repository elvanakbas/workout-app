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

/**
 * Compact, scannable row: a small visual, the name, and the numbers that decide
 * what you actually do. A full-width image per exercise made a six-movement
 * workout several screens long and impossible to read at a glance.
 */
function ExerciseRow({
  exercise,
  lastPerformance
}: {
  exercise: Exercise;
  lastPerformance?: string | null;
}) {
  return (
    <li className={styles.row}>
      <ExerciseVisual visualAssetKey={exercise.visualAssetKey} variant="thumb" />
      <div className={styles.rowBody}>
        <div className={styles.rowHead}>
          <span className={styles.rowName}>{exercise.name}</span>
          <span className={`${styles.roleBadge} ${roleClass(exercise.role)}`}>
            {roleDisplayLabel(exercise.role)}
          </span>
        </div>
        <span className={styles.rowMeta}>
          <strong>
            {exercise.targetSets} × {exercise.targetReps}
          </strong>
          {exercise.restSeconds ? ` · rest ${exercise.restSeconds}s` : ""}
        </span>
        {lastPerformance ? <span className={styles.lastPerf}>Last: {lastPerformance}</span> : null}
        {exercise.safetyNote ? (
          <p className={styles.safetyNote}>
            <span className={styles.safetyLabel}>Safety</span>
            {exercise.safetyNote}
          </p>
        ) : null}
      </div>
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
          return w != null ? `${w} kg` : null;
        })()
      : null;

  const hasAddOns = (workout.optionalCore?.length ?? 0) > 0 || !!workout.cardio;
  const scheduleLine = scheduleStatusCopy({
    preferredWeekday: workout.preferredWeekday,
    plannedDateKey: planned,
    isCompleted: completedOrders.has(workout.order),
    isRecommendedNext: status === "recommendedNext",
    todayKey: todayLocalDateKey()
  });

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <Link to="/" className={styles.back}>
          ← Program
        </Link>
        <p className={styles.kicker}>
          {IDENTITY_DISPLAY_LABEL[workout.identity]} · {workout.variantLabel} · Week {workout.week}
        </p>
        <h1 className={styles.title}>{workout.title}</h1>
        <p className={styles.focus}>{workout.focus}</p>

        <div className={styles.badgeRow}>
          <span className={workout.length === "short" ? styles.tagWorkday : styles.tagOffDay}>
            {workout.length === "short" ? "Workday" : "Off day"}
          </span>
          <span className={styles.tagNeutral}>
            {PREFERRED_WEEKDAY_LABEL[workout.preferredWeekday]}
          </span>
          {status ? <StatusBadge status={status} /> : null}
        </div>

        <dl className={styles.stats}>
          <div className={styles.stat}>
            <dt>Exercises</dt>
            <dd>{mandatory.length}</dd>
          </div>
          <div className={styles.stat}>
            <dt>Sets</dt>
            <dd>{mandatorySets}</dd>
          </div>
          <div className={styles.stat}>
            <dt>Duration</dt>
            <dd>
              {workout.estimatedDurationMinutes.min}–{workout.estimatedDurationMinutes.max}
              <span className={styles.statUnit}>min</span>
            </dd>
          </div>
          <div className={styles.stat}>
            <dt>Block</dt>
            <dd>{workout.trainingBlock}</dd>
          </div>
        </dl>

        <p className={styles.scheduleLine}>
          {scheduleLine}
          {planned ? ` · ${formatLocalDateKeyLabel(planned)}` : ""}
        </p>
        <p className={styles.guidance}>
          <span className={styles.phaseTag}>{workout.phaseLabel}</span>
          {workout.intensityGuidance}
        </p>
        <p className={styles.muscleLine}>{muscleLine}</p>
      </header>

      {primary ? (
        <section className={styles.primaryCard}>
          <span className={styles.primaryKicker}>Primary Lift</span>
          <ExerciseVisual visualAssetKey={primary.visualAssetKey} variant="detail" />
          <h2 className={styles.primaryName}>{primary.name}</h2>
          <p className={styles.primaryTarget}>
            {primary.targetSets} × {primary.targetReps}
            {primary.restSeconds ? ` · rest ${primary.restSeconds}s` : ""}
            {lastPrimary ? ` · last ${lastPrimary}` : ""}
          </p>
          {primary.safetyNote ? (
            <p className={styles.safetyNote}>
              <span className={styles.safetyLabel}>Safety</span>
              {primary.safetyNote}
            </p>
          ) : null}
        </section>
      ) : null}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Warm-up</h2>
        <ul className={styles.warmupList}>
          {workout.warmup.map((item) => (
            <li key={item.id} className={styles.warmupItem}>
              <ExerciseVisual visualAssetKey={item.visualAssetKey} variant="thumb" />
              <div className={styles.rowBody}>
                <span className={styles.rowName}>{item.name}</span>
                <span className={styles.rowMeta}>{item.duration}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Main workout</h2>
        {groupByRole(mandatory.filter((e) => e.role !== "primary")).map(({ role, items }) => (
          <div key={role} className={styles.roleGroup}>
            <h3 className={styles.roleGroupTitle}>
              {roleDisplayLabel(role)}
              <span className={styles.roleGroupCount}>
                {items.reduce((n, e) => n + e.targetSets, 0)} sets
              </span>
            </h3>
            <ul className={styles.rowList}>
              {items.map((exercise) => (
                <ExerciseRow key={exercise.id} exercise={exercise} />
              ))}
            </ul>
          </div>
        ))}
      </section>

      {hasAddOns ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Optional add-ons</h2>
          <p className={styles.addonHint}>Not required to finish the workout. Skipping is fine.</p>
          {workout.optionalCore && workout.optionalCore.length > 0 ? (
            <div className={styles.addonCard}>
              <h3 className={styles.addonTitle}>Add 10 min Core</h3>
              <ul className={styles.rowList}>
                {workout.optionalCore.map((exercise) => (
                  <ExerciseRow key={exercise.id} exercise={exercise} />
                ))}
              </ul>
            </div>
          ) : null}
          {workout.cardio ? (
            <div className={styles.addonCard}>
              <h3 className={styles.addonTitle}>Add {workout.cardio.durationMinutes} min Cardio</h3>
              <ul className={styles.rowList}>
                <li className={styles.row}>
                  <ExerciseVisual visualAssetKey={workout.cardio.visualAssetKey} variant="thumb" />
                  <div className={styles.rowBody}>
                    <span className={styles.rowName}>
                      {cardioLabel(workout.cardio.machine)}
                      {workout.cardio.alternateMachine
                        ? ` or ${cardioLabel(workout.cardio.alternateMachine)}`
                        : ""}
                    </span>
                    <span className={styles.rowMeta}>{workout.cardio.intensity}</span>
                  </div>
                </li>
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      <div className={styles.startBar}>
        <Link to={`/workout/${workout.id}/session`} className={styles.startButton}>
          Start Workout
        </Link>
      </div>
    </div>
  );
}
