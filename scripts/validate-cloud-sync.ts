/**
 * Phase 6 cloud sync validation (no live Supabase required).
 * Run: npm run validate:cloud-sync
 */

const memoryStore = new Map<string, string>();
(globalThis as { localStorage?: Storage }).localStorage = {
  getItem: (key: string) => memoryStore.get(key) ?? null,
  setItem: (key: string, value: string) => {
    memoryStore.set(key, String(value));
  },
  removeItem: (key: string) => {
    memoryStore.delete(key);
  },
  clear: () => memoryStore.clear(),
  key: (index: number) => Array.from(memoryStore.keys())[index] ?? null,
  get length() {
    return memoryStore.size;
  }
} as Storage;

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  isCloudConfigured,
  resetSupabaseClientForTests
} from "../src/cloud/supabaseClient";
import {
  classifyOwnership,
  markOwnershipResolved,
  onSignOutPreserveOwnership,
  readCloudSyncState,
  readLastCloudUserId,
  writeCloudSyncState
} from "../src/cloud/ownership";
import {
  mergeDrafts,
  mergeNutritionDays,
  mergeProgress,
  mergeSettings,
  mergeWorkoutLogs
} from "../src/cloud/mergeRules";
import {
  __resetSyncLockForTests,
  getSyncUiStatus,
  runCloudSync,
  summarizeLocalData
} from "../src/cloud/syncEngine";
import { DEFAULT_CLOUD_SYNC_STATE } from "../src/cloud/cloudTypes";
import { appendLog, getLogs } from "../src/storage/historyStorage";
import { HISTORY_CANONICAL_KEY } from "../src/storage/historyMigration";
import {
  addNutritionEntry,
  deleteNutritionEntry,
  getAllNutritionDays,
  getNutritionDay,
  getNutritionSettings,
  saveNutritionSettings
} from "../src/storage/nutritionStorage";
import {
  createEmptyDraft,
  listActiveSessionDrafts,
  saveActiveSessionDraft
} from "../src/storage/activeSessionDraft";
import type { WorkoutLog } from "../src/types";

let failures = 0;

function assert(condition: boolean, message: string): void {
  if (condition) console.log(`OK: ${message}`);
  else {
    failures += 1;
    console.error(`FAIL: ${message}`);
  }
}

function resetAll(): void {
  memoryStore.clear();
  resetSupabaseClientForTests();
  __resetSyncLockForTests();
}

function sampleLog(id: string, title: string, completedAt: string, rich = false): WorkoutLog {
  return {
    id,
    workoutId: "w1",
    order: 1,
    workoutTitle: title,
    completedAt,
    startedAt: completedAt,
    schemaVersion: rich ? 2 : 1,
    entries: rich
      ? [
          {
            exerciseId: "e1",
            name: "Press",
            sets: [{ reps: 10, weight: 50 }],
            measurementType: "reps-weight"
          }
        ]
      : [{ exerciseId: "e1", sets: [{ reps: 8, weight: 40 }] }]
  };
}

async function main(): Promise<void> {
  resetAll();
  assert(isCloudConfigured() === false, "1 missing env → not configured");
  assert(getSyncUiStatus(false) === "not-configured", "1b UI status not-configured");

  appendLog(sampleLog("local-1", "Upper A", "2026-07-28T12:00:00.000Z"));
  addNutritionEntry("2026-07-28", { name: "Eggs", calories: 180, proteinGrams: 12 });
  assert(getLogs().length === 1, "2a local History works");
  assert(getAllNutritionDays().length === 1, "2b local Nutrition works");
  assert(summarizeLocalData().historyCount === 1, "2c summary");

  const beforeSignIn = localStorage.getItem(HISTORY_CANONICAL_KEY);
  writeCloudSyncState({ ...DEFAULT_CLOUD_SYNC_STATE, lastUserId: "user-a" });
  assert(localStorage.getItem(HISTORY_CANONICAL_KEY) === beforeSignIn, "3 sign-in metadata does not clear History");
  onSignOutPreserveOwnership();
  assert(getLogs().length === 1, "4 sign-out does not clear local data");
  assert(readLastCloudUserId() === "user-a", "4b sign-out preserves last user id");

  writeCloudSyncState({ ...DEFAULT_CLOUD_SYNC_STATE });
  assert(
    classifyOwnership("user-a", summarizeLocalData()) === "unowned-local",
    "5 unowned local requires confirmation"
  );

  markOwnershipResolved("user-a");
  assert(classifyOwnership("user-a", summarizeLocalData()) === "same-user", "6 same-user resolved");
  assert(classifyOwnership("user-b", summarizeLocalData()) === "different-user", "7 different-user");

  const localOnly = sampleLog("L-only", "Local Only", "2026-07-27T10:00:00.000Z");
  const cloudOnly = sampleLog("C-only", "Cloud Only", "2026-07-27T11:00:00.000Z");
  const poor = sampleLog("same-id", "Same", "2026-07-26T12:00:00.000Z", false);
  const rich = sampleLog("same-id", "Same", "2026-07-26T12:00:00.000Z", true);
  const morning = sampleLog("m1", "Morning", "2026-07-26T08:00:00.000Z");
  const evening = sampleLog("m2", "Evening", "2026-07-26T18:00:00.000Z");
  const mergedLogs = mergeWorkoutLogs([localOnly, poor, morning], [cloudOnly, rich, evening]);
  assert(mergedLogs.some((l) => l.id === "L-only"), "8 local-only preserved");
  assert(mergedLogs.some((l) => l.id === "C-only"), "9 cloud-only preserved");
  const same = mergedLogs.find((l) => l.id === "same-id")!;
  assert(same.entries.some((e) => e.name === "Press"), "10 richer same-ID wins");
  assert(
    mergedLogs.filter((l) => l.id === "m1" || l.id === "m2").length === 2,
    "11 two same-day workouts remain distinct"
  );

  const dayLocal = {
    dateKey: "2026-07-28",
    updatedAt: "2026-07-28T10:00:00.000Z",
    entries: [
      { id: "e1", name: "Eggs", calories: 180, proteinGrams: 12, createdAt: "t1" },
      { id: "e2", name: "Oats", calories: 150, proteinGrams: 5, createdAt: "t2" }
    ],
    deletedEntryIds: [] as string[]
  };
  const dayCloud = {
    dateKey: "2026-07-28",
    updatedAt: "2026-07-28T12:00:00.000Z",
    entries: [
      {
        id: "e1",
        name: "Eggs",
        calories: 200,
        proteinGrams: 14,
        createdAt: "t1",
        updatedAt: "2026-07-28T11:00:00.000Z"
      },
      { id: "e3", name: "Yogurt", calories: 120, proteinGrams: 15, createdAt: "t3" }
    ],
    deletedEntryIds: ["e2"]
  };
  const md = mergeNutritionDays([dayLocal], [dayCloud])[0];
  assert(md.entries.some((e) => e.id === "e1" && e.calories === 200), "12/13 entry merge by ID");
  assert(md.entries.some((e) => e.id === "e3"), "12 cloud-only entry kept");
  assert(!md.entries.some((e) => e.id === "e2"), "14 deleted entry not resurrected");

  resetAll();
  addNutritionEntry("2026-07-28", { name: "Temp", calories: 10, proteinGrams: 1 });
  const entryId = getNutritionDay("2026-07-28")!.entries[0].id;
  deleteNutritionEntry("2026-07-28", entryId);
  assert(
    (getNutritionDay("2026-07-28")?.deletedEntryIds ?? []).includes(entryId) ||
      !getNutritionDay("2026-07-28"),
    "14b local delete records tombstone or removes empty day"
  );

  const sLocal = {
    nutrition: { calorieTarget: 2100, proteinTargetGrams: 140 },
    updatedAt: "2026-07-28T10:00:00.000Z"
  };
  const sCloud = {
    nutrition: { calorieTarget: 2200, proteinTargetGrams: 160 },
    updatedAt: "2026-07-28T11:00:00.000Z"
  };
  assert(mergeSettings(sLocal, sCloud).needsChoice === true, "15 settings conflict needs choice");
  assert(
    mergeSettings(sLocal, sCloud, "use-cloud").settings?.nutrition.calorieTarget === 2200,
    "15b use-cloud honored"
  );

  const prog = mergeProgress(
    { completedOrders: [1, 2], updatedAt: "a" },
    { completedOrders: [2, 3], updatedAt: "b" }
  );
  assert(prog.completedOrders.join(",") === "1,2,3", "16 progress union");

  const drafts = mergeDrafts(
    [
      {
        version: 1,
        workoutId: "w1",
        updatedAt: "2026-07-28T12:00:00.000Z",
        lowEnergyMode: false,
        cardioCompleted: false,
        entries: [],
        feedback: {
          difficulty: 5,
          energy: "normal",
          lowerBackPain: 0,
          kneePain: 0,
          shoulderPain: 0
        }
      }
    ],
    [
      {
        version: 1,
        workoutId: "w1",
        updatedAt: "2026-07-28T11:00:00.000Z",
        lowEnergyMode: true,
        cardioCompleted: false,
        entries: [],
        feedback: {
          difficulty: 5,
          energy: "normal",
          lowerBackPain: 0,
          kneePain: 0,
          shoulderPain: 0
        }
      }
    ]
  );
  assert(drafts[0].lowEnergyMode === false, "17 newer local draft wins");

  resetAll();
  appendLog(sampleLog("keep", "Keep", "2026-07-28T12:00:00.000Z"));
  const beforeFail = localStorage.getItem(HISTORY_CANONICAL_KEY);
  const failResult = await runCloudSync({ userId: "user-a", skipOwnershipGate: true });
  assert(
    failResult.ok === false || failResult.status === "not-configured",
    "18 sync without config fails safely"
  );
  assert(localStorage.getItem(HISTORY_CANONICAL_KEY) === beforeFail, "18b local preserved");
  assert(getLogs().length === 1, "19/20 empty cloud path does not wipe local");

  const once = mergeWorkoutLogs([localOnly, cloudOnly], [localOnly, cloudOnly]);
  const twice = mergeWorkoutLogs(once, once);
  assert(twice.length === once.length, "21 repeated merge no duplicates");

  __resetSyncLockForTests();
  const p1 = runCloudSync({ userId: "u", skipOwnershipGate: true });
  const p2 = runCloudSync({ userId: "u", skipOwnershipGate: true });
  await p1;
  await p2;

  assert(
    getSyncUiStatus(true) === "not-configured" || getSyncUiStatus(true) === "offline",
    "23/24 offline or not-configured without env"
  );

  const engineSrc = readFileSync(resolve("src/cloud/syncEngine.ts"), "utf8");
  assert(engineSrc.includes('.eq("user_id", userId)'), "25 sync queries filter user_id");
  assert(
    engineSrc.includes("syncInFlight") &&
      (engineSrc.includes("if (syncInFlight) return syncInFlight") ||
        engineSrc.includes("(syncInFlight ?? Promise.resolve()).then(run, run)")),
    "22 parallel sync lock present in syncEngine"
  );

  const sql = readFileSync(resolve("supabase/migrations/001_initial_cloud_sync.sql"), "utf8");
  for (const table of [
    "workout_logs",
    "nutrition_days",
    "user_settings",
    "workout_progress",
    "active_drafts"
  ]) {
    assert(
      sql.includes(`alter table public.${table} enable row level security`),
      `26 RLS enable ${table}`
    );
    assert(sql.includes(`${table}_select_own`), `26 select policy ${table}`);
  }

  const pkg = readFileSync(resolve("package.json"), "utf8");
  const deploy = readFileSync(resolve(".github/workflows/deploy.yml"), "utf8");
  const clientSrc = readFileSync(resolve("src/cloud/supabaseClient.ts"), "utf8");
  assert(!pkg.toLowerCase().includes("service_role"), "27a no service role in package.json");
  assert(!deploy.includes("SERVICE_ROLE"), "27b no service role in deploy");
  assert(clientSrc.includes("VITE_SUPABASE_PUBLISHABLE_KEY"), "29 publishable key only");
  assert(!clientSrc.toLowerCase().includes("service_role"), "27c client has no service role");

  const envExample = readFileSync(resolve(".env.example"), "utf8");
  assert(envExample.includes("YOUR_PUBLISHABLE_KEY"), "28 env example is placeholder");
  assert(!envExample.includes("eyJ"), "28b no real JWT in example");

  saveNutritionSettings({ calorieTarget: 2000, proteinTargetGrams: 150 });
  assert(getNutritionSettings().calorieTarget === 2000, "30 settings persist");
  assert(readCloudSyncState().version === 1, "sync state version 1");

  saveActiveSessionDraft(
    createEmptyDraft("w9", [{ exerciseId: "e", sets: [{ reps: 1, weight: 0 }] }])
  );
  assert(listActiveSessionDrafts().some((d) => d.workoutId === "w9"), "draft list helper");

  if (failures > 0) {
    console.error(`\nvalidate:cloud-sync failed with ${failures} assertion(s)`);
    process.exit(1);
  }
  console.log("\nvalidate:cloud-sync passed");
}

void main();
