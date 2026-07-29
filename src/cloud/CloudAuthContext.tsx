import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseClient, isCloudConfigured } from "./supabaseClient";
import {
  getSyncUiStatus,
  runCloudSync,
  scheduleCloudSync,
  summarizeLocalData,
  type SyncResult
} from "./syncEngine";
import {
  onSignOutPreserveOwnership,
  readCloudSyncState
} from "./ownership";
import type {
  CloudOwnershipDecision,
  LocalDataSummary,
  SettingsConflictChoice,
  SyncUiStatus
} from "./cloudTypes";

interface CloudAuthValue {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  user: User | null;
  syncStatus: SyncUiStatus;
  lastSyncedAt: string | null;
  lastError: string | null;
  ownershipPrompt: SyncResult | null;
  settingsConflict: boolean;
  localSummary: LocalDataSummary;
  refreshSummary: () => void;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  syncNow: () => Promise<SyncResult>;
  resolveOwnership: (decision: CloudOwnershipDecision) => Promise<SyncResult>;
  resolveSettingsConflict: (choice: SettingsConflictChoice) => Promise<SyncResult>;
  notifyLocalMutation: () => void;
}

const CloudAuthContext = createContext<CloudAuthValue | null>(null);

export function CloudAuthProvider({
  children,
  onLogsChanged
}: {
  children: ReactNode;
  onLogsChanged?: () => void;
}) {
  const configured = isCloudConfigured();
  const [loading, setLoading] = useState(configured);
  const [session, setSession] = useState<Session | null>(null);
  const [ownershipPrompt, setOwnershipPrompt] = useState<SyncResult | null>(null);
  const [settingsConflict, setSettingsConflict] = useState(false);
  const [syncTick, setSyncTick] = useState(0);
  const [localSummary, setLocalSummary] = useState<LocalDataSummary>(() => summarizeLocalData());

  const refreshSummary = useCallback(() => {
    setLocalSummary(summarizeLocalData());
  }, []);

  const userId = session?.user?.id ?? null;

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }
    const sb = getSupabaseClient();
    if (!sb) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    void sb.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = sb.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [configured]);

  useEffect(() => {
    if (!userId) {
      setOwnershipPrompt(null);
      return;
    }
    void (async () => {
      const result = await runCloudSync({ userId });
      setSyncTick((n) => n + 1);
      refreshSummary();
      onLogsChanged?.();
      if (result.status === "awaiting-ownership") {
        setOwnershipPrompt(result);
      } else {
        setOwnershipPrompt(null);
      }
      setSettingsConflict(!!result.needsSettingsChoice);
    })();
  }, [userId, refreshSummary, onLogsChanged]);

  useEffect(() => {
    if (!userId) return;
    const onFocus = () => {
      void runCloudSync({ userId, skipOwnershipGate: true }).then(() => {
        setSyncTick((n) => n + 1);
        refreshSummary();
        onLogsChanged?.();
      });
    };
    const onOnline = () => {
      void runCloudSync({ userId, skipOwnershipGate: true }).then(() => {
        setSyncTick((n) => n + 1);
        refreshSummary();
        onLogsChanged?.();
      });
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
    };
  }, [userId, refreshSummary, onLogsChanged]);

  const signUp = useCallback(async (email: string, password: string) => {
    const sb = getSupabaseClient();
    if (!sb) return { error: "Cloud sync not configured" };
    const { error } = await sb.auth.signUp({ email: email.trim(), password });
    return { error: error?.message ?? null };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const sb = getSupabaseClient();
    if (!sb) return { error: "Cloud sync not configured" };
    const { error } = await sb.auth.signInWithPassword({
      email: email.trim(),
      password
    });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    onSignOutPreserveOwnership();
    setOwnershipPrompt(null);
    const sb = getSupabaseClient();
    if (sb) await sb.auth.signOut();
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const sb = getSupabaseClient();
    if (!sb) return { error: "Cloud sync not configured" };
    const redirectTo = `${window.location.origin}${window.location.pathname}`;
    const { error } = await sb.auth.resetPasswordForEmail(email.trim(), {
      redirectTo
    });
    return { error: error?.message ?? null };
  }, []);

  const syncNow = useCallback(async () => {
    if (!userId) {
      return { ok: false, status: "local-only" as const, message: "Sign in to sync" };
    }
    const result = await runCloudSync({ userId, skipOwnershipGate: true });
    setSyncTick((n) => n + 1);
    refreshSummary();
    onLogsChanged?.();
    setSettingsConflict(!!result.needsSettingsChoice);
    if (result.status === "awaiting-ownership") setOwnershipPrompt(result);
    return result;
  }, [userId, refreshSummary, onLogsChanged]);

  const resolveOwnership = useCallback(
    async (decision: CloudOwnershipDecision) => {
      if (!userId) {
        return { ok: false, status: "local-only" as const };
      }
      if (decision === "cancel" || decision === "keep-local-separate") {
        setOwnershipPrompt(null);
        return { ok: true, status: "local-only" as const, message: "Kept local-only for now" };
      }
      const force =
        decision === "merge-local" ? "merge-local" : "download-cloud-only";
      const result = await runCloudSync({
        userId,
        forceOwnership: force
      });
      setSyncTick((n) => n + 1);
      refreshSummary();
      onLogsChanged?.();
      if (result.ok) setOwnershipPrompt(null);
      else if (result.status === "awaiting-ownership") setOwnershipPrompt(result);
      setSettingsConflict(!!result.needsSettingsChoice);
      return result;
    },
    [userId, refreshSummary, onLogsChanged]
  );

  const resolveSettingsConflict = useCallback(
    async (choice: SettingsConflictChoice) => {
      if (!userId) {
        return { ok: false, status: "local-only" as const };
      }
      const result = await runCloudSync({
        userId,
        skipOwnershipGate: true,
        settingsChoice: choice
      });
      setSyncTick((n) => n + 1);
      refreshSummary();
      onLogsChanged?.();
      setSettingsConflict(!!result.needsSettingsChoice);
      return result;
    },
    [userId, refreshSummary, onLogsChanged]
  );

  const notifyLocalMutation = useCallback(() => {
    refreshSummary();
    if (userId) scheduleCloudSync(userId);
    setSyncTick((n) => n + 1);
  }, [userId, refreshSummary]);

  const cloudState = readCloudSyncState();
  const syncStatus = getSyncUiStatus(!!session);
  // syncTick forces re-read after sync
  void syncTick;

  const value = useMemo<CloudAuthValue>(
    () => ({
      configured,
      loading,
      session,
      user: session?.user ?? null,
      syncStatus,
      lastSyncedAt: cloudState.lastSuccessfulSyncAt,
      lastError: cloudState.lastError,
      ownershipPrompt,
      settingsConflict,
      localSummary,
      refreshSummary,
      signUp,
      signIn,
      signOut,
      resetPassword,
      syncNow,
      resolveOwnership,
      resolveSettingsConflict,
      notifyLocalMutation
    }),
    [
      configured,
      loading,
      session,
      syncStatus,
      cloudState.lastSuccessfulSyncAt,
      cloudState.lastError,
      ownershipPrompt,
      settingsConflict,
      localSummary,
      refreshSummary,
      signUp,
      signIn,
      signOut,
      resetPassword,
      syncNow,
      resolveOwnership,
      resolveSettingsConflict,
      notifyLocalMutation
    ]
  );

  return <CloudAuthContext.Provider value={value}>{children}</CloudAuthContext.Provider>;
}

export function useCloudAuth(): CloudAuthValue {
  const ctx = useContext(CloudAuthContext);
  if (!ctx) throw new Error("useCloudAuth must be used within CloudAuthProvider");
  return ctx;
}
