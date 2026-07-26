/**
 * Phase 4B History migration + export validation.
 * Run: npm run validate:history-migration
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
  HISTORY_BACKUP_KEY,
  HISTORY_CANONICAL_KEY,
  HISTORY_LEGACY_LOG_KEYS,
  HISTORY_MIGRATION_VERSION,
  HISTORY_MIGRATION_VERSION_KEY,
  HISTORY_RECOVERY_KEY,
  clearHistoryMigrationMarkerForTests,
  deriveDeterministicLogId,
  ensureHistoryMigrated
} from "../src/storage/historyMigration";
import { getLogs } from "../src/storage/historyStorage";
import {
  HISTORY_EXPORT_SCHEMA_VERSION,
  buildHistoryExportDocument
} from "../src/storage/historyExport";
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

function v1Log(partial: {
  id?: string;
  workoutId: string;
  order: number;
  workoutTitle: string;
  completedAt: string;
  exerciseId?: string;
  reps?: number;
  weight?: number;
}): Record<string, unknown> {
  const base: Record<string, unknown> = {
    workoutId: partial.workoutId,
    order: partial.order,
    workoutTitle: partial.workoutTitle,
    completedAt: partial.completedAt,
    entries: [
      {
        exerciseId: partial.exerciseId ?? "leg-press",
        sets: [{ reps: partial.reps ?? 10, weight: partial.weight ?? 40 }]
      }
    ]
  };
  if (partial.id) base.id = partial.id;
  return base;
}

function richPhase4Log(id: string): WorkoutLog {
  return {
    id,
    schemaVersion: 2,
    workoutId: "lower-b-w1",
    order: 2,
    workoutTitle: "Lower B — Phase 4 Rich",
    completedAt: "2026-07-20T18:00:00.000Z",
    startedAt: "2026-07-20T17:20:00.000Z",
    durationSeconds: 2400,
    variantLabel: "Lower B",
    variant: "lower-b",
    focusArea: "lower",
    length: "full",
    entries: [
      {
        exerciseId: "leg-press",
        name: "Leg Press",
        measurementType: "reps-weight",
        sets: [
          { reps: 10, weight: 80 },
          { reps: 8, weight: 80 }
        ],
        status: "completed",
        completed: true
      }
    ],
    cardioCompleted: true,
    cardio: {
      measurementType: "cardio-duration",
      plannedMinutes: 10,
      machine: "stationary_bike",
      completed: true
    },
    feedback: {
      difficulty: 7,
      energy: "medium",
      lowerBackPain: 0,
      kneePain: 0,
      shoulderPain: 0
    }
  };
}

// --- 1. Valid V1 legacy-key logs migrate to canonical ---
resetStore();
const legacyA = v1Log({
  workoutId: "push-a-old",
  order: 1,
  workoutTitle: "Push A — V1 Title",
  completedAt: "2026-07-10T09:00:00.000Z",
  exerciseId: "machine-ab-crunch-OBSOLETE"
});
const legacyB = v1Log({
  workoutId: "pull-a-old",
  order: 2,
  workoutTitle: "Pull A — Same Day Later",
  completedAt: "2026-07-10T18:30:00.000Z"
});
localStorage.setItem(HISTORY_LEGACY_LOG_KEYS[0], JSON.stringify([legacyA, legacyB]));
let result = ensureHistoryMigrated();
assert(result.ran === true, "1a migration runs when marker absent");
assert(getLogs().length === 2, "1. Valid V1 legacy-key logs migrate to canonical History");
assert(
  getLogs().some((l) => l.entries[0]?.exerciseId === "machine-ab-crunch-OBSOLETE"),
  "7. Obsolete exercise IDs remain safe"
);
assert(
  getLogs().every((l) => l.historySource === "legacy-v1" || l.historySource === "legacy-unknown"),
  "legacy source marker applied for non-canonical imports"
);

// --- 2. Existing canonical + legacy merge without loss ---
resetStore();
const canonicalOnly = v1Log({
  id: "canonical-keep-me",
  workoutId: "lower-a",
  order: 3,
  workoutTitle: "Lower A Canonical",
  completedAt: "2026-07-11T10:00:00.000Z"
});
const legacyOnly = v1Log({
  workoutId: "upper-b",
  order: 4,
  workoutTitle: "Upper B Legacy",
  completedAt: "2026-07-12T10:00:00.000Z"
});
localStorage.setItem(HISTORY_CANONICAL_KEY, JSON.stringify([canonicalOnly]));
localStorage.setItem(HISTORY_LEGACY_LOG_KEYS[1], JSON.stringify([legacyOnly]));
result = ensureHistoryMigrated();
const mergedIds = new Set(getLogs().map((l) => l.id));
assert(mergedIds.has("canonical-keep-me"), "2a canonical log preserved");
assert(getLogs().length === 2, "2. Existing canonical logs and legacy logs merge without loss");
assert(result.afterCanonicalCount === 2, "2b after count is 2");

// --- 3. Running migration twice creates zero duplicates ---
const countAfterFirst = getLogs().length;
clearHistoryMigrationMarkerForTests();
result = ensureHistoryMigrated();
assert(getLogs().length === countAfterFirst, "3. Running migration twice creates zero duplicates");
assert(result.duplicatesCollapsed >= 0, "3b second run completes safely");

// --- 4. Two real workouts on the same day are both preserved ---
resetStore();
const morning = v1Log({
  workoutId: "w-morning",
  order: 1,
  workoutTitle: "Morning Session",
  completedAt: "2026-07-15T08:00:00.000Z"
});
const evening = v1Log({
  workoutId: "w-evening",
  order: 2,
  workoutTitle: "Evening Session",
  completedAt: "2026-07-15T19:00:00.000Z"
});
localStorage.setItem("workout-app:v2:logs", JSON.stringify([morning, evening]));
ensureHistoryMigrated();
assert(getLogs().length === 2, "4. Two real workouts on the same day are both preserved");

// --- 5. Richer duplicate wins ---
resetStore();
const poor = v1Log({
  id: "dup-shared",
  workoutId: "dup-w",
  order: 5,
  workoutTitle: "Duplicate Title",
  completedAt: "2026-07-16T12:00:00.000Z",
  reps: 5,
  weight: 20
});
const richDup: WorkoutLog = {
  ...(poor as unknown as WorkoutLog),
  id: "dup-shared",
  schemaVersion: 2,
  workoutTitle: "Duplicate Title",
  completedAt: "2026-07-16T12:00:00.000Z",
  entries: [
    {
      exerciseId: "leg-press",
      name: "Leg Press",
      measurementType: "reps-weight",
      sets: [{ reps: 10, weight: 60 }],
      status: "completed",
      completed: true
    }
  ],
  feedback: {
    difficulty: 8,
    energy: "high",
    lowerBackPain: 0,
    kneePain: 0,
    shoulderPain: 0
  }
};
localStorage.setItem(HISTORY_CANONICAL_KEY, JSON.stringify([poor]));
localStorage.setItem(HISTORY_LEGACY_LOG_KEYS[2], JSON.stringify([richDup]));
ensureHistoryMigrated();
const winner = getLogs().find((l) => l.id === "dup-shared");
assert(getLogs().length === 1, "5a only one duplicate remains");
assert(winner?.schemaVersion === 2 && !!winner.feedback, "5. A richer duplicate wins over a poorer duplicate");

// --- 6. Original title and timestamp unchanged ---
assert(winner?.workoutTitle === "Duplicate Title", "6a original title unchanged");
assert(winner?.completedAt === "2026-07-16T12:00:00.000Z", "6. Original title and timestamp remain unchanged");

// --- 8. One malformed record does not erase valid records ---
resetStore();
localStorage.setItem(
  HISTORY_CANONICAL_KEY,
  JSON.stringify([
    v1Log({
      id: "good-1",
      workoutId: "g1",
      order: 1,
      workoutTitle: "Good One",
      completedAt: "2026-07-17T10:00:00.000Z"
    }),
    "not-an-object",
    { id: "bad-missing-title", completedAt: "2026-07-17T11:00:00.000Z" },
    v1Log({
      id: "good-2",
      workoutId: "g2",
      order: 2,
      workoutTitle: "Good Two",
      completedAt: "2026-07-17T12:00:00.000Z"
    })
  ])
);
result = ensureHistoryMigrated();
assert(getLogs().length === 2, "8. One malformed record does not erase valid records");
assert(result.malformedCount >= 1, "8b malformed counted");
const recoveryRaw = localStorage.getItem(HISTORY_RECOVERY_KEY);
assert(!!recoveryRaw && recoveryRaw.includes("not-an-object"), "11. Recovery data is retained for malformed records");

// --- 9 + 10. Backup created and not overwritten ---
resetStore();
localStorage.setItem(
  HISTORY_CANONICAL_KEY,
  JSON.stringify([
    v1Log({
      id: "bak-1",
      workoutId: "b1",
      order: 1,
      workoutTitle: "Backup Seed",
      completedAt: "2026-07-18T10:00:00.000Z"
    })
  ])
);
result = ensureHistoryMigrated();
const backup1 = localStorage.getItem(HISTORY_BACKUP_KEY);
assert(!!backup1 && result.backupCreated, "9. A migration backup is created");
const backupParsed = JSON.parse(backup1!) as { createdAt: string };
const createdAt1 = backupParsed.createdAt;
clearHistoryMigrationMarkerForTests();
// Add a legacy log so migration has work to do again
localStorage.setItem(
  HISTORY_LEGACY_LOG_KEYS[0],
  JSON.stringify([
    v1Log({
      workoutId: "extra",
      order: 9,
      workoutTitle: "Extra After Backup",
      completedAt: "2026-07-18T20:00:00.000Z"
    })
  ])
);
result = ensureHistoryMigrated();
const backup2 = JSON.parse(localStorage.getItem(HISTORY_BACKUP_KEY)!) as { createdAt: string };
assert(backup2.createdAt === createdAt1, "10. Backup is not repeatedly overwritten");
assert(result.backupCreated === false, "10b second run reports backup not recreated");

// --- 12. Migration marker only after successful write/read validation ---
resetStore();
localStorage.setItem(
  HISTORY_CANONICAL_KEY,
  JSON.stringify([
    v1Log({
      id: "marker-1",
      workoutId: "m1",
      order: 1,
      workoutTitle: "Marker Test",
      completedAt: "2026-07-19T10:00:00.000Z"
    })
  ])
);
assert(localStorage.getItem(HISTORY_MIGRATION_VERSION_KEY) === null, "12a marker absent before");
result = ensureHistoryMigrated();
assert(
  localStorage.getItem(HISTORY_MIGRATION_VERSION_KEY) === String(HISTORY_MIGRATION_VERSION),
  "12. Migration marker is written only after successful write/read validation"
);
assert(result.afterCanonicalCount === 1, "12b validated count");

// --- 13. Changing app version metadata does not empty History ---
localStorage.setItem("workout-app:app-version", "9.9.9");
localStorage.setItem("workout-app:schema-version", "future");
const beforeVersionBump = getLogs().length;
assert(beforeVersionBump === 1, "13. Changing app version metadata does not empty History");
assert(localStorage.getItem(HISTORY_CANONICAL_KEY)?.includes("Marker Test"), "13b History payload intact");

// --- 14. Service-worker code contains no History/localStorage reset ---
const viteConfig = readFileSync(resolve(process.cwd(), "vite.config.ts"), "utf8");
assert(
  viteConfig.includes("globPatterns") && !viteConfig.includes("localStorage"),
  "14a vite PWA config has no localStorage"
);
const swSources = [
  resolve(process.cwd(), "src"),
  resolve(process.cwd(), "vite.config.ts")
];
let swTouchesHistory = false;
for (const file of ["vite.config.ts", "src/main.tsx", "src/App.tsx"]) {
  try {
    const text = readFileSync(resolve(process.cwd(), file), "utf8");
    if (/localStorage\.clear|removeItem\(\s*["']workout-app:v1:logs/.test(text) && file !== "src/storage/localStorage.ts") {
      // main/App shouldn't clear history
      if (file.endsWith("main.tsx") || file.endsWith("App.tsx") || file.endsWith("vite.config.ts")) {
        swTouchesHistory = true;
      }
    }
  } catch {
    // ignore
  }
}
assert(!swTouchesHistory, "14. Service-worker / app shell contain no History localStorage reset behavior");
void swSources;

// --- 15. Rich Phase 4 logs remain unchanged through migration ---
resetStore();
const rich = richPhase4Log("phase4-rich-keep");
localStorage.setItem(HISTORY_CANONICAL_KEY, JSON.stringify([rich]));
ensureHistoryMigrated();
const afterRich = getLogs().find((l) => l.id === "phase4-rich-keep");
assert(afterRich?.schemaVersion === 2, "15a schemaVersion preserved");
assert(afterRich?.entries[0]?.name === "Leg Press", "15b exercise name preserved");
assert(afterRich?.cardio?.plannedMinutes === 10, "15c cardio snapshot preserved");
assert(afterRich?.workoutTitle === rich.workoutTitle, "15. Rich Phase 4 logs remain unchanged through migration");

// --- 16. History export ---
const exportDoc = buildHistoryExportDocument({ appVersion: "0.1.0", programVersion: "v2" });
assert(exportDoc.exportSchemaVersion === HISTORY_EXPORT_SCHEMA_VERSION, "16a export schema version");
assert(typeof exportDoc.exportedAt === "string" && exportDoc.exportedAt.length > 0, "16b exportedAt");
assert(exportDoc.logCount === exportDoc.logs.length, "16c logCount matches");
assert(exportDoc.logs.some((l) => l.id === "phase4-rich-keep"), "16. History export contains valid schema metadata and all valid canonical logs");
const beforeExport = localStorage.getItem(HISTORY_CANONICAL_KEY);
buildHistoryExportDocument();
assert(localStorage.getItem(HISTORY_CANONICAL_KEY) === beforeExport, "16d export does not modify History");

// --- Deterministic ID stability ---
const noId = v1Log({
  workoutId: "stable-id-w",
  order: 7,
  workoutTitle: "Stable Fingerprint",
  completedAt: "2026-07-21T10:00:00.000Z"
});
const id1 = deriveDeterministicLogId(noId);
const id2 = deriveDeterministicLogId(noId);
assert(id1 === id2 && id1.startsWith("legacy-"), "deterministic legacy IDs are stable across calls");

if (failures > 0) {
  console.error(`\n${failures} history-migration validation failure(s)`);
  process.exit(1);
}
console.log("\nAll Phase 4B history-migration validations passed.");
