# V2 Cloud Sync (Phase 6)

## Architecture

Local-first PWA on GitHub Pages with optional free Supabase Auth + Postgres sync.

- **Local cache:** existing `localStorage` modules (History, Nutrition, drafts)
- **Cloud:** Supabase tables with jsonb payloads + Row Level Security
- **No custom backend / Render / service-role key in the browser**

```text
UI → localStorage write → debounce → upsert (auth.uid)
     ↑________________ merge on pull _________________↓
```

## Local-first behavior

- App works signed out and offline.
- Local write always happens first.
- Failed cloud upload never deletes local data.
- Empty cloud never wipes non-empty local; empty local never wipes non-empty cloud.

## Account behavior

- Email + password via Supabase Auth.
- Create / sign in / sign out / forgot password on Account screen (`#/account`).
- Sign-out does **not** erase local data.
- Sign-out does **not** clear `lastUserId` / ownership flags (prevents silent re-upload as “unowned”).

## Ownership state machine

Local keys:

- `workout-app:cloud:last-user-id`
- `workout-app:cloud:sync-state:v1`

| Situation | Behavior |
|---|---|
| Unowned local data on first sign-in | Prompt: Merge / Download only / Cancel |
| Same user, ownership resolved | Silent sync |
| Different user | Block silent upload; warn; Download only / Cancel |
| No local data | Pull cloud (if any) and mark resolved after sync |

## First-sync flow

1. Export History JSON / Nutrition JSON recommended before merge.
2. **Merge local data into this account** → merge + upsert + read-back count check.
3. **Download cloud data only** → apply cloud when present; keep local if cloud empty.
4. Mark ownership only after success.

## Merge rules

### History

- Key: stable `WorkoutLog.id` (scoped by `user_id` in cloud)
- Prefer richer compatible record (`logRichnessScore`)
- Preserve `completedAt` / titles
- Same calendar day, different IDs → both kept
- V1: append/update-only (no casual cloud delete)

### Nutrition days

- Key: `dateKey`
- Entries keyed by stable entry `id`
- Day `updatedAt` decides which side’s tombstones win
- `deletedEntryIds` prevent resurrection from older payloads
- Strategy: full day payload replacement with `updatedAt` + entry tombstones

### Settings

- One side only → use it
- Both differ → explicit **Use this device** / **Use cloud settings**

### Progress

- Union of completed workout `order`s

### Drafts

- Key: `workoutId`
- Newer `updatedAt` wins
- Completing a workout clears local draft and sync removes cloud draft after upload

## Sync triggers

- After ownership resolution / sign-in
- App startup while signed in
- Window focus
- Browser online
- Debounced after local mutations
- Manual **Sync Now**

No realtime subscriptions in V1. Single-flight lock prevents parallel duplicate jobs.

## Sync status UI

Local only · Syncing · Synced · Offline · Needs attention · Cloud sync not configured · Waiting for your choice

## Database

See `supabase/migrations/001_initial_cloud_sync.sql` and `supabase/README.md`.

Tables: `workout_logs`, `nutrition_days`, `user_settings`, `workout_progress`, `active_drafts`.

RLS: authenticated users may only access rows where `user_id = auth.uid()`.

## Environment

Local: `.env.local` with `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` (see `.env.example`).

GitHub Actions secrets with the same names for Pages deploy.

Setup guide: `docs/V2_SUPABASE_SETUP.md`.

## Security

- Publishable key is browser-safe **only with RLS**.
- Never commit or ship the service-role key.
- No public table policies.
- Do not log sessions or keys.

## Free-plan limitations

- Supabase Free projects may **pause** after inactivity — wake the project if sync fails suddenly.
- Email confirmation may be required depending on dashboard settings.
- Soft rate limits; debounce keeps writes modest.

## Backup recommendation

Use **Export History** and **Export Nutrition** before first merge and periodically.

## HashRouter / redirects

Auth redirects target the GitHub Pages site URL. Recovery links land on `/workout-app/`; the Supabase client detects the session from the URL. Documented limitations: `docs/V2_SUPABASE_SETUP.md`.

## Known limitations

- No realtime multi-tab collaboration
- History cloud delete not fully tombstoned in V1
- Settings conflict is one-shot explicit choice (no auto timestamp pick)
- Two-browser conflict on the same Nutrition entry resolves by `updatedAt` only
- Production sync inactive until GitHub secrets + SQL migration are applied by the project owner

## Recovery

1. Export local JSON backups.
2. Confirm Supabase project is awake and RLS SQL applied.
3. Sign in → Merge or Download as appropriate.
4. Sync Now; verify counts on Account screen.

## Future improvements

- Soft-delete History tombstones
- Safer multi-device settings history
- Optional passkeys / OAuth
- Conflict preview UI for Nutrition entries
