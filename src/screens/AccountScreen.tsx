import { useId, useState, type FormEvent } from "react";
import { downloadHistoryExport } from "../storage/historyExport";
import { downloadNutritionExport } from "../storage/nutritionExport";
import { useCloudAuth } from "../cloud/CloudAuthContext";
import type { SyncUiStatus } from "../cloud/cloudTypes";
import styles from "./AccountScreen.module.css";

function statusLabel(status: SyncUiStatus): string {
  switch (status) {
    case "not-configured":
      return "Cloud sync not configured";
    case "local-only":
      return "Local only";
    case "syncing":
      return "Syncing…";
    case "synced":
      return "Synced";
    case "offline":
      return "Offline";
    case "needs-attention":
      return "Needs attention";
    case "awaiting-ownership":
      return "Waiting for your choice";
    default:
      return status;
  }
}

function formatTime(iso: string | null): string {
  if (!iso) return "Never";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

type Mode = "sign-in" | "sign-up" | "forgot";

export default function AccountScreen() {
  const cloud = useCloudAuth();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const emailId = useId();
  const passwordId = useId();

  const onAuthSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      if (mode === "forgot") {
        const { error } = await cloud.resetPassword(email);
        setMessage(
          error
            ? error
            : "If that email is registered, a reset link was sent."
        );
      } else if (mode === "sign-up") {
        const { error } = await cloud.signUp(email, password);
        setMessage(
          error
            ? error
            : "Account created. Check your email if confirmation is required, then sign in."
        );
        if (!error) setMode("sign-in");
      } else {
        const { error } = await cloud.signIn(email, password);
        setMessage(error);
      }
    } finally {
      setBusy(false);
    }
  };

  const onSync = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await cloud.syncNow();
      setMessage(result.message ?? (result.ok ? "Sync finished." : "Sync needs attention."));
    } finally {
      setBusy(false);
    }
  };

  if (cloud.loading) {
    return (
      <div className={styles.screen}>
        <h1 className={styles.title}>Account</h1>
        <p className={styles.muted}>Checking account…</p>
      </div>
    );
  }

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>Account</h1>
        <p className={styles.muted}>
          Free optional cloud sync keeps History and Nutrition aligned across your devices.
          The app still works fully offline on this device.
        </p>
      </header>

      <section className={styles.section} aria-labelledby="sync-status-heading">
        <h2 id="sync-status-heading" className={styles.sectionTitle}>
          Sync status
        </h2>
        <ul className={styles.list}>
          <li>{statusLabel(cloud.syncStatus)}</li>
          <li>Last synced: {formatTime(cloud.lastSyncedAt)}</li>
          {cloud.lastError ? <li className={styles.error}>{cloud.lastError}</li> : null}
        </ul>
      </section>

      {!cloud.configured ? (
        <section className={styles.section}>
          <p className={styles.notice}>
            Cloud sync not configured. Add <code>VITE_SUPABASE_URL</code> and{" "}
            <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> (see docs/V2_SUPABASE_SETUP.md). Local
            data stays on this device.
          </p>
        </section>
      ) : null}

      {cloud.ownershipPrompt ? (
        <section className={styles.section} aria-labelledby="ownership-heading">
          <h2 id="ownership-heading" className={styles.sectionTitle}>
            Local data found
          </h2>
          <p className={styles.muted}>
            Local workout and Nutrition data were found on this device.
            {cloud.ownershipPrompt.ownership === "different-user"
              ? " This browser previously synced with a different account. Do not upload that cache into this account."
              : " Choose how to continue."}
          </p>
          <ul className={styles.list}>
            <li>History records: {cloud.ownershipPrompt.summary?.historyCount ?? cloud.localSummary.historyCount}</li>
            <li>
              Nutrition days:{" "}
              {cloud.ownershipPrompt.summary?.nutritionDayCount ?? cloud.localSummary.nutritionDayCount}
            </li>
            <li>Active drafts: {cloud.ownershipPrompt.summary?.draftCount ?? cloud.localSummary.draftCount}</li>
          </ul>
          <div className={styles.actions}>
            {cloud.ownershipPrompt.ownership !== "different-user" ? (
              <button
                type="button"
                className={styles.primaryButton}
                disabled={busy}
                onClick={() => void cloud.resolveOwnership("merge-local")}
              >
                Merge local data into this account
              </button>
            ) : null}
            <button
              type="button"
              className={styles.secondaryButton}
              disabled={busy}
              onClick={() => void cloud.resolveOwnership("download-cloud-only")}
            >
              Download cloud data only
            </button>
            <button
              type="button"
              className={styles.secondaryButton}
              disabled={busy}
              onClick={() => void cloud.resolveOwnership("cancel")}
            >
              Cancel
            </button>
          </div>
        </section>
      ) : null}

      {cloud.settingsConflict ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Nutrition targets differ</h2>
          <p className={styles.muted}>
            This device and the cloud have different calorie/protein targets. Choose once:
          </p>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primaryButton}
              disabled={busy}
              onClick={() => void cloud.resolveSettingsConflict("use-device")}
            >
              Use this device
            </button>
            <button
              type="button"
              className={styles.secondaryButton}
              disabled={busy}
              onClick={() => void cloud.resolveSettingsConflict("use-cloud")}
            >
              Use cloud settings
            </button>
          </div>
        </section>
      ) : null}

      {cloud.user ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Signed in</h2>
          <p>{cloud.user.email}</p>
          <div className={styles.actions}>
            <button type="button" className={styles.primaryButton} disabled={busy} onClick={() => void onSync()}>
              Sync Now
            </button>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => downloadHistoryExport()}
            >
              Export History
            </button>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => downloadNutritionExport()}
            >
              Export Nutrition
            </button>
            <button
              type="button"
              className={styles.secondaryButton}
              disabled={busy}
              onClick={() => void cloud.signOut()}
            >
              Sign out
            </button>
          </div>
          <p className={styles.muted}>Sign out does not erase local data on this device.</p>
        </section>
      ) : cloud.configured ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            {mode === "sign-up" ? "Create account" : mode === "forgot" ? "Forgot password" : "Sign in"}
          </h2>
          <p className={styles.muted}>
            Local History and Nutrition stay on this device until you choose to merge them after
            signing in.
          </p>
          <form className={styles.form} onSubmit={(e) => void onAuthSubmit(e)}>
            <div className={styles.field}>
              <label htmlFor={emailId}>Email</label>
              <input
                id={emailId}
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {mode !== "forgot" ? (
              <div className={styles.field}>
                <label htmlFor={passwordId}>Password</label>
                <input
                  id={passwordId}
                  type="password"
                  autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            ) : null}
            {message ? (
              <p className={message.toLowerCase().includes("error") || message.includes("Invalid") ? styles.error : styles.muted}>
                {message}
              </p>
            ) : null}
            <button type="submit" className={styles.primaryButton} disabled={busy}>
              {mode === "sign-up" ? "Create account" : mode === "forgot" ? "Send reset link" : "Sign in"}
            </button>
          </form>
          <div className={styles.modeSwitch}>
            {mode !== "sign-in" ? (
              <button type="button" className={styles.textButton} onClick={() => setMode("sign-in")}>
                Sign in
              </button>
            ) : null}
            {mode !== "sign-up" ? (
              <button type="button" className={styles.textButton} onClick={() => setMode("sign-up")}>
                Create account
              </button>
            ) : null}
            {mode !== "forgot" ? (
              <button type="button" className={styles.textButton} onClick={() => setMode("forgot")}>
                Forgot password
              </button>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
