import styles from "./NumberStepper.module.css";

interface NumberStepperProps {
  value: number;
  /** Absolute set, used when the field is typed into directly. */
  onChange: (next: number) => void;
  /**
   * Relative change from the −/+ buttons. Must be applied against the newest
   * stored value, not this render's `value`: tapping + quickly batches several
   * clicks into one render, and an absolute setter would drop every tap but the
   * first.
   */
  onNudge: (delta: number) => void;
  /** Increment applied by the −/+ buttons. Weight uses 2.5, reps/seconds use 1/5. */
  step: number;
  min?: number;
  max?: number;
  unit?: string;
  placeholder?: string;
  disabled?: boolean;
  ariaLabel: string;
}

/**
 * Number entry with thumb-sized −/+ buttons flanking the field.
 *
 * The keyboard still works for a big jump, but a normal set can be logged
 * without ever opening it — which is the difference between usable and unusable
 * with chalky hands mid-session.
 */
export default function NumberStepper({
  value,
  onChange,
  onNudge,
  step,
  min = 0,
  max,
  unit,
  placeholder,
  disabled,
  ariaLabel
}: NumberStepperProps) {
  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={styles.button}
        onClick={() => onNudge(-step)}
        disabled={disabled || value <= min}
        aria-label={`${ariaLabel} decrease by ${step}`}
      >
        −
      </button>
      <div className={styles.field}>
        <input
          type="number"
          inputMode={String(step).includes(".") ? "decimal" : "numeric"}
          min={min}
          max={max}
          className={styles.input}
          value={value === 0 ? "" : value}
          placeholder={placeholder ?? "0"}
          disabled={disabled}
          aria-label={ariaLabel}
          onChange={(event) => onChange(Number(event.target.value) || 0)}
        />
        {unit ? <span className={styles.unit}>{unit}</span> : null}
      </div>
      <button
        type="button"
        className={styles.button}
        onClick={() => onNudge(step)}
        disabled={disabled || (max != null && value >= max)}
        aria-label={`${ariaLabel} increase by ${step}`}
      >
        +
      </button>
    </div>
  );
}
