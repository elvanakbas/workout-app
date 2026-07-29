import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;
let initAttempted = false;

export function getSupabaseConfig(): { url: string; publishableKey: string } | null {
  const env =
    typeof import.meta !== "undefined" && import.meta.env
      ? import.meta.env
      : ({} as ImportMetaEnv);
  const url = (env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? "";
  const publishableKey = (env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)?.trim() ?? "";
  if (!url || !publishableKey) return null;
  return { url, publishableKey };
}

export function isCloudConfigured(): boolean {
  return getSupabaseConfig() !== null;
}

/**
 * Singleton Supabase browser client.
 * Returns null when env is missing — app stays local-only and does not crash.
 * Never logs keys or sessions.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (client) return client;
  if (initAttempted) return null;
  initAttempted = true;

  const config = getSupabaseConfig();
  if (!config) return null;

  client = createClient(config.url, config.publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
  return client;
}

/** Test helper: reset singleton between validation runs. */
export function resetSupabaseClientForTests(): void {
  client = null;
  initAttempted = false;
}
