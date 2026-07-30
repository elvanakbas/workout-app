import {
  formatLocalDateKeyLabel,
  parseLocalDateKey,
  shiftLocalDateKey,
  todayLocalDateKey
} from "./localDate";
import type {
  PreferredWeekday,
  Workout,
  WorkoutIdentity,
  WorkoutVariant
} from "../types";
import {
  IDENTITY_DISPLAY_LABEL,
  PREFERRED_WEEKDAY_LABEL
} from "../types";

/** Fixed V3 preferred weekdays (UI is not editable yet). */
export const DEFAULT_PREFERRED_WEEKDAYS: Record<WorkoutVariant, PreferredWeekday> = {
  "upper-a": "tuesday",
  "lower-a": "wednesday",
  "upper-b": "friday",
  "lower-b": "sunday"
};

/** Offsets from Week 1 Upper A (program start / Workout 1) within each week. */
export const WEEK_SLOT_OFFSETS = [0, 1, 3, 5] as const;

export function preferredWeekdayForVariant(variant: WorkoutVariant): PreferredWeekday {
  return DEFAULT_PREFERRED_WEEKDAYS[variant];
}

/** Days after start date for a 1-based workout order. */
export function plannedDayOffsetForOrder(order: number): number {
  const index = Math.max(0, order - 1);
  const weekIndex = Math.floor(index / 4);
  const slot = index % 4;
  return weekIndex * 7 + WEEK_SLOT_OFFSETS[slot];
}

export function plannedDateKeyForOrder(startDateKey: string, order: number): string | null {
  return shiftLocalDateKey(startDateKey, plannedDayOffsetForOrder(order));
}

const JS_DAY_TO_WEEKDAY: PreferredWeekday[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday"
];

export function weekdayFromDateKey(dateKey: string): PreferredWeekday | null {
  const date = parseLocalDateKey(dateKey);
  if (!date) return null;
  return JS_DAY_TO_WEEKDAY[date.getDay()] ?? null;
}

/** Preferred training identity for a calendar weekday, or null on recovery days. */
export function preferredIdentityForWeekday(
  weekday: PreferredWeekday
): WorkoutIdentity | null {
  switch (weekday) {
    case "tuesday":
      return "push";
    case "wednesday":
      return "quad";
    case "friday":
      return "pull";
    case "sunday":
      return "posterior";
    default:
      return null;
  }
}

export type TodayPlanContext =
  | {
      kind: "preferred";
      preferredWeekday: PreferredWeekday;
      identity: WorkoutIdentity;
      workout: Workout | null;
      eyebrow: string;
      title: string;
      detail: string;
    }
  | {
      kind: "none";
      preferredWeekday: PreferredWeekday;
      identity: null;
      workout: null;
      eyebrow: string;
      title: string;
      detail: string;
    };

export type ResolveTodayPlanInput = {
  todayKey: string;
  startDateKey: string | null;
  /** Workouts used to resolve today's preferred session (usually current week). */
  weekWorkouts: Workout[];
  /** Full program — used when a start date maps today to a specific order. */
  allWorkouts: Workout[];
};

/**
 * Concept A “Today” context — independent of Recommended Next.
 * Never locks access; never uses guilt copy.
 * When a start date maps today to a planned workout, that wins even if
 * the calendar weekday is outside the preferred Tue/Wed/Fri/Sun set.
 */
export function resolveTodayPlanContext(input: ResolveTodayPlanInput): TodayPlanContext {
  const weekday = weekdayFromDateKey(input.todayKey) ?? "monday";
  const weekdayIdentity = preferredIdentityForWeekday(weekday);

  let workout: Workout | null = null;
  if (input.startDateKey) {
    workout =
      input.allWorkouts.find((w) => {
        const planned = plannedDateKeyForOrder(input.startDateKey!, w.order);
        return planned === input.todayKey;
      }) ?? null;
  }
  if (!workout && weekdayIdentity) {
    workout = input.weekWorkouts.find((w) => w.identity === weekdayIdentity) ?? null;
  }

  const identity = workout?.identity ?? weekdayIdentity;

  if (!identity || !workout) {
    return {
      kind: "none",
      preferredWeekday: weekday,
      identity: null,
      workout: null,
      eyebrow: "Today",
      title: "No preferred session",
      detail: "Ready when you are"
    };
  }

  const identityLabel = IDENTITY_DISPLAY_LABEL[identity];
  const dayLabel = PREFERRED_WEEKDAY_LABEL[workout.preferredWeekday];
  const variant = workout.variantLabel;
  return {
    kind: "preferred",
    preferredWeekday: workout.preferredWeekday,
    identity,
    workout,
    eyebrow: "Today",
    title: variant ? `${identityLabel} · ${variant}` : identityLabel,
    detail: `Preferred ${dayLabel}`
  };
}

export type ScheduleCopyContext = {
  preferredWeekday: PreferredWeekday;
  plannedDateKey?: string | null;
  actualDateKey?: string | null;
  isCompleted: boolean;
  isRecommendedNext: boolean;
  todayKey?: string;
};

/**
 * Neutral schedule microcopy. Never uses failed / streak / late / broken language.
 */
export function scheduleStatusCopy(ctx: ScheduleCopyContext): string {
  if (ctx.isCompleted) {
    if (ctx.actualDateKey) {
      const day = weekdayFromDateKey(ctx.actualDateKey);
      if (day) return `Completed on ${PREFERRED_WEEKDAY_LABEL[day]}`;
      return `Completed on ${formatLocalDateKeyLabel(ctx.actualDateKey)}`;
    }
    return "Completed";
  }

  if (ctx.isRecommendedNext) return "Next recommended";

  if (ctx.plannedDateKey) {
    const today = ctx.todayKey ?? todayLocalDateKey();
    if (ctx.plannedDateKey < today) return "Ready when you are";
    const short = formatPlannedDayMonth(ctx.plannedDateKey);
    if (short) return `Planned for ${short}`;
    return `Planned for ${PREFERRED_WEEKDAY_LABEL[ctx.preferredWeekday]}`;
  }

  return `Planned for ${PREFERRED_WEEKDAY_LABEL[ctx.preferredWeekday]}`;
}

/** e.g. "4 August" without year for compact UI. */
export function formatPlannedDayMonth(dateKey: string): string | null {
  const date = parseLocalDateKey(dateKey);
  if (!date) return null;
  return date.toLocaleDateString(undefined, { day: "numeric", month: "long" });
}
