import type { SlotDisplayStatus } from "../lib/progress";
import styles from "./StatusBadge.module.css";

const LABELS: Record<SlotDisplayStatus, string> = {
  completed: "Completed",
  recommendedNext: "Recommended Next",
  available: "Available",
  comingSoon: "Coming soon"
};

export default function StatusBadge({ status }: { status: SlotDisplayStatus }) {
  return <span className={`${styles.badge} ${styles[status]}`}>{LABELS[status]}</span>;
}
