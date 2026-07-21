import { Fragment } from "react";
import { Link } from "react-router-dom";
import { programSlots } from "../data/program";
import { getSlotDisplayStatus } from "../lib/progress";
import { useAppData } from "../state/AppDataContext";
import StatusBadge from "../components/StatusBadge";
import styles from "./HomeScreen.module.css";

export default function HomeScreen() {
  const { completedOrders, recommendedNextOrder } = useAppData();
  const recommendedWorkout =
    recommendedNextOrder !== undefined
      ? programSlots.find((s) => s.order === recommendedNextOrder)
      : undefined;

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>Your Program</h1>
        <p className={styles.subtitle}>
          {recommendedWorkout?.status === "ready"
            ? `Recommended next: Workout ${recommendedWorkout.order} - ${recommendedWorkout.workout.title}`
            : "All 32 workouts completed - great work!"}
        </p>
      </header>

      <ul className={styles.list}>
        {programSlots.map((slot, index) => {
          const status = getSlotDisplayStatus(slot, completedOrders, recommendedNextOrder);
          const title = slot.status === "ready" ? slot.workout.title : `Workout ${slot.order}`;
          const isFirstOfWeek = slot.status === "ready" && index % 4 === 0;

          const content = (
            <>
              <span className={styles.order}>{slot.order}</span>
              <span className={styles.itemBody}>
                <span className={styles.itemTitle}>{title}</span>
                {slot.status === "ready" ? (
                  <span
                    className={slot.workout.length === "short" ? styles.tagWorkday : styles.tagOffDay}
                  >
                    {slot.workout.length === "short" ? "Workday" : "Off Day"}
                  </span>
                ) : null}
              </span>
              <StatusBadge status={status} />
            </>
          );

          return (
            <Fragment key={slot.order}>
              {isFirstOfWeek ? (
                <li className={styles.weekHeader}>Week {slot.workout.week}</li>
              ) : null}
              <li className={styles.item}>
                {/* Every authored workout is always openable - flexible scheduling, no locking. */}
                {slot.status === "ready" ? (
                  <Link to={`/workout/${slot.workout.id}`} className={styles.itemLink}>
                    {content}
                  </Link>
                ) : (
                  <div className={`${styles.itemLink} ${styles.itemDisabled}`} aria-disabled="true">
                    {content}
                  </div>
                )}
              </li>
            </Fragment>
          );
        })}
      </ul>
    </div>
  );
}
