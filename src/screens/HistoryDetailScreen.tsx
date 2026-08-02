import { Link, useParams } from "react-router-dom";
import { useAppData } from "../state/AppDataContext";
import {
  buildSessionComparison,
  countCompletedExercises,
  countCompletedWorkingSets,
  countSkippedOrIncompleteExercises,
  exerciseVolume,
  focusAreaLabel,
  formatDuration,
  formatSignedDelta,
  logHasRichSetDetail,
  resolveExerciseStatus,
  sessionLengthLabel,
  totalRepsWeightVolume
} from "../lib/workoutLogAnalytics";
import { findLogById } from "../lib/workoutLogNormalize";
import { dayTotals, remainingSummary } from "../lib/nutritionMath";
import { workoutLogLocalDateKey } from "../lib/nutritionWorkoutLink";
import { getNutritionDay, getNutritionSettings } from "../storage/nutritionStorage";
import type { ExerciseLog, SetLog, WorkoutLog } from "../types";
import { IDENTITY_DISPLAY_LABEL, PREFERRED_WEEKDAY_LABEL } from "../types";
import styles from "./HistoryDetailScreen.module.css";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function cardioMachineLabel(machine: string): string {
  if (machine === "elliptical") return "Elliptical";
  if (machine === "stationary_bike") return "Stationary Bike";
  if (machine === "rowing") return "Rowing Machine";
  return machine;
}

function statusLabel(status: ReturnType<typeof resolveExerciseStatus>): string {
  if (status === "completed") return "Completed";
  if (status === "skipped") return "Skipped";
  if (status === "incomplete") return "Incomplete";
  return "Recorded";
}

function unilateralSuffix(entry: ExerciseLog): string | null {
  const label = entry.targetUnitLabel || (entry.unilateral ? "per side" : null);
  if (!label) return null;
  const planned = (entry.plannedReps ?? "").toLowerCase();
  if (planned.includes(label.toLowerCase())) return null;
  return label;
}

function renderSetRow(entry: ExerciseLog, set: SetLog): string {
  const type = entry.measurementType;
  if (type === "duration") {
    const seconds = set.durationSeconds ?? 0;
    return seconds > 0 ? `${seconds} sec` : "—";
  }
  if (type === "reps-only") {
    return set.reps > 0 ? `${set.reps} reps` : "—";
  }
  if (type === "reps-weight") {
    if (set.reps <= 0 && set.weight <= 0) return "—";
    return `${set.reps} reps × ${set.weight} kg`;
  }
  // Legacy unknown measurement: show whatever was stored.
  const parts: string[] = [];
  if (set.reps > 0) parts.push(`${set.reps} reps`);
  if (set.weight > 0) parts.push(`${set.weight} kg`);
  if ((set.durationSeconds ?? 0) > 0) parts.push(`${set.durationSeconds} sec`);
  return parts.length > 0 ? parts.join(" · ") : "—";
}

function statusClass(status: ReturnType<typeof resolveExerciseStatus>): string {
  if (status === "completed") return styles.statusDone;
  if (status === "skipped") return styles.statusSkipped;
  if (status === "incomplete") return styles.statusIncomplete;
  return styles.statusNeutral;
}

function capitalize(value: string): string {
  return value.length === 0 ? value : value[0].toUpperCase() + value.slice(1);
}

/** Compact label/value pair used across the summary blocks. */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.stat}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

/**
 * Signed change against the previous session. `amount` only drives colour —
 * pass 0 to stay neutral where up/down is not inherently better or worse.
 */
function Delta({ label, amount, text }: { label: string; amount: number; text: string }) {
  const tone = amount > 0 ? styles.deltaUp : amount < 0 ? styles.deltaDown : styles.deltaFlat;
  return (
    <div className={`${styles.delta} ${tone}`}>
      <span className={styles.deltaLabel}>{label}</span>
      <span className={styles.deltaValue}>{text}</span>
    </div>
  );
}

function ExerciseBlock({ entry }: { entry: ExerciseLog }) {
  const status = resolveExerciseStatus(entry);
  const name = entry.name?.trim() || `Exercise (${entry.exerciseId})`;
  const side = unilateralSuffix(entry);
  const planned =
    typeof entry.plannedSets === "number" && entry.plannedReps
      ? `Planned ${entry.plannedSets} × ${entry.plannedReps}${side ? ` · ${side}` : ""}`
      : null;
  const volume = exerciseVolume(entry);
  const showSets = entry.sets.length > 0 && status !== "skipped";

  return (
    <section className={styles.exercise}>
      <div className={styles.exerciseHeader}>
        <h3 className={styles.exerciseName}>{name}</h3>
        <span className={`${styles.status} ${statusClass(status)}`}>{statusLabel(status)}</span>
      </div>
      {planned ? <p className={styles.meta}>{planned}</p> : null}
      {side && !planned ? <p className={styles.meta}>{side}</p> : null}
      {showSets ? (
        <ol className={styles.setList}>
          {entry.sets.map((set, index) => (
            <li key={index} className={styles.setRow}>
              <span className={styles.setIndex}>{index + 1}</span>
              <span className={styles.setValue}>{renderSetRow(entry, set)}</span>
            </li>
          ))}
        </ol>
      ) : null}
      {status === "skipped" ? (
        <p className={styles.meta}>Hidden by Low-Energy Mode for this session.</p>
      ) : null}
      {volume > 0 ? <p className={styles.volume}>Volume {volume} kg</p> : null}
    </section>
  );
}

function DetailBody({ log, logs }: { log: WorkoutLog; logs: WorkoutLog[] }) {
  const rich = logHasRichSetDetail(log);
  const hasAnySetValues = log.entries.some((entry) =>
    entry.sets.some(
      (set) => set.reps > 0 || set.weight > 0 || (set.durationSeconds ?? 0) > 0
    )
  );
  const showMissingDetail = !rich && !hasAnySetValues;
  const volume = totalRepsWeightVolume(log);
  const completedCount = countCompletedExercises(log);
  const skippedIncomplete = countSkippedOrIncompleteExercises(log);
  const workingSets = countCompletedWorkingSets(log);
  const comparison = buildSessionComparison(logs, log);
  const dayLabel = sessionLengthLabel(log.length);
  const focusLabel = focusAreaLabel(log.focusArea);
  const cardio = log.cardio;
  const cardioDone = cardio?.completed ?? log.cardioCompleted;

  return (
    <>
      <header className={styles.header}>
        <Link to="/history" className={styles.back}>
          ← History
        </Link>
        <h1 className={styles.title}>{log.workoutTitle}</h1>
        <p className={styles.subtitle}>{formatDateTime(log.completedAt)}</p>
        <div className={styles.chips}>
          <span className={styles.chipStrong}>Workout {log.order}</span>
          <span className={styles.chipId}>{log.workoutId}</span>
          {log.variantLabel ? <span className={styles.chip}>{log.variantLabel}</span> : null}
          {focusLabel ? <span className={styles.chip}>{focusLabel}</span> : null}
          {dayLabel ? <span className={styles.chip}>{dayLabel}</span> : null}
          {typeof log.durationSeconds === "number" ? (
            <span className={styles.chip}>{formatDuration(log.durationSeconds)}</span>
          ) : null}
          {log.lowEnergyMode ? <span className={styles.chip}>Low Energy Mode</span> : null}
          {log.workoutIdentity ? (
            <span className={styles.chip}>{IDENTITY_DISPLAY_LABEL[log.workoutIdentity]}</span>
          ) : null}
          {log.preferredWeekday ? (
            <span className={styles.chip}>
              Preferred {PREFERRED_WEEKDAY_LABEL[log.preferredWeekday]}
            </span>
          ) : null}
          {log.plannedDateKey ? (
            <span className={styles.chip}>Planned {log.plannedDateKey}</span>
          ) : null}
          {log.actualDateKey ? (
            <span className={styles.chip}>Actual {log.actualDateKey}</span>
          ) : null}
          {log.optionalCoreSelected !== undefined ? (
            <span className={styles.chip}>
              Core add-on:{" "}
              {log.optionalCoreCompleted
                ? "done"
                : log.optionalCoreSelected
                  ? "selected"
                  : "not added"}
            </span>
          ) : null}
          {log.optionalCardioSelected !== undefined ? (
            <span className={styles.chip}>
              Cardio add-on:{" "}
              {log.optionalCardioCompleted
                ? "done"
                : log.optionalCardioSelected
                  ? "selected"
                  : "not added"}
            </span>
          ) : null}
        </div>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Summary</h2>
        <dl className={styles.stats}>
          <Stat
            label="Exercises"
            value={`${completedCount}${log.entries.length > 0 ? ` / ${log.entries.length}` : ""}`}
          />
          <Stat label="Working sets" value={String(workingSets)} />
          <Stat label="Volume" value={volume > 0 ? `${volume} kg` : "n/a"} />
          {typeof log.durationSeconds === "number" ? (
            <Stat label="Duration" value={formatDuration(log.durationSeconds)} />
          ) : null}
        </dl>
        {skippedIncomplete > 0 ? (
          <p className={styles.meta}>Skipped / incomplete: {skippedIncomplete}</p>
        ) : null}
      </section>

      {comparison ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Vs previous session</h2>
          <div className={styles.deltaRow}>
            <Delta
              label="Volume"
              amount={comparison.volumeDelta}
              text={formatSignedDelta(comparison.volumeDelta, " kg")}
            />
            <Delta
              label="Working sets"
              amount={comparison.completedSetsDelta}
              text={formatSignedDelta(comparison.completedSetsDelta)}
            />
            {typeof comparison.durationDeltaSeconds === "number" ? (
              <Delta
                label="Duration"
                amount={0}
                text={`${formatDuration(Math.abs(comparison.durationDeltaSeconds))} ${
                  comparison.durationDeltaSeconds >= 0 ? "longer" : "shorter"
                }`}
              />
            ) : null}
          </div>
          <p className={styles.meta}>
            Compared to {comparison.previous.workoutTitle} (
            {formatDateTime(comparison.previous.completedAt)})
          </p>
        </section>
      ) : null}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Exercises</h2>
        {showMissingDetail ? (
          <p className={styles.notice}>
            Detailed set data was not recorded for this workout.
          </p>
        ) : null}
        {!showMissingDetail && log.entries.length === 0 ? (
          <p className={styles.notice}>No exercise entries were stored for this workout.</p>
        ) : null}
        <div className={styles.exerciseList}>
          {log.entries.map((entry) => (
            <ExerciseBlock key={entry.exerciseId} entry={entry} />
          ))}
        </div>
      </section>

      {cardio || typeof cardioDone === "boolean" ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Cardio</h2>
          {cardio ? (
            <>
              <p className={styles.cardioMachine}>
                {cardioMachineLabel(cardio.machine)}
                {cardio.alternateMachine
                  ? ` or ${cardioMachineLabel(cardio.alternateMachine)}`
                  : ""}
              </p>
              <dl className={styles.stats}>
                <Stat label="Planned" value={`${cardio.plannedMinutes} min`} />
                <Stat
                  label="Actual"
                  value={
                    typeof cardio.actualMinutes === "number"
                      ? `${cardio.actualMinutes} min`
                      : "not recorded"
                  }
                />
                <Stat label="Status" value={cardio.completed ? "Completed" : "Not completed"} />
              </dl>
              {cardio.intensity ? <p className={styles.meta}>{cardio.intensity}</p> : null}
            </>
          ) : (
            <p className={styles.meta}>
              Cardio block: {cardioDone ? "Completed" : "Not completed"}
            </p>
          )}
        </section>
      ) : null}

      {log.feedback ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>How it felt</h2>
          <dl className={styles.stats}>
            <Stat label="Difficulty" value={`${log.feedback.difficulty}/10`} />
            <Stat label="Energy" value={capitalize(log.feedback.energy)} />
            <Stat label="Lower back" value={`${log.feedback.lowerBackPain}/10`} />
            <Stat label="Knee" value={`${log.feedback.kneePain}/10`} />
            <Stat label="Shoulder" value={`${log.feedback.shoulderPain}/10`} />
          </dl>
          {log.feedback.note ? <p className={styles.note}>{log.feedback.note}</p> : null}
        </section>
      ) : null}

      <NutritionThatDaySection log={log} />
    </>
  );
}

function formatMacro(n: number, decimals = 0): string {
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString(undefined, {
    maximumFractionDigits: decimals,
    minimumFractionDigits: 0
  });
}

/**
 * Read-only Nutrition summary for the workout's local calendar date.
 * Uses current NutritionDay data and current global targets (not a snapshot
 * frozen at workout completion).
 */
function NutritionThatDaySection({ log }: { log: WorkoutLog }) {
  const dateKey = workoutLogLocalDateKey(log);
  if (!dateKey) return null;

  const day = getNutritionDay(dateKey);
  const hasEntries = !!day && day.entries.length > 0;
  if (!hasEntries) {
    return (
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Nutrition that day</h2>
        <p className={styles.meta}>
          No nutrition currently recorded for {dateKey}.
        </p>
        <Link to={`/nutrition/${dateKey}`} className={styles.nutritionLink}>
          View Nutrition Day
        </Link>
      </section>
    );
  }

  const settings = getNutritionSettings();
  const totals = dayTotals(day);
  const remaining = remainingSummary(totals, settings);

  const remainingParts: string[] = [];
  if (remaining.caloriesOverTarget) {
    remainingParts.push(`${formatMacro(remaining.caloriesOverBy)} kcal over current target`);
  } else {
    remainingParts.push(`${formatMacro(remaining.caloriesRemaining)} kcal remaining vs current target`);
  }
  if (remaining.proteinOverTarget) {
    remainingParts.push(`${formatMacro(remaining.proteinOverBy, 1)} g protein over current target`);
  } else {
    remainingParts.push(
      `${formatMacro(remaining.proteinRemaining, 1)} g protein remaining vs current target`
    );
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Nutrition that day</h2>
      <p className={styles.meta}>
        Nutrition currently recorded for {dateKey} (may have been added or edited after this
        workout). Targets shown are your current settings, not historical snapshots.
      </p>
      <dl className={styles.stats}>
        <Stat
          label="Calories"
          value={`${formatMacro(totals.calories)} / ${formatMacro(settings.calorieTarget)}`}
        />
        <Stat
          label="Protein"
          value={`${formatMacro(totals.proteinGrams, 1)} / ${formatMacro(
            settings.proteinTargetGrams,
            1
          )} g`}
        />
      </dl>
      <p className={styles.meta}>{remainingParts.join(" · ")}</p>
      <Link to={`/nutrition/${dateKey}`} className={styles.nutritionLink}>
        View Nutrition Day
      </Link>
    </section>
  );
}

export default function HistoryDetailScreen() {
  const { logId: rawLogId } = useParams<{ logId: string }>();
  const { logs } = useAppData();
  const logId = rawLogId ? decodeURIComponent(rawLogId) : undefined;
  const log = logId ? findLogById(logs, logId) : undefined;

  if (!logId || !log) {
    return (
      <div className={styles.screen}>
        <header className={styles.header}>
          <Link to="/history" className={styles.back}>
            ← History
          </Link>
          <h1 className={styles.title}>Workout not found</h1>
          <p className={styles.notice}>
            This history entry is missing or was deleted. Your other logs are unaffected.
          </p>
        </header>
      </div>
    );
  }

  return (
    <div className={styles.screen}>
      <DetailBody log={log} logs={logs} />
    </div>
  );
}
