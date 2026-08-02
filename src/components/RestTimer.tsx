import { useEffect, useRef, useState } from "react";
import styles from "./RestTimer.module.css";

interface RestTimerProps {
  /** Epoch ms when the rest period ends. */
  endsAt: number;
  /** Prescribed rest for this exercise, used for the progress fill. */
  totalSeconds: number;
  exerciseName: string;
  onExtend: (extraSeconds: number) => void;
  onDismiss: () => void;
}

function formatRemaining(seconds: number): string {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

/**
 * Counts down the rest period already prescribed on every exercise
 * (`Exercise.restSeconds`), which the UI previously only printed as text.
 *
 * Deliberately ephemeral: nothing here is written to the active draft, so a
 * running timer can never bump `updatedAt` or race the cloud sync.
 */
export default function RestTimer({
  endsAt,
  totalSeconds,
  exerciseName,
  onExtend,
  onDismiss
}: RestTimerProps) {
  const [now, setNow] = useState(() => Date.now());
  const alertedRef = useRef(false);

  useEffect(() => {
    // Recomputing from the end timestamp keeps the countdown honest if the
    // phone sleeps or the PWA is backgrounded mid-set.
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    alertedRef.current = false;
  }, [endsAt]);

  const remaining = Math.ceil((endsAt - now) / 1000);
  const isDone = remaining <= 0;

  useEffect(() => {
    if (!isDone || alertedRef.current) return;
    alertedRef.current = true;
    try {
      navigator.vibrate?.([180, 90, 180]);
    } catch {
      // Vibration is a nice-to-have; never let it break the session.
    }
  }, [isDone]);

  const elapsedRatio = totalSeconds > 0 ? 1 - Math.max(0, remaining) / totalSeconds : 1;

  return (
    <div className={isDone ? `${styles.bar} ${styles.barDone}` : styles.bar} role="status">
      <div
        className={styles.fill}
        style={{ width: `${Math.min(100, Math.max(0, elapsedRatio * 100))}%` }}
        aria-hidden="true"
      />
      <div className={styles.content}>
        <div className={styles.readout}>
          <span className={styles.time}>{isDone ? "Go" : formatRemaining(remaining)}</span>
          <span className={styles.label}>
            {isDone ? `Rest done · ${exerciseName}` : `Resting · ${exerciseName}`}
          </span>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.action} onClick={() => onExtend(30)}>
            +30s
          </button>
          <button type="button" className={styles.actionPrimary} onClick={onDismiss}>
            {isDone ? "Done" : "Skip"}
          </button>
        </div>
      </div>
    </div>
  );
}
