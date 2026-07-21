import type { ProgramSlot, WorkoutLog } from "../types";

/**
 * Flexible scheduling: nothing is ever locked. Every authored workout can be
 * opened and started at any time, in any order, so a short Workday session
 * can be done before an earlier long Off Day session without being blocked.
 */
export type SlotDisplayStatus = "recommendedNext" | "available" | "completed" | "comingSoon";

/** The set of workout `order`s that have at least one completed log. */
export function getCompletedOrders(logs: WorkoutLog[]): Set<number> {
  return new Set(logs.map((log) => log.order));
}

/**
 * The lowest-numbered workout that hasn't been completed yet, regardless of
 * what has been completed after it. Returns `undefined` once every workout
 * in the program has been completed at least once.
 */
export function getRecommendedNextOrder(
  completedOrders: Set<number>,
  programLength: number
): number | undefined {
  for (let order = 1; order <= programLength; order += 1) {
    if (!completedOrders.has(order)) return order;
  }
  return undefined;
}

export function getSlotDisplayStatus(
  slot: ProgramSlot,
  completedOrders: Set<number>,
  recommendedNextOrder: number | undefined
): SlotDisplayStatus {
  if (slot.status === "placeholder") return "comingSoon";
  if (completedOrders.has(slot.order)) return "completed";
  if (slot.order === recommendedNextOrder) return "recommendedNext";
  return "available";
}
