import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAppData } from "../state/AppDataContext";
import { useCloudAuth } from "../cloud/CloudAuthContext";
import {
  formatLocalDateKeyLabel,
  isDateKeyFormat,
  parseLocalDateKey,
  shiftLocalDateKey,
  todayLocalDateKey
} from "../lib/localDate";
import { dayTotals, remainingSummary } from "../lib/nutritionMath";
import { completedWorkoutsForLocalDate } from "../lib/nutritionWorkoutLink";
import {
  addNutritionEntry,
  deleteNutritionEntry,
  getNutritionDay,
  getNutritionSettings,
  saveNutritionSettings,
  updateNutritionEntry
} from "../storage/nutritionStorage";
import { downloadNutritionExport } from "../storage/nutritionExport";
import type { NutritionEntry, NutritionSettings } from "../types/nutrition";
import styles from "./NutritionScreen.module.css";

type FormState = {
  name: string;
  calories: string;
  proteinGrams: string;
};

const emptyForm: FormState = { name: "", calories: "", proteinGrams: "" };

function resolveDateKey(param: string | undefined): string {
  if (param && isDateKeyFormat(param) && parseLocalDateKey(param)) return param;
  return todayLocalDateKey();
}

/** Consumed-against-target bar. Fill is clamped; going over is shown by colour. */
function Meter({
  label,
  unit,
  value,
  target,
  over,
  display,
  note
}: {
  label: string;
  unit: string;
  value: number;
  target: number;
  over: boolean;
  display: string;
  note: string;
}) {
  const ratio = target > 0 ? Math.min(1, Math.max(0, value / target)) : 0;
  return (
    <div className={styles.meter}>
      <div className={styles.meterHead}>
        <span className={styles.meterLabel}>{label}</span>
        <span className={styles.meterValue}>
          {display}
          <span className={styles.meterUnit}>{unit}</span>
        </span>
      </div>
      <div
        className={styles.meterTrack}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={target}
        aria-valuenow={value}
        aria-label={`${label} against target`}
      >
        <div
          className={over ? styles.meterFillOver : styles.meterFill}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
      <span className={over ? styles.meterNoteOver : styles.meterNote}>{note}</span>
    </div>
  );
}

function formatNumber(n: number, decimals = 0): string {
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString(undefined, {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals > 0 && !Number.isInteger(n) ? Math.min(decimals, 1) : 0
  });
}

function parseNonNegativeNumber(raw: string, { integer }: { integer: boolean }): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  if (integer && !Number.isInteger(n)) return null;
  return n;
}

export default function NutritionScreen() {
  const { dateKey: rawDateKey } = useParams<{ dateKey?: string }>();
  const navigate = useNavigate();
  const { logs } = useAppData();
  const { notifyLocalMutation } = useCloudAuth();

  const dateKey = resolveDateKey(rawDateKey);
  const todayKey = todayLocalDateKey();
  const isToday = dateKey === todayKey;

  const [settings, setSettings] = useState<NutritionSettings>(() => getNutritionSettings());
  const [entries, setEntries] = useState<NutritionEntry[]>(() => getNutritionDay(dateKey)?.entries ?? []);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [editingTargets, setEditingTargets] = useState(false);
  const [targetDraft, setTargetDraft] = useState({
    calorieTarget: String(settings.calorieTarget),
    proteinTargetGrams: String(settings.proteinTargetGrams)
  });
  const [targetError, setTargetError] = useState<string | null>(null);
  const [exportNote, setExportNote] = useState<string | null>(null);

  const nameInputId = useId();
  const caloriesInputId = useId();
  const proteinInputId = useId();
  const calorieTargetId = useId();
  const proteinTargetId = useId();
  const dateInputId = useId();
  const submittingRef = useRef(false);

  // Sync when route date changes.
  useEffect(() => {
    setEntries(getNutritionDay(dateKey)?.entries ?? []);
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
  }, [dateKey]);

  // Redirect malformed dateKey params to today.
  useEffect(() => {
    if (rawDateKey && rawDateKey !== dateKey) {
      navigate(`/nutrition/${dateKey}`, { replace: true });
    }
  }, [rawDateKey, dateKey, navigate]);

  const day = { dateKey, entries };
  const totals = dayTotals(day);
  const remaining = remainingSummary(totals, settings);
  const workouts = completedWorkoutsForLocalDate(logs, dateKey);

  const goToDate = (nextKey: string) => {
    if (nextKey === todayKey) {
      navigate("/nutrition");
    } else {
      navigate(`/nutrition/${nextKey}`);
    }
  };

  const onPrevDay = () => {
    const prev = shiftLocalDateKey(dateKey, -1);
    if (prev) goToDate(prev);
  };

  const onNextDay = () => {
    const next = shiftLocalDateKey(dateKey, 1);
    if (next) goToDate(next);
  };

  const onDateInputChange = (value: string) => {
    if (isDateKeyFormat(value) && parseLocalDateKey(value)) {
      goToDate(value);
    }
  };

  const refreshFromStorage = () => {
    setSettings(getNutritionSettings());
    setEntries(getNutritionDay(dateKey)?.entries ?? []);
  };

  const onSubmitFood = (event: FormEvent) => {
    event.preventDefault();
    if (submittingRef.current) return;
    setFormError(null);

    const name = form.name.trim();
    const calories = parseNonNegativeNumber(form.calories, { integer: true });
    const proteinGrams = parseNonNegativeNumber(form.proteinGrams, { integer: false });

    if (!name) {
      setFormError("Food name is required.");
      return;
    }
    if (calories === null) {
      setFormError("Calories must be a non-negative whole number.");
      return;
    }
    if (proteinGrams === null) {
      setFormError("Protein must be a non-negative number.");
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    try {
      if (editingId) {
        updateNutritionEntry(dateKey, editingId, { name, calories, proteinGrams });
      } else {
        addNutritionEntry(dateKey, { name, calories, proteinGrams });
      }
      setForm(emptyForm);
      setEditingId(null);
      refreshFromStorage();
      notifyLocalMutation();
    } catch {
      setFormError("Could not save that food entry. Check the values and try again.");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const startEdit = (entry: NutritionEntry) => {
    setEditingId(entry.id);
    setForm({
      name: entry.name,
      calories: String(entry.calories),
      proteinGrams: String(entry.proteinGrams)
    });
    setFormError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
  };

  const onDelete = (entry: NutritionEntry) => {
    const ok = window.confirm(`Delete “${entry.name}”?`);
    if (!ok) return;
    deleteNutritionEntry(dateKey, entry.id);
    if (editingId === entry.id) cancelEdit();
    refreshFromStorage();
    notifyLocalMutation();
  };

  const startTargetEdit = () => {
    setTargetDraft({
      calorieTarget: String(settings.calorieTarget),
      proteinTargetGrams: String(settings.proteinTargetGrams)
    });
    setTargetError(null);
    setEditingTargets(true);
  };

  const onSaveTargets = (event: FormEvent) => {
    event.preventDefault();
    const calorieTarget = parseNonNegativeNumber(targetDraft.calorieTarget, { integer: true });
    const proteinTargetGrams = parseNonNegativeNumber(targetDraft.proteinTargetGrams, {
      integer: false
    });
    if (calorieTarget === null || calorieTarget <= 0) {
      setTargetError("Calorie target must be a positive whole number.");
      return;
    }
    if (proteinTargetGrams === null || proteinTargetGrams <= 0) {
      setTargetError("Protein target must be a positive number.");
      return;
    }
    const saved = saveNutritionSettings({ calorieTarget, proteinTargetGrams });
    setSettings(saved);
    setEditingTargets(false);
    setTargetError(null);
    notifyLocalMutation();
  };

  const onExport = () => {
    const ok = downloadNutritionExport();
    setExportNote(ok ? "Nutrition JSON downloaded." : "Export failed. Try again.");
  };

  const remainingLine = (() => {
    const parts: string[] = [];
    if (remaining.caloriesOverTarget) {
      parts.push(`${formatNumber(remaining.caloriesOverBy)} kcal over target`);
    } else {
      parts.push(`${formatNumber(remaining.caloriesRemaining)} kcal remaining`);
    }
    if (remaining.proteinOverTarget) {
      parts.push(`${formatNumber(remaining.proteinOverBy, 1)} g protein over target`);
    } else {
      parts.push(`${formatNumber(remaining.proteinRemaining, 1)} g protein remaining`);
    }
    return parts.join(" · ");
  })();

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>Nutrition</h1>
        <p className={styles.dateLabel}>{formatLocalDateKeyLabel(dateKey)}</p>
        <div className={styles.dateControls}>
          <button type="button" className={styles.iconButton} onClick={onPrevDay} aria-label="Previous day">
            ←
          </button>
          <label className={styles.dateField} htmlFor={dateInputId}>
            <span className={styles.srOnly}>Select date</span>
            <input
              id={dateInputId}
              type="date"
              className={styles.dateInput}
              value={dateKey}
              onChange={(e) => onDateInputChange(e.target.value)}
            />
          </label>
          <button type="button" className={styles.iconButton} onClick={onNextDay} aria-label="Next day">
            →
          </button>
          {!isToday ? (
            <button type="button" className={styles.todayButton} onClick={() => goToDate(todayKey)}>
              Today
            </button>
          ) : null}
        </div>
      </header>

      {/* Two meters instead of a bullet list: how far through the day you are is
          the whole question this screen answers, so it should be readable at a glance. */}
      <section className={styles.section} aria-labelledby="nutrition-summary-heading">
        <h2 id="nutrition-summary-heading" className={styles.sectionTitle}>
          Daily summary
        </h2>
        <div className={styles.meters}>
          <Meter
            label="Calories"
            unit="kcal"
            value={totals.calories}
            target={settings.calorieTarget}
            over={remaining.caloriesOverTarget}
            display={`${formatNumber(totals.calories)} / ${formatNumber(settings.calorieTarget)}`}
            note={
              remaining.caloriesOverTarget
                ? `${formatNumber(remaining.caloriesOverBy)} over`
                : `${formatNumber(remaining.caloriesRemaining)} left`
            }
          />
          <Meter
            label="Protein"
            unit="g"
            value={totals.proteinGrams}
            target={settings.proteinTargetGrams}
            over={remaining.proteinOverTarget}
            display={`${formatNumber(totals.proteinGrams, 1)} / ${formatNumber(
              settings.proteinTargetGrams,
              1
            )}`}
            note={
              remaining.proteinOverTarget
                ? `${formatNumber(remaining.proteinOverBy, 1)} over`
                : `${formatNumber(remaining.proteinRemaining, 1)} left`
            }
          />
        </div>
        <p className={styles.srOnly}>{remainingLine}</p>
      </section>

      <section className={styles.section} aria-labelledby="nutrition-workouts-heading">
        <h2 id="nutrition-workouts-heading" className={styles.sectionTitle}>
          Workouts this day
        </h2>
        {workouts.length === 0 ? (
          <p className={styles.muted}>No completed workout on this date</p>
        ) : workouts.length === 1 ? (
          <p className={styles.workoutLine}>
            Workout:{" "}
            <Link to={`/history/${encodeURIComponent(workouts[0].id)}`}>
              {workouts[0].workoutTitle}
            </Link>{" "}
            — Completed
          </p>
        ) : (
          <div>
            <p className={styles.muted}>{workouts.length} workouts completed on this date</p>
            <ul className={styles.workoutList}>
              {workouts.map((log) => (
                <li key={log.id}>
                  <Link to={`/history/${encodeURIComponent(log.id)}`}>{log.workoutTitle}</Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className={styles.section} aria-labelledby="nutrition-food-heading">
        <h2 id="nutrition-food-heading" className={styles.sectionTitle}>
          Food
        </h2>
        <form className={styles.form} onSubmit={onSubmitFood}>
          <div className={styles.field}>
            <label htmlFor={nameInputId}>Food name</label>
            <input
              id={nameInputId}
              type="text"
              autoComplete="off"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor={caloriesInputId}>Calories</label>
              <input
                id={caloriesInputId}
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={form.calories}
                onChange={(e) => setForm((f) => ({ ...f, calories: e.target.value }))}
                required
              />
            </div>
            <div className={styles.field}>
              <label htmlFor={proteinInputId}>Protein (g)</label>
              <input
                id={proteinInputId}
                type="number"
                inputMode="decimal"
                min={0}
                step="0.1"
                value={form.proteinGrams}
                onChange={(e) => setForm((f) => ({ ...f, proteinGrams: e.target.value }))}
                required
              />
            </div>
          </div>
          {formError ? <p className={styles.error}>{formError}</p> : null}
          <div className={styles.formActions}>
            <button type="submit" className={styles.primaryButton} disabled={submitting}>
              {editingId ? "Save changes" : "Add Food"}
            </button>
            {editingId ? (
              <button type="button" className={styles.secondaryButton} onClick={cancelEdit}>
                Cancel
              </button>
            ) : null}
          </div>
        </form>

        {entries.length === 0 ? (
          <p className={styles.empty}>No foods logged for this day yet. Add one above.</p>
        ) : (
          <ul className={styles.entryList}>
            {entries.map((entry) => (
              <li key={entry.id} className={styles.entry}>
                <div className={styles.entryMain}>
                  <span className={styles.entryName}>{entry.name}</span>
                  <span className={styles.entryMacros}>
                    {formatNumber(entry.calories)} kcal · {formatNumber(entry.proteinGrams, 1)} g protein
                  </span>
                </div>
                <div className={styles.entryActions}>
                  <button type="button" className={styles.textButton} onClick={() => startEdit(entry)}>
                    Edit
                  </button>
                  <button type="button" className={styles.textButton} onClick={() => onDelete(entry)}>
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className={styles.hint}>Entries are listed oldest first (newest last).</p>
      </section>

      <section className={styles.section} aria-labelledby="nutrition-targets-heading">
        <h2 id="nutrition-targets-heading" className={styles.sectionTitle}>
          Daily targets
        </h2>
        <p className={styles.muted}>
          Targets apply to every date. They are current settings, not a historical snapshot.
        </p>
        {editingTargets ? (
          <form className={styles.form} onSubmit={onSaveTargets}>
            <div className={styles.row}>
              <div className={styles.field}>
                <label htmlFor={calorieTargetId}>Calorie target</label>
                <input
                  id={calorieTargetId}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  value={targetDraft.calorieTarget}
                  onChange={(e) =>
                    setTargetDraft((d) => ({ ...d, calorieTarget: e.target.value }))
                  }
                  required
                />
              </div>
              <div className={styles.field}>
                <label htmlFor={proteinTargetId}>Protein target (g)</label>
                <input
                  id={proteinTargetId}
                  type="number"
                  inputMode="decimal"
                  min={0.1}
                  step="0.1"
                  value={targetDraft.proteinTargetGrams}
                  onChange={(e) =>
                    setTargetDraft((d) => ({ ...d, proteinTargetGrams: e.target.value }))
                  }
                  required
                />
              </div>
            </div>
            {targetError ? <p className={styles.error}>{targetError}</p> : null}
            <div className={styles.formActions}>
              <button type="submit" className={styles.primaryButton}>
                Save targets
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => {
                  setEditingTargets(false);
                  setTargetError(null);
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className={styles.targetsRow}>
            <p>
              {formatNumber(settings.calorieTarget)} kcal · {formatNumber(settings.proteinTargetGrams, 1)}{" "}
              g protein
            </p>
            <button type="button" className={styles.secondaryButton} onClick={startTargetEdit}>
              Edit targets
            </button>
          </div>
        )}
      </section>

      <section className={styles.section} aria-labelledby="nutrition-backup-heading">
        <h2 id="nutrition-backup-heading" className={styles.sectionTitle}>
          Backup
        </h2>
        <button type="button" className={styles.secondaryButton} onClick={onExport}>
          Export Nutrition JSON
        </button>
        {exportNote ? <p className={styles.muted}>{exportNote}</p> : null}
      </section>
    </div>
  );
}
