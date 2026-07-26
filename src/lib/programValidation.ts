import type { Workout } from "../types";
import { measurementFieldsFor } from "./sessionTracking";
import { reportProgramMuscleVolume, type WeekMuscleVolumeReport } from "./muscleVolume";

export interface ProgramStructureValidation {
  workoutCount: number;
  weekCount: number;
  workoutsPerWeek: number[];
  workdayCount: number;
  offDayCount: number;
  block1Weeks: number[];
  deloadWeeks: number[];
  block2Weeks: number[];
  machineAbCrunchReferences: number;
  missingMeasurementType: string[];
  durationShowsWeight: string[];
  repsOnlyShowsWeight: string[];
  muscleVolume: WeekMuscleVolumeReport[];
  normalWeekMisses: { week: number; misses: WeekMuscleVolumeReport["misses"] }[];
  ok: boolean;
  errors: string[];
}

export function validateV2Program(workouts: Workout[]): ProgramStructureValidation {
  const errors: string[] = [];
  const weekSet = new Set(workouts.map((w) => w.week));
  const workoutsPerWeek = Array.from({ length: 8 }, (_, i) => {
    const week = i + 1;
    return workouts.filter((w) => w.week === week).length;
  });

  const workdayCount = workouts.filter((w) => w.length === "short").length;
  const offDayCount = workouts.filter((w) => w.length === "long").length;

  const block1Weeks = [
    ...new Set(
      workouts
        .filter((w) => w.trainingBlock === 1 && !w.phaseLabel.toLowerCase().includes("deload"))
        .map((w) => w.week)
    )
  ].sort((a, b) => a - b);
  const deloadWeeks = [
    ...new Set(workouts.filter((w) => w.phaseLabel.toLowerCase().includes("deload")).map((w) => w.week))
  ].sort((a, b) => a - b);
  const block2Weeks = [
    ...new Set(workouts.filter((w) => w.trainingBlock === 2).map((w) => w.week))
  ].sort((a, b) => a - b);

  let machineAbCrunchReferences = 0;
  const missingMeasurementType: string[] = [];
  const durationShowsWeight: string[] = [];
  const repsOnlyShowsWeight: string[] = [];

  for (const workout of workouts) {
    for (const movement of [...workout.strength, ...workout.core, ...workout.warmup]) {
      if (
        movement.id === "machine-ab-crunch" ||
        ("name" in movement &&
          typeof movement.name === "string" &&
          /machine ab crunch/i.test(movement.name)) ||
        movement.visualAssetKey === "machine-ab-crunch"
      ) {
        machineAbCrunchReferences += 1;
      }
    }

    for (const exercise of [...workout.strength, ...workout.core]) {
      if (!exercise.measurementType) {
        missingMeasurementType.push(`${workout.id}:${exercise.id}`);
        continue;
      }
      const fields = measurementFieldsFor(exercise.measurementType);
      if (exercise.measurementType === "duration" && fields.showWeight) {
        durationShowsWeight.push(`${workout.id}:${exercise.id}`);
      }
      if (exercise.measurementType === "reps-only" && fields.showWeight) {
        repsOnlyShowsWeight.push(`${workout.id}:${exercise.id}`);
      }
    }

    if (workout.cardio && workout.cardio.measurementType !== "cardio-duration") {
      errors.push(`${workout.id} cardio missing cardio-duration measurement`);
    }
  }

  if (workouts.length !== 32) errors.push(`Expected 32 workouts, got ${workouts.length}`);
  if (weekSet.size !== 8) errors.push(`Expected 8 weeks, got ${weekSet.size}`);
  if (workoutsPerWeek.some((n) => n !== 4)) {
    errors.push(`Expected 4 workouts/week, got ${workoutsPerWeek.join(",")}`);
  }
  if (workdayCount !== 16) errors.push(`Expected 16 Workday sessions, got ${workdayCount}`);
  if (offDayCount !== 16) errors.push(`Expected 16 Off Day sessions, got ${offDayCount}`);
  if (JSON.stringify(block1Weeks) !== JSON.stringify([1, 2, 3, 4])) {
    errors.push(`Expected Block 1 weeks 1-4, got ${block1Weeks.join(",")}`);
  }
  if (JSON.stringify(deloadWeeks) !== JSON.stringify([5])) {
    errors.push(`Expected deload week 5 only, got ${deloadWeeks.join(",")}`);
  }
  if (JSON.stringify(block2Weeks) !== JSON.stringify([6, 7, 8])) {
    errors.push(`Expected Block 2 weeks 6-8, got ${block2Weeks.join(",")}`);
  }
  if (machineAbCrunchReferences > 0) {
    errors.push(`Machine Ab Crunch still referenced ${machineAbCrunchReferences} time(s)`);
  }
  if (missingMeasurementType.length > 0) {
    errors.push(`Missing measurementType on ${missingMeasurementType.length} exercise(s)`);
  }
  if (durationShowsWeight.length > 0) {
    errors.push(`Duration exercises requiring weight: ${durationShowsWeight.join(", ")}`);
  }
  if (repsOnlyShowsWeight.length > 0) {
    errors.push(`Reps-only exercises requiring weight: ${repsOnlyShowsWeight.join(", ")}`);
  }

  for (let week = 1; week <= 8; week++) {
    const weekWorkouts = workouts.filter((w) => w.week === week).sort((a, b) => a.order - b.order);
    const expected: Array<Workout["variant"]> = ["upper-a", "lower-a", "upper-b", "lower-b"];
    for (let i = 0; i < 4; i++) {
      if (weekWorkouts[i]?.variant !== expected[i]) {
        errors.push(
          `Week ${week} slot ${i + 1}: expected ${expected[i]}, got ${weekWorkouts[i]?.variant ?? "missing"}`
        );
      }
    }
  }

  const muscleVolume = reportProgramMuscleVolume(workouts);
  const normalWeekMisses = muscleVolume
    .filter((r) => !r.isDeload)
    .map((r) => ({ week: r.week, misses: r.misses }))
    .filter((r) => r.misses.length > 0);

  return {
    workoutCount: workouts.length,
    weekCount: weekSet.size,
    workoutsPerWeek,
    workdayCount,
    offDayCount,
    block1Weeks,
    deloadWeeks,
    block2Weeks,
    machineAbCrunchReferences,
    missingMeasurementType,
    durationShowsWeight,
    repsOnlyShowsWeight,
    muscleVolume,
    normalWeekMisses,
    ok: errors.length === 0,
    errors
  };
}
