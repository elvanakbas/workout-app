/**
 * Phase 5 Nutrition V1 validation (no large test framework).
 * Run: npm run validate:nutrition
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

import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import {
  isoToLocalDateKey,
  shiftLocalDateKey,
  toLocalDateKey,
  todayLocalDateKey
} from "../src/lib/localDate";
import {
  dayTotals,
  remainingSummary,
  totalCaloriesForDay,
  totalProteinForDay
} from "../src/lib/nutritionMath";
import {
  completedWorkoutsForLocalDate,
  workoutLogLocalDateKey
} from "../src/lib/nutritionWorkoutLink";
import {
  NUTRITION_BACKUP_KEY,
  NUTRITION_DAYS_KEY,
  NUTRITION_MIGRATION_VERSION,
  NUTRITION_MIGRATION_VERSION_KEY,
  NUTRITION_SETTINGS_KEY,
  clearNutritionMigrationMarkerForTests,
  ensureNutritionMigrated
} from "../src/storage/nutritionMigration";
import {
  addNutritionEntry,
  deleteNutritionEntry,
  getAllNutritionDays,
  getNutritionDay,
  getNutritionSettings,
  saveNutritionSettings,
  updateNutritionEntry
} from "../src/storage/nutritionStorage";
import {
  buildNutritionExportDocument
} from "../src/storage/nutritionExport";
import { NUTRITION_EXPORT_SCHEMA_VERSION } from "../src/types/nutrition";
import type { WorkoutLog } from "../src/types";

let failures = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`OK: ${message}`);
  } else {
    failures += 1;
    console.error(`FAIL: ${message}`);
  }
}

function resetStore(): void {
  memoryStore.clear();
}

// --- 1. Local date key around timezone boundaries ---
{
  // Construct a Date that is late evening in local time; ISO may be next UTC day.
  const lateLocal = new Date(2026, 6, 28, 23, 30, 0); // Jul 28 2026 23:30 local
  const key = toLocalDateKey(lateLocal);
  assert(key === "2026-07-28", "1a local dateKey uses local calendar (not UTC slice)");

  const iso = lateLocal.toISOString();
  const utcSlice = iso.slice(0, 10);
  const fromIso = isoToLocalDateKey(iso);
  assert(fromIso === "2026-07-28", "1b isoToLocalDateKey matches local day");
  // Document the risk: UTC slice can differ near midnight.
  if (utcSlice !== "2026-07-28") {
    assert(fromIso !== utcSlice, "1c local helper disagrees with UTC slice when they diverge");
  } else {
    assert(true, "1c UTC slice happened to match local (environment-dependent; helper still local)");
  }

  const shifted = shiftLocalDateKey("2026-07-28", -1);
  assert(shifted === "2026-07-27", "1d shiftLocalDateKey previous day");
  assert(typeof todayLocalDateKey() === "string" && todayLocalDateKey().length === 10, "1e todayLocalDateKey");
}

// --- 2–5. CRUD: add, edit preserves ID, delete isolated, multi-day ---
resetStore();
ensureNutritionMigrated();
{
  const today = "2026-07-28";
  const yesterday = "2026-07-27";

  const a = addNutritionEntry(today, { name: "  Eggs  ", calories: 180, proteinGrams: 12.5 });
  const b = addNutritionEntry(today, { name: "Chicken", calories: 250, proteinGrams: 40 });
  const c = addNutritionEntry(today, { name: "Oats", calories: 150, proteinGrams: 5.25 });
  assert(a.name === "Eggs", "2a food name trimmed on add");
  assert(!!a.id && a.id.length > 0, "2b entry has stable id");

  const updated = updateNutritionEntry(today, a.id, {
    name: "Scrambled eggs",
    calories: 200,
    proteinGrams: 14
  });
  assert(updated?.id === a.id, "3a edit preserves entry ID");
  assert(updated?.createdAt === a.createdAt, "3b edit preserves createdAt");
  assert(updated?.name === "Scrambled eggs", "3c edit updates name");

  addNutritionEntry(yesterday, { name: "Yogurt", calories: 120, proteinGrams: 15 });
  assert(deleteNutritionEntry(today, b.id) === true, "4a delete returns true");
  const todayDay = getNutritionDay(today);
  assert(!!todayDay && todayDay.entries.length === 2, "4b today has two entries after delete");
  assert(!todayDay!.entries.some((e) => e.id === b.id), "4c deleted entry gone from today");
  assert(getNutritionDay(yesterday)?.entries.length === 1, "5a yesterday untouched");
  assert(getAllNutritionDays().length === 2, "5b two days remain isolated");
  assert(todayDay!.entries.some((e) => e.id === c.id), "5c remaining today entry present");
}

// --- 6. Settings persist ---
{
  const saved = saveNutritionSettings({ calorieTarget: 2200, proteinTargetGrams: 160.5 });
  assert(saved.calorieTarget === 2200, "6a calorie target saved");
  assert(saved.proteinTargetGrams === 160.5, "6b protein target saved");
  assert(getNutritionSettings().calorieTarget === 2200, "6c settings persist across read");
}

// --- 7–10. Totals / remaining / over-target ---
{
  const day = getNutritionDay("2026-07-28")!;
  // entries: Scrambled eggs 200/14 + Oats 150/5.25 = 350 / 19.25
  assert(totalCaloriesForDay(day) === 350, "7 calorie total");
  assert(totalProteinForDay(day) === 19.25, "8 decimal protein total");

  const settings = getNutritionSettings();
  const rem = remainingSummary(dayTotals(day), settings);
  assert(rem.caloriesRemaining === 2200 - 350, "9a remaining calories");
  assert(rem.proteinRemaining === 160.5 - 19.25, "9b remaining protein");
  assert(rem.caloriesOverTarget === false && rem.proteinOverTarget === false, "9c not over");

  const over = remainingSummary(
    { calories: 2400, proteinGrams: 170 },
    { calorieTarget: 2200, proteinTargetGrams: 160.5 }
  );
  assert(over.caloriesOverTarget === true && over.caloriesOverBy === 200, "10a calorie over-target");
  assert(over.proteinOverTarget === true && over.proteinOverBy === 9.5, "10b protein over-target");
}

// --- 11. Malformed entry does not erase valid entries ---
{
  const days = getAllNutritionDays();
  const mixed = days.map((d) =>
    d.dateKey === "2026-07-28"
      ? {
          ...d,
          entries: [
            ...d.entries,
            { id: "bad", name: "", calories: -1, proteinGrams: "x", createdAt: "nope" }
          ]
        }
      : d
  );
  localStorage.setItem(NUTRITION_DAYS_KEY, JSON.stringify(mixed));
  // Force re-parse via public API (migration already complete; parse path still defensive)
  clearNutritionMigrationMarkerForTests();
  ensureNutritionMigrated();
  const recovered = getNutritionDay("2026-07-28");
  assert(!!recovered && recovered.entries.length === 2, "11 malformed entry dropped; valid kept");
  assert(recovered!.entries.every((e) => e.name.length > 0), "11b remaining entries valid");
}

// --- 12. Malformed day does not erase other days ---
{
  const good = getAllNutritionDays();
  localStorage.setItem(
    NUTRITION_DAYS_KEY,
    JSON.stringify([
      ...good,
      { dateKey: "not-a-date", entries: [{ id: "x", name: "X", calories: 1, proteinGrams: 1, createdAt: "t" }] },
      null,
      "garbage"
    ])
  );
  clearNutritionMigrationMarkerForTests();
  ensureNutritionMigrated();
  const after = getAllNutritionDays();
  assert(after.some((d) => d.dateKey === "2026-07-28"), "12a valid today kept");
  assert(after.some((d) => d.dateKey === "2026-07-27"), "12b valid yesterday kept");
  assert(!after.some((d) => d.dateKey === "not-a-date"), "12c malformed day excluded");
}

// --- 13–14. Migration idempotent; backup once ---
{
  const backup1 = localStorage.getItem(NUTRITION_BACKUP_KEY);
  assert(!!backup1, "14a backup exists after first migration");
  const marker = localStorage.getItem(NUTRITION_MIGRATION_VERSION_KEY);
  assert(marker === String(NUTRITION_MIGRATION_VERSION), "13a migration marked complete");

  const beforeDays = localStorage.getItem(NUTRITION_DAYS_KEY);
  const r2 = ensureNutritionMigrated();
  assert(r2.alreadyComplete === true && r2.ran === false, "13b second migration is no-op");
  assert(localStorage.getItem(NUTRITION_DAYS_KEY) === beforeDays, "13c days unchanged on rerun");
  assert(localStorage.getItem(NUTRITION_BACKUP_KEY) === backup1, "14b backup not rewritten");
}

// --- 15. App version change does not clear nutrition ---
{
  localStorage.setItem("workout-app:app-version", "9.9.9");
  localStorage.setItem("workout-app:schema-version", "future");
  assert(getNutritionDay("2026-07-28")!.entries.length === 2, "15a nutrition intact after version keys");
  assert(getNutritionSettings().calorieTarget === 2200, "15b settings intact");
}

// --- 16–18. Workout date matching ---
{
  // Prefer startedAt spanning midnight UTC while staying same local day.
  const started = new Date(2026, 6, 28, 22, 0, 0); // Jul 28 local
  const completed = new Date(2026, 6, 29, 0, 30, 0); // Jul 29 local
  const logPreferStart: WorkoutLog = {
    id: "w-start",
    workoutId: "w1",
    order: 1,
    workoutTitle: "Upper A",
    completedAt: completed.toISOString(),
    startedAt: started.toISOString(),
    entries: []
  };
  assert(workoutLogLocalDateKey(logPreferStart) === "2026-07-28", "16 prefer startedAt for dateKey");

  const logFallback: WorkoutLog = {
    id: "w-end",
    workoutId: "w2",
    order: 2,
    workoutTitle: "Lower A",
    completedAt: new Date(2026, 6, 28, 18, 0, 0).toISOString(),
    entries: []
  };
  assert(workoutLogLocalDateKey(logFallback) === "2026-07-28", "17 fallback completedAt");

  const second: WorkoutLog = {
    id: "w-2",
    workoutId: "w3",
    order: 3,
    workoutTitle: "Upper B",
    completedAt: new Date(2026, 6, 28, 20, 0, 0).toISOString(),
    startedAt: new Date(2026, 6, 28, 19, 0, 0).toISOString(),
    entries: []
  };
  const matched = completedWorkoutsForLocalDate(
    [logPreferStart, logFallback, second],
    "2026-07-28"
  );
  assert(matched.length === 3, "18 two+ workouts on same date both return");
  assert(
    matched.map((m) => m.workoutTitle).includes("Upper A") &&
      matched.map((m) => m.workoutTitle).includes("Lower A"),
    "18b titles present"
  );
}

// --- 19. History Detail nutrition lookup (dateKey match) ---
{
  const log: WorkoutLog = {
    id: "hist-1",
    workoutId: "w1",
    order: 1,
    workoutTitle: "Upper A",
    completedAt: new Date(2026, 6, 28, 12, 0, 0).toISOString(),
    startedAt: new Date(2026, 6, 28, 11, 0, 0).toISOString(),
    entries: []
  };
  const key = workoutLogLocalDateKey(log)!;
  const day = getNutritionDay(key);
  assert(!!day && day.entries.length > 0, "19 History Detail can look up NutritionDay by workout date");
}

// --- 20. JSON export metadata and record count ---
{
  const before = localStorage.getItem(NUTRITION_DAYS_KEY);
  const doc = buildNutritionExportDocument();
  assert(doc.schemaVersion === NUTRITION_EXPORT_SCHEMA_VERSION, "20a schemaVersion");
  assert(typeof doc.exportedAt === "string" && doc.exportedAt.length > 0, "20b exportedAt");
  assert(doc.settings.calorieTarget === 2200, "20c settings included");
  assert(doc.days.length === getAllNutritionDays().length, "20d day count matches valid days");
  assert(localStorage.getItem(NUTRITION_DAYS_KEY) === before, "20e export does not mutate storage");
}

// --- 21. No service-worker / localStorage reset interaction ---
{
  const viteConfig = readFileSync(resolve("vite.config.ts"), "utf8");
  assert(
    viteConfig.includes("globPatterns") && !viteConfig.includes("localStorage"),
    "21a vite PWA config has no localStorage"
  );

  const srcRoot = resolve("src");
  const nutritionFiles = [
    "src/storage/nutritionStorage.ts",
    "src/storage/nutritionMigration.ts",
    "src/storage/nutritionExport.ts",
    "src/screens/NutritionScreen.tsx"
  ];
  for (const file of nutritionFiles) {
    const text = readFileSync(resolve(file), "utf8");
    assert(!text.includes("localStorage.clear()"), `21b ${file} never clears localStorage`);
  }

  // Scan for accidental SW-side history/nutrition wipes in app shell sources.
  function walkTs(dir: string): string[] {
    const out: string[] = [];
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      const full = resolve(dir, name.name);
      if (name.isDirectory()) out.push(...walkTs(full));
      else if (/\.(ts|tsx)$/.test(name.name)) out.push(full);
    }
    return out;
  }
  let swTouchesNutrition = false;
  for (const file of walkTs(srcRoot)) {
    const rel = file.replace(/\\/g, "/");
    if (rel.includes("/storage/")) continue;
    const text = readFileSync(file, "utf8");
    if (/localStorage\.clear\s*\(/.test(text)) {
      swTouchesNutrition = true;
    }
  }
  assert(!swTouchesNutrition, "21c no localStorage.clear in non-storage app sources");
  assert(
    !viteConfig.includes("workout-app:nutrition"),
    "21d service-worker / PWA config does not namespace nutrition keys"
  );
}

if (failures > 0) {
  console.error(`\nvalidate:nutrition failed with ${failures} assertion(s)`);
  process.exit(1);
}
console.log("\nvalidate:nutrition passed");
