import type { WorkoutLog } from "../types";
import { getLogsForExport, HISTORY_CANONICAL_KEY } from "./historyStorage";
import { HISTORY_MIGRATION_VERSION } from "./historyMigration";

export const HISTORY_EXPORT_SCHEMA_VERSION = 1;

export interface HistoryExportDocument {
  exportSchemaVersion: number;
  exportedAt: string;
  appVersion: string;
  programVersion: string;
  historyMigrationVersion: number;
  canonicalKey: string;
  logCount: number;
  logs: WorkoutLog[];
}

/** Build an export document without mutating History. */
export function buildHistoryExportDocument(options?: {
  appVersion?: string;
  programVersion?: string;
}): HistoryExportDocument {
  const logs = getLogsForExport();
  return {
    exportSchemaVersion: HISTORY_EXPORT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: options?.appVersion ?? "0.1.0",
    programVersion: options?.programVersion ?? "v2",
    historyMigrationVersion: HISTORY_MIGRATION_VERSION,
    canonicalKey: HISTORY_CANONICAL_KEY,
    logCount: logs.length,
    logs
  };
}

export function historyExportFilename(exportedAt = new Date()): string {
  const y = exportedAt.getFullYear();
  const m = String(exportedAt.getMonth() + 1).padStart(2, "0");
  const d = String(exportedAt.getDate()).padStart(2, "0");
  return `workout-app-history-${y}-${m}-${d}.json`;
}

/**
 * Trigger a browser download of the History JSON backup.
 * Returns false if the download could not be initiated.
 */
export function downloadHistoryExport(): boolean {
  try {
    const doc = buildHistoryExportDocument();
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = historyExportFilename();
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    return true;
  } catch {
    return false;
  }
}
