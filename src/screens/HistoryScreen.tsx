import { useAppData } from "../state/AppDataContext";
import type { WorkoutLog } from "../types";
import styles from "./HistoryScreen.module.css";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function summarize(log: WorkoutLog): string {
  const totalSets = log.entries.reduce((sum, entry) => sum + entry.sets.length, 0);
  const exerciseCount = log.entries.length;
  return `${exerciseCount} exercises - ${totalSets} sets logged`;
}

/** Old logs recorded before feedback existed won't have this field - render nothing for them. */
function feedbackSummary(log: WorkoutLog): string | null {
  if (!log.feedback) return null;
  const { difficulty, energy, lowerBackPain, kneePain, shoulderPain } = log.feedback;
  const pain: string[] = [];
  if (lowerBackPain > 0) pain.push(`lower back ${lowerBackPain}/10`);
  if (kneePain > 0) pain.push(`knee ${kneePain}/10`);
  if (shoulderPain > 0) pain.push(`shoulder ${shoulderPain}/10`);
  const painText = pain.length > 0 ? ` - pain: ${pain.join(", ")}` : "";
  return `Difficulty ${difficulty}/10 - ${energy} energy${painText}`;
}

export default function HistoryScreen() {
  const { logs } = useAppData();
  const sorted = [...logs].sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
  );

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>History</h1>
      </header>

      {sorted.length === 0 ? (
        <p className={styles.empty}>No completed workouts yet. Finish a session to see it here.</p>
      ) : (
        <ul className={styles.list}>
          {sorted.map((log) => (
            <li key={log.id} className={styles.item}>
              <div className={styles.itemHeader}>
                <span className={styles.itemTitle}>{log.workoutTitle}</span>
                <span className={styles.itemDate}>{formatDate(log.completedAt)}</span>
              </div>
              <span className={styles.itemSummary}>{summarize(log)}</span>
              {feedbackSummary(log) ? (
                <span className={styles.itemFeedback}>{feedbackSummary(log)}</span>
              ) : null}
              {log.lowEnergyMode ? <span className={styles.itemFeedback}>Low-energy mode</span> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
