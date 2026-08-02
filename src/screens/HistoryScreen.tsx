import { Link } from "react-router-dom";
import { useState } from "react";
import { downloadHistoryExport } from "../storage/historyExport";
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
  const [exportNote, setExportNote] = useState<string | null>(null);
  const sorted = [...logs].sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
  );

  const onExport = () => {
    const ok = downloadHistoryExport();
    setExportNote(ok ? "History JSON downloaded." : "Export failed. Try again.");
  };

  const totalSets = sorted.reduce(
    (sum, log) => sum + log.entries.reduce((n, entry) => n + entry.sets.length, 0),
    0
  );

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div>
            <p className={styles.kicker}>Completed sessions</p>
            <h1 className={styles.title}>History</h1>
          </div>
          <span className={styles.count}>{sorted.length}</span>
        </div>
        {sorted.length > 0 ? (
          <dl className={styles.stats}>
            <div className={styles.stat}>
              <dt>Workouts</dt>
              <dd>{sorted.length}</dd>
            </div>
            <div className={styles.stat}>
              <dt>Sets logged</dt>
              <dd>{totalSets}</dd>
            </div>
            <div className={styles.stat}>
              <dt>Latest</dt>
              <dd className={styles.statSmall}>{formatDate(sorted[0].completedAt)}</dd>
            </div>
          </dl>
        ) : null}
      </header>

      {sorted.length === 0 ? (
        <p className={styles.empty}>No completed workouts yet. Finish a session to see it here.</p>
      ) : (
        <ul className={styles.list}>
          {sorted.map((log) => (
            <li key={log.id} className={styles.item}>
              <Link to={`/history/${encodeURIComponent(log.id)}`} className={styles.itemLink}>
                <div className={styles.itemHeader}>
                  <span className={styles.itemTitle}>{log.workoutTitle}</span>
                  <span className={styles.itemDate}>{formatDate(log.completedAt)}</span>
                </div>
                <span className={styles.itemSummary}>{summarize(log)}</span>
                <div className={styles.chipRow}>
                  {feedbackSummary(log) ? (
                    <span className={styles.chip}>{feedbackSummary(log)}</span>
                  ) : null}
                  {log.lowEnergyMode ? (
                    <span className={styles.chipMuted}>Low-energy mode</span>
                  ) : null}
                </div>
                <span className={styles.chevron} aria-hidden="true">
                  ›
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className={styles.exportRow}>
        <button type="button" className={styles.exportButton} onClick={onExport}>
          Export History JSON
        </button>
        {exportNote ? <p className={styles.exportNote}>{exportNote}</p> : null}
      </div>
    </div>
  );
}
