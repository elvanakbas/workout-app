/**
 * Local calendar date helpers.
 *
 * Always use device-local YYYY-MM-DD. Never slice ISO strings with
 * `iso.slice(0, 10)` — that is UTC and can shift the calendar day near midnight.
 */

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Format a Date as local YYYY-MM-DD. */
export function toLocalDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Today's local date key. */
export function todayLocalDateKey(): string {
  return toLocalDateKey(new Date());
}

/**
 * Convert an ISO timestamp to the device's local YYYY-MM-DD.
 * Returns null when the timestamp is missing or unparseable.
 */
export function isoToLocalDateKey(iso: string | undefined | null): string | null {
  if (typeof iso !== "string" || !iso.trim()) return null;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  return toLocalDateKey(new Date(ms));
}

/** True when value looks like YYYY-MM-DD (does not prove calendar validity). */
export function isDateKeyFormat(value: string): boolean {
  return DATE_KEY_RE.test(value);
}

/**
 * Parse a dateKey into a local Date at local midnight.
 * Returns null if the key is malformed or not a real calendar day.
 */
export function parseLocalDateKey(dateKey: string): Date | null {
  if (!isDateKeyFormat(dateKey)) return null;
  const [ys, ms, ds] = dateKey.split("-");
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  const date = new Date(y, m - 1, d);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  ) {
    return null;
  }
  return date;
}

/** Shift a dateKey by `deltaDays` in local calendar time. */
export function shiftLocalDateKey(dateKey: string, deltaDays: number): string | null {
  const date = parseLocalDateKey(dateKey);
  if (!date) return null;
  date.setDate(date.getDate() + deltaDays);
  return toLocalDateKey(date);
}

/** Human-readable local date label, e.g. "Tue, Jul 28, 2026". */
export function formatLocalDateKeyLabel(dateKey: string): string {
  const date = parseLocalDateKey(dateKey);
  if (!date) return dateKey;
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}
