import type { MuscleGroup, Workout } from "../types";

/** Approximate direct-set targets for a normal (non-deload) training week. */
export const WEEKLY_MUSCLE_TARGETS: Record<
  MuscleGroup,
  { min: number; max: number; label: string }
> = {
  chest: { min: 10, max: 12, label: "Chest" },
  back: { min: 12, max: 14, label: "Back" },
  shoulders: { min: 7, max: 10, label: "Shoulders" },
  biceps: { min: 6, max: 6, label: "Biceps" },
  triceps: { min: 6, max: 6, label: "Triceps" },
  quadriceps: { min: 10, max: 14, label: "Quadriceps" },
  hamstrings: { min: 8, max: 10, label: "Hamstrings" },
  glutes: { min: 8, max: 12, label: "Glutes" },
  calves: { min: 6, max: 6, label: "Calves" },
  core: { min: 6, max: 9, label: "Core" }
};

export type WeeklyMuscleSets = Record<MuscleGroup, number>;

export interface MuscleVolumeMiss {
  muscle: MuscleGroup;
  sets: number;
  min: number;
  max: number;
  direction: "below" | "above";
}

export interface WeekMuscleVolumeReport {
  week: number;
  isDeload: boolean;
  trainingBlock: 1 | 2;
  sets: WeeklyMuscleSets;
  misses: MuscleVolumeMiss[];
}

function emptySets(): WeeklyMuscleSets {
  return {
    chest: 0,
    back: 0,
    shoulders: 0,
    biceps: 0,
    triceps: 0,
    quadriceps: 0,
    hamstrings: 0,
    glutes: 0,
    calves: 0,
    core: 0
  };
}

/**
 * Counts direct weekly working sets from strength + core prescriptions.
 * Uses each exercise's `primaryMuscles` only — secondary/indirect work is
 * intentionally excluded (e.g. pressing does not add direct triceps sets).
 * Cardio is not counted.
 */
export function countDirectWeeklySets(weekWorkouts: Workout[]): WeeklyMuscleSets {
  const totals = emptySets();
  for (const workout of weekWorkouts) {
    for (const exercise of [...workout.strength, ...workout.core]) {
      for (const muscle of exercise.primaryMuscles) {
        totals[muscle] += exercise.targetSets;
      }
    }
  }
  return totals;
}

export function findMuscleVolumeMisses(
  sets: WeeklyMuscleSets,
  options?: { skipTargets?: boolean }
): MuscleVolumeMiss[] {
  if (options?.skipTargets) return [];
  const misses: MuscleVolumeMiss[] = [];
  for (const muscle of Object.keys(WEEKLY_MUSCLE_TARGETS) as MuscleGroup[]) {
    const target = WEEKLY_MUSCLE_TARGETS[muscle];
    const value = sets[muscle];
    if (value < target.min) {
      misses.push({ muscle, sets: value, min: target.min, max: target.max, direction: "below" });
    } else if (value > target.max) {
      misses.push({ muscle, sets: value, min: target.min, max: target.max, direction: "above" });
    }
  }
  return misses;
}

/** Build per-week muscle-volume reports for the full 32-workout program. */
export function reportProgramMuscleVolume(workouts: Workout[]): WeekMuscleVolumeReport[] {
  const byWeek = new Map<number, Workout[]>();
  for (const workout of workouts) {
    const list = byWeek.get(workout.week) ?? [];
    list.push(workout);
    byWeek.set(workout.week, list);
  }

  const reports: WeekMuscleVolumeReport[] = [];
  for (let week = 1; week <= 8; week++) {
    const weekWorkouts = byWeek.get(week) ?? [];
    const sample = weekWorkouts[0];
    const isDeload = sample?.phaseLabel.toLowerCase().includes("deload") === true;
    const sets = countDirectWeeklySets(weekWorkouts);
    reports.push({
      week,
      isDeload,
      trainingBlock: sample?.trainingBlock ?? 1,
      sets,
      // Deload weeks are expected to undershoot normal targets — report but
      // do not treat as a hard failure in program validation.
      misses: findMuscleVolumeMisses(sets, { skipTargets: isDeload })
    });
  }
  return reports;
}
