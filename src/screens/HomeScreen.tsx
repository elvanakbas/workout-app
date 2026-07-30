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

export default function HomeScreen() {
  const { completedOrders, recommendedNextOrder } = useAppData();
  const { notifyLocalMutation } = useCloudAuth();
  const [schedule, setSchedule] = useState(() => getProgramScheduleSettings());
  const [startDraft, setStartDraft] = useState(schedule.startDateKey ?? "");
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
        <p className={styles.kicker}>8-Week Strength Plan</p>
        <h1 className={styles.title}>Your Program</h1>
        <p className={styles.subtitle}>
          Week {currentWeek} of 8 · {completedCount} of 32 done
        </p>
      </header>

      <section className={styles.hero} aria-label="Today and next recommended">
        <div className={styles.todayBlock} aria-label="Today's preferred session">
          <p className={styles.heroEyebrow}>{today.eyebrow}</p>
          <h2 className={styles.todayTitle}>{today.title}</h2>
          <p className={styles.heroCopy}>{today.detail}</p>
          {today.kind === "preferred" && today.workout ? (
            <p className={styles.heroMeta}>
              ~{today.workout.estimatedDurationMinutes.min}–
              {today.workout.estimatedDurationMinutes.max} min main
              {schedule.startDateKey && plannedFor(today.workout)
                ? ` · ${scheduleStatusCopy({
                    preferredWeekday: today.workout.preferredWeekday,
                    plannedDateKey: plannedFor(today.workout),
                    isCompleted: completedOrders.has(today.workout.order),
                    isRecommendedNext: false,
                    todayKey
                  })}`
                : null}
            </p>
          ) : null}
        </div>

        <div className={styles.nextBlock} aria-label="Next recommended workout">
          <p className={styles.nextEyebrow}>Next recommended</p>
          {next ? (
            <>
              <h2 className={styles.heroTitle}>
                {IDENTITY_DISPLAY_LABEL[next.identity]} · {next.variantLabel}
              </h2>
              <p className={styles.heroFocus}>{next.focus}</p>
              <p className={styles.heroMeta}>
                Workout {next.order} · {PREFERRED_WEEKDAY_LABEL[next.preferredWeekday]}
                {" · "}~{next.estimatedDurationMinutes.min}–{next.estimatedDurationMinutes.max}{" "}
                min main · Week {next.week}
              </p>
              {!todayMatchesNext && today.kind === "preferred" ? (
                <p className={styles.heroCopy}>
                  Today’s preferred day differs from program order — train either freely.
                </p>
              ) : (
                <p className={styles.heroCopy}>
                  {scheduleStatusCopy({
                    preferredWeekday: next.preferredWeekday,
                    plannedDateKey: plannedFor(next),
                    isCompleted: completedOrders.has(next.order),
                    isRecommendedNext: true,
                    todayKey
                  })}
                </p>
              )}
              <Link to={`/workout/${next.id}`} className={styles.heroCta}>
                Continue {next.variantLabel}
              </Link>
            </>
          ) : (
            <p className={styles.heroFocus}>All 32 workouts completed — great work.</p>
          )}
        </div>
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
                        : PREFERRED_WEEKDAY_LABEL[workout.preferredWeekday].slice(0, 3)}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className={styles.scheduleBox} aria-label="Program start date">
        <h2 className={styles.sectionLabel}>Week 1 Upper A date</h2>
        <p className={styles.scheduleHint}>
          Optional. Sets planned dates from Workout 1. Preferred pattern stays Tue / Wed / Fri /
          Sun — choosing another weekday does not change your date.
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
                    Week {week}
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
                                <span className={styles.tagIdentity}>
                                  {IDENTITY_DISPLAY_LABEL[workout.identity]}
                                </span>
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
    </div>
  );
}
