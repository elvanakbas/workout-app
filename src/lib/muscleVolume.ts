import type { MuscleGroup, Workout } from "../types";

/**
 * V3 mandatory direct-set weekly targets (normal weeks).
 * Optional add-on volume is excluded and reported separately.
 */
export const WEEKLY_MUSCLE_TARGETS: Record<
  MuscleGroup,
  { min: number; max: number; label: string }
> = {
  chest: { min: 7, max: 8, label: "Chest" },
  back: { min: 11, max: 12, label: "Back" },
  shoulders: { min: 8, max: 10, label: "Shoulders" },
  biceps: { min: 5, max: 6, label: "Biceps" },
  triceps: { min: 5, max: 6, label: "Triceps" },
  quadriceps: { min: 10, max: 10, label: "Quadriceps" },
  hamstrings: { min: 8, max: 8, label: "Hamstrings" },
  glutes: { min: 8, max: 10, label: "Glutes" },
  calves: { min: 6, max: 6, label: "Calves" },
  core: { min: 4, max: 6, label: "Core" }
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
  optionalSets: WeeklyMuscleSets;
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

function addExerciseSets(
  totals: WeeklyMuscleSets,
  exercises: { targetSets: number; primaryMuscles: MuscleGroup[]; optional?: boolean }[],
  options: { optionalOnly?: boolean; mandatoryOnly?: boolean }
): void {
  for (const exercise of exercises) {
    const isOptional = exercise.optional === true;
    if (options.mandatoryOnly && isOptional) continue;
    if (options.optionalOnly && !isOptional) continue;
    for (const muscle of exercise.primaryMuscles) {
      totals[muscle] += exercise.targetSets;
    }
  }
}

/**
 * Counts direct weekly working sets from mandatory strength + core only.
 * Optional core / optional-flagged movements and cardio are excluded.
 */
export function countDirectWeeklySets(weekWorkouts: Workout[]): WeeklyMuscleSets {
  const totals = emptySets();
  for (const workout of weekWorkouts) {
    addExerciseSets(totals, [...workout.strength, ...workout.core], { mandatoryOnly: true });
  }
  return totals;
}

/** Optional Core (+ any optional-flagged) direct sets for reporting only. */
export function countOptionalWeeklySets(weekWorkouts: Workout[]): WeeklyMuscleSets {
  const totals = emptySets();
  for (const workout of weekWorkouts) {
    const optional = [
      ...(workout.optionalCore ?? []),
      ...workout.strength.filter((e) => e.optional),
      ...workout.core.filter((e) => e.optional)
    ];
    addExerciseSets(totals, optional, { optionalOnly: true });
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
    const optionalSets = countOptionalWeeklySets(weekWorkouts);
    reports.push({
      week,
      isDeload,
      trainingBlock: sample?.trainingBlock ?? 1,
      sets,
      optionalSets,
      misses: findMuscleVolumeMisses(sets, { skipTargets: isDeload })
    });
  }
  return reports;
}
