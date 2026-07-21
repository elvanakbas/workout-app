import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { PROGRAM_LENGTH, type WorkoutLog } from "../types";
import { appendLog, getLogs } from "../storage/localStorage";
import { getCompletedOrders, getRecommendedNextOrder } from "../lib/progress";

interface AppDataValue {
  logs: WorkoutLog[];
  /** Every workout `order` with at least one completed log. */
  completedOrders: Set<number>;
  /** Lowest-numbered incomplete workout, or undefined once all are done. */
  recommendedNextOrder: number | undefined;
  /**
   * Records a completed session. Scheduling is flexible - completing this
   * workout never implicitly completes any other workout, earlier or later.
   */
  completeWorkout: (log: WorkoutLog) => void;
}

const AppDataContext = createContext<AppDataValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<WorkoutLog[]>(() => getLogs());

  const completeWorkout = (log: WorkoutLog) => {
    appendLog(log);
    setLogs((prev) => [...prev, log]);
  };

  const value = useMemo<AppDataValue>(() => {
    const completedOrders = getCompletedOrders(logs);
    return {
      logs,
      completedOrders,
      recommendedNextOrder: getRecommendedNextOrder(completedOrders, PROGRAM_LENGTH),
      completeWorkout
    };
  }, [logs]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within an AppDataProvider");
  return ctx;
}
