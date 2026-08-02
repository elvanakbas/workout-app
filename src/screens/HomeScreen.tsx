import { Fragment, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getAllWorkouts, programSlots } from "../data/program";
import { getSlotDisplayStatus } from "../lib/progress";
import {
  plannedDateKeyForOrder,
  resolveTodayPlanContext,
  scheduleStatusCopy
} from "../lib/schedule";
import { todayLocalDateKey } from "../lib/localDate";
import {
  getProgramScheduleSettings,
  saveProgramScheduleSettings
} from "../storage/programSettings";
import { useAppData } from "../state/AppDataContext";
import { useCloudAuth } from "../cloud/CloudAuthContext";
import StatusBadge from "../components/StatusBadge";
import {
  IDENTITY_DISPLAY_LABEL,
  PREFERRED_WEEKDAY_LABEL,
  type Workout,
  type WorkoutIdentity
} from "../types";
import styles from "./HomeScreen.module.css";

const IDENTITY_ORDER: WorkoutIdentity[] = ["push", "quad", "pull", "posterior"];

function weekWorkouts(week: number): Workout[] {
  return getAllWorkouts().filter((w) => w.week === week);
}

/**
 * Surfaces the two-block structure the program actually runs on, so weeks 6–8
 * reading differently from weeks 1–4 is expected rather than confusing.
 */
function blockLabelForWeek(week: number): string {
  const sample = weekWorkouts(week)[0];
  if (!sample) return "";
  if (sample.phaseLabel.toLowerCase().includes("deload")) return "Deload week";
  return `Block ${sample.trainingBlock}`;
}

export default function HomeScreen() {
  const { completedOrders, recommendedNextOrder } = useAppData();
  const { notifyLocalMutation } = useCloudAuth();
  const [schedule, setSchedule] = useState(() => getProgramScheduleSettings());
  const [startDraft, setStartDraft] = useState(schedule.startDateKey ?? "");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [collapsedWeeks, setCollapsedWeeks] = useState<Record<number, boolean>>(() => {
    const init: Record<number, boolean> = {};
    for (let w = 1; w <= 8; w++) init[w] = w > 1;
    return init;
  });

  const todayKey = todayLocalDateKey();
  const allWorkouts = useMemo(() => getAllWorkouts(), []);
  const recommendedWorkout =
    recommendedNextOrder !== undefined
      ? programSlots.find((s) => s.order === recommendedNextOrder)
      : undefined;
  const next =
    recommendedWorkout?.status === "ready" ? recommendedWorkout.workout : undefined;

  const completedCount = completedOrders.size;
  const currentWeek = next?.week ?? (completedCount >= 32 ? 8 : Math.floor(completedCount / 4) + 1);

  const thisWeek = useMemo(() => {
    const base = next ? weekWorkouts(next.week) : weekWorkouts(currentWeek);
    return IDENTITY_ORDER.map((identity) => {
      const workout = base.find((w) => w.identity === identity);
      return workout;
    }).filter(Boolean) as Workout[];
  }, [next, currentWeek]);

  const today = useMemo(
    () =>
      resolveTodayPlanContext({
        todayKey,
        startDateKey: schedule.startDateKey,
        weekWorkouts: thisWeek,
        allWorkouts
      }),
    [todayKey, schedule.startDateKey, thisWeek, allWorkouts]
  );

  const plannedFor = (workout: Workout) =>
    schedule.startDateKey
      ? plannedDateKeyForOrder(schedule.startDateKey, workout.order)
      : null;

  const saveStartDate = () => {
    const value = startDraft.trim();
    const nextSettings = saveProgramScheduleSettings({
      startDateKey: value.length === 10 ? value : null
    });
    setSchedule(nextSettings);
    notifyLocalMutation();
  };

  const clearStartDate = () => {
    const nextSettings = saveProgramScheduleSettings({ startDateKey: null });
    setSchedule(nextSettings);
    setStartDraft("");
    notifyLocalMutation();
  };

  const todayMatchesNext =
    today.kind === "preferred" &&
    next != null &&
    today.workout != null &&
    today.workout.id === next.id;

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div>
            <p className={styles.kicker}>8-Week Strength Plan</p>
            <h1 className={styles.title}>Your Program</h1>
          </div>
          <span className={styles.progressCount}>
            <strong>{completedCount}</strong>
            <span>/32</span>
          </span>
        </div>
        <div
          className={styles.progressTrack}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={32}
          aria-valuenow={completedCount}
          aria-label="Workouts completed"
        >
          <div
            className={styles.progressFill}
            style={{ width: `${(completedCount / 32) * 100}%` }}
          />
        </div>
        <p className={styles.subtitle}>
          Week {currentWeek} of 8 · {blockLabelForWeek(currentWeek)}
        </p>
      </header>

      {/* The action to take now. Recommended Next is program order — it can
          differ from today's preferred weekday, so Today stays a separate note. */}
      <section className={styles.hero} aria-label="Next recommended workout">
        {next ? (
          <>
            <div className={styles.heroHead}>
              <p className={styles.nextEyebrow}>Next recommended</p>
              <span className={styles.heroOrder}>#{next.order}</span>
            </div>
            <h2 className={styles.heroTitle}>
              {IDENTITY_DISPLAY_LABEL[next.identity]} · {next.variantLabel}
            </h2>
            <p className={styles.heroFocus}>{next.focus}</p>
            <div className={styles.heroFacts}>
              <span className={styles.heroFact}>
                {PREFERRED_WEEKDAY_LABEL[next.preferredWeekday]}
              </span>
              <span className={styles.heroFact}>
                ~{next.estimatedDurationMinutes.min}–{next.estimatedDurationMinutes.max} min
              </span>
              <span className={styles.heroFact}>Week {next.week}</span>
            </div>
            {plannedFor(next) ? (
              /* Only worth a line when a start date is set — otherwise this just
                 repeats the "Next recommended" eyebrow above. */
              <p className={styles.heroCopy}>
                {scheduleStatusCopy({
                  preferredWeekday: next.preferredWeekday,
                  plannedDateKey: plannedFor(next),
                  isCompleted: completedOrders.has(next.order),
                  isRecommendedNext: true,
                  todayKey
                })}
              </p>
            ) : null}
            <Link to={`/workout/${next.id}`} className={styles.heroCta}>
              Continue {next.variantLabel}
            </Link>
          </>
        ) : (
          <p className={styles.heroFocus}>All 32 workouts completed — great work.</p>
        )}
      </section>

      <section className={styles.todayNote} aria-label="Today's preferred session">
        <p className={styles.todayEyebrow}>{today.eyebrow}</p>
        <p className={styles.todayTitle}>{today.title}</p>
        <p className={styles.todayDetail}>
          {!todayMatchesNext && today.kind === "preferred"
            ? "Today’s preferred day differs from program order — train either freely."
            : today.detail}
        </p>
      </section>

      <section className={styles.weekStrip} aria-label="This week">
        <h2 className={styles.sectionLabel}>This week</h2>
        <div className={styles.stripGrid}>
          {thisWeek.map((workout) => {
            const status = getSlotDisplayStatus(
              { order: workout.order, status: "ready", workout },
              completedOrders,
              recommendedNextOrder
            );
            const planned = plannedFor(workout);
            return (
              <Link
                key={workout.id}
                to={`/workout/${workout.id}`}
                className={`${styles.stripItem} ${
                  status === "recommendedNext" ? styles.stripNext : ""
                } ${status === "completed" ? styles.stripDone : ""}`}
              >
                <span className={styles.stripIdentity}>
                  {IDENTITY_DISPLAY_LABEL[workout.identity]}
                </span>
                <span className={styles.stripDay}>
                  {PREFERRED_WEEKDAY_LABEL[workout.preferredWeekday].slice(0, 3)}
                </span>
                <span className={styles.stripStatus}>
                  {status === "completed"
                    ? "Done"
                    : status === "recommendedNext"
                      ? "Next"
                      : planned
                        ? scheduleStatusCopy({
                            preferredWeekday: workout.preferredWeekday,
                            plannedDateKey: planned,
                            isCompleted: false,
                            isRecommendedNext: false,
                            todayKey
                          })
                        : /* No date set: the weekday is already on the line above,
                             so show the time cost instead of repeating it. */
                          `~${workout.estimatedDurationMinutes.min}–${workout.estimatedDurationMinutes.max}m`}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className={styles.programList} aria-label="Full program">
        <h2 className={styles.sectionLabel}>Full program</h2>
        <ul className={styles.list}>
          {Array.from({ length: 8 }, (_, i) => i + 1).map((week) => {
            const collapsed = collapsedWeeks[week] === true;
            const slots = programSlots.filter(
              (s) => s.status === "ready" && s.workout.week === week
            );
            return (
              <Fragment key={week}>
                <li className={styles.weekHeader}>
                  <button
                    type="button"
                    className={styles.weekToggle}
                    onClick={() =>
                      setCollapsedWeeks((prev) => ({ ...prev, [week]: !prev[week] }))
                    }
                    aria-expanded={!collapsed}
                  >
                    <span className={styles.weekName}>
                      Week {week}
                      <span className={styles.weekBlock}>{blockLabelForWeek(week)}</span>
                    </span>
                    <span className={styles.weekToggleHint}>{collapsed ? "Show" : "Hide"}</span>
                  </button>
                </li>
                {!collapsed
                  ? slots.map((slot) => {
                      if (slot.status !== "ready") return null;
                      const workout = slot.workout;
                      const status = getSlotDisplayStatus(
                        slot,
                        completedOrders,
                        recommendedNextOrder
                      );
                      const planned = plannedFor(workout);
                      return (
                        <li key={slot.order} className={styles.item}>
                          <Link to={`/workout/${workout.id}`} className={styles.itemLink}>
                            <span className={styles.order}>{slot.order}</span>
                            <span className={styles.itemBody}>
                              <span className={styles.itemTitle}>
                                {IDENTITY_DISPLAY_LABEL[workout.identity]} · {workout.variantLabel}
                              </span>
                              <span className={styles.tagRow}>
                                <span
                                  className={
                                    workout.length === "short" ? styles.tagWorkday : styles.tagOffDay
                                  }
                                >
                                  {workout.length === "short" ? "Workday" : "Off day"}
                                </span>
                                <span className={styles.dayLabel}>
                                  {PREFERRED_WEEKDAY_LABEL[workout.preferredWeekday]}
                                </span>
                                <span className={styles.dayLabel}>
                                  ~{workout.estimatedDurationMinutes.min}–
                                  {workout.estimatedDurationMinutes.max} min
                                </span>
                              </span>
                              <span className={styles.muscleLine}>
                                {scheduleStatusCopy({
                                  preferredWeekday: workout.preferredWeekday,
                                  plannedDateKey: planned,
                                  actualDateKey: null,
                                  isCompleted: status === "completed",
                                  isRecommendedNext: status === "recommendedNext",
                                  todayKey
                                })}
                              </span>
                            </span>
                            <StatusBadge status={status} />
                          </Link>
                        </li>
                      );
                    })
                  : null}
              </Fragment>
            );
          })}
        </ul>
      </section>

      {/* Optional planning aid, not a gate — kept out of the primary flow. */}
      <section className={styles.scheduleBox} aria-label="Program start date">
        <button
          type="button"
          className={styles.scheduleToggle}
          aria-expanded={scheduleOpen}
          onClick={() => setScheduleOpen((v) => !v)}
        >
          <span className={styles.sectionLabel}>Week 1 Upper A date</span>
          <span className={styles.scheduleState}>
            {schedule.startDateKey ? schedule.startDateKey : "Not set"}
            <span className={styles.disclosureIcon}>{scheduleOpen ? "▾" : "▸"}</span>
          </span>
        </button>
        {scheduleOpen ? (
          <>
            <p className={styles.scheduleHint}>
              Optional. Sets planned dates from Workout 1. Preferred pattern stays Tue / Wed / Fri /
              Sun — choosing another weekday does not change your date. Dates never lock a workout
              or change Recommended Next.
            </p>
            <div className={styles.scheduleRow}>
              <input
                type="date"
                className={styles.dateInput}
                value={startDraft}
                onChange={(e) => setStartDraft(e.target.value)}
                aria-label="Week 1 Upper A date"
              />
              <button type="button" className={styles.scheduleBtn} onClick={saveStartDate}>
                Save
              </button>
              {schedule.startDateKey ? (
                <button type="button" className={styles.scheduleBtnGhost} onClick={clearStartDate}>
                  Clear
                </button>
              ) : null}
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}
