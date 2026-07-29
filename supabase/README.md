# Supabase SQL for Workout App cloud sync

## Apply migration

1. Open your Supabase project → **SQL Editor**.
2. Paste the contents of `migrations/001_initial_cloud_sync.sql`.
3. Run the script.
4. Confirm under **Authentication → Policies** (or Table Editor → RLS) that every user-data table has RLS **enabled** and own-row policies.

## Tables

| Table | Key | Purpose |
|---|---|---|
| `workout_logs` | `(user_id, id)` | Completed WorkoutLog jsonb payloads |
| `nutrition_days` | `(user_id, date_key)` | Per-day Nutrition jsonb payloads |
| `user_settings` | `user_id` | Nutrition settings (and future user prefs) |
| `workout_progress` | `user_id` | Completed-order union payload |
| `active_drafts` | `(user_id, workout_id)` | In-progress session drafts |

## Security

- RLS is required on every table.
- Policies allow only `auth.uid() = user_id`.
- Never use the **service role** key in the GitHub Pages frontend.
- The **publishable** key is browser-safe only because RLS is enabled.

## Verify RLS

In SQL Editor:

```sql
select relname, relrowsecurity
from pg_class
where relname in (
  'workout_logs',
  'nutrition_days',
  'user_settings',
  'workout_progress',
  'active_drafts'
);
```

Every row should show `relrowsecurity = true`.
