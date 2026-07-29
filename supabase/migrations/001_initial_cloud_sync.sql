-- Phase 6: Free account + cross-device cloud sync (Supabase)
-- Apply in Supabase SQL Editor or via CLI. Enable RLS on every table.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.workout_logs (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  workout_id text,
  completed_at timestamptz not null,
  started_at timestamptz,
  updated_at timestamptz not null default now(),
  schema_version integer,
  payload jsonb not null,
  deleted_at timestamptz,
  primary key (user_id, id)
);

create index if not exists workout_logs_user_updated_idx
  on public.workout_logs (user_id, updated_at desc);

create index if not exists workout_logs_user_completed_idx
  on public.workout_logs (user_id, completed_at desc);

create table if not exists public.nutrition_days (
  user_id uuid not null references auth.users (id) on delete cascade,
  date_key date not null,
  updated_at timestamptz not null default now(),
  payload jsonb not null,
  deleted_at timestamptz,
  primary key (user_id, date_key)
);

create index if not exists nutrition_days_user_updated_idx
  on public.nutrition_days (user_id, updated_at desc);

create table if not exists public.user_settings (
  user_id uuid not null references auth.users (id) on delete cascade primary key,
  updated_at timestamptz not null default now(),
  payload jsonb not null
);

create table if not exists public.workout_progress (
  user_id uuid not null references auth.users (id) on delete cascade primary key,
  updated_at timestamptz not null default now(),
  payload jsonb not null
);

create table if not exists public.active_drafts (
  user_id uuid not null references auth.users (id) on delete cascade,
  workout_id text not null,
  updated_at timestamptz not null default now(),
  payload jsonb not null,
  primary key (user_id, workout_id)
);

create index if not exists active_drafts_user_updated_idx
  on public.active_drafts (user_id, updated_at desc);

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists workout_logs_set_updated_at on public.workout_logs;
create trigger workout_logs_set_updated_at
  before update on public.workout_logs
  for each row execute function public.set_updated_at();

drop trigger if exists nutrition_days_set_updated_at on public.nutrition_days;
create trigger nutrition_days_set_updated_at
  before update on public.nutrition_days
  for each row execute function public.set_updated_at();

drop trigger if exists user_settings_set_updated_at on public.user_settings;
create trigger user_settings_set_updated_at
  before update on public.user_settings
  for each row execute function public.set_updated_at();

drop trigger if exists workout_progress_set_updated_at on public.workout_progress;
create trigger workout_progress_set_updated_at
  before update on public.workout_progress
  for each row execute function public.set_updated_at();

drop trigger if exists active_drafts_set_updated_at on public.active_drafts;
create trigger active_drafts_set_updated_at
  before update on public.active_drafts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.workout_logs enable row level security;
alter table public.nutrition_days enable row level security;
alter table public.user_settings enable row level security;
alter table public.workout_progress enable row level security;
alter table public.active_drafts enable row level security;

-- workout_logs
drop policy if exists workout_logs_select_own on public.workout_logs;
create policy workout_logs_select_own on public.workout_logs
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists workout_logs_insert_own on public.workout_logs;
create policy workout_logs_insert_own on public.workout_logs
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists workout_logs_update_own on public.workout_logs;
create policy workout_logs_update_own on public.workout_logs
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists workout_logs_delete_own on public.workout_logs;
create policy workout_logs_delete_own on public.workout_logs
  for delete to authenticated
  using (user_id = auth.uid());

-- nutrition_days
drop policy if exists nutrition_days_select_own on public.nutrition_days;
create policy nutrition_days_select_own on public.nutrition_days
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists nutrition_days_insert_own on public.nutrition_days;
create policy nutrition_days_insert_own on public.nutrition_days
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists nutrition_days_update_own on public.nutrition_days;
create policy nutrition_days_update_own on public.nutrition_days
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists nutrition_days_delete_own on public.nutrition_days;
create policy nutrition_days_delete_own on public.nutrition_days
  for delete to authenticated
  using (user_id = auth.uid());

-- user_settings
drop policy if exists user_settings_select_own on public.user_settings;
create policy user_settings_select_own on public.user_settings
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists user_settings_insert_own on public.user_settings;
create policy user_settings_insert_own on public.user_settings
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists user_settings_update_own on public.user_settings;
create policy user_settings_update_own on public.user_settings
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists user_settings_delete_own on public.user_settings;
create policy user_settings_delete_own on public.user_settings
  for delete to authenticated
  using (user_id = auth.uid());

-- workout_progress
drop policy if exists workout_progress_select_own on public.workout_progress;
create policy workout_progress_select_own on public.workout_progress
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists workout_progress_insert_own on public.workout_progress;
create policy workout_progress_insert_own on public.workout_progress
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists workout_progress_update_own on public.workout_progress;
create policy workout_progress_update_own on public.workout_progress
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists workout_progress_delete_own on public.workout_progress;
create policy workout_progress_delete_own on public.workout_progress
  for delete to authenticated
  using (user_id = auth.uid());

-- active_drafts
drop policy if exists active_drafts_select_own on public.active_drafts;
create policy active_drafts_select_own on public.active_drafts
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists active_drafts_insert_own on public.active_drafts;
create policy active_drafts_insert_own on public.active_drafts
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists active_drafts_update_own on public.active_drafts;
create policy active_drafts_update_own on public.active_drafts
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists active_drafts_delete_own on public.active_drafts;
create policy active_drafts_delete_own on public.active_drafts
  for delete to authenticated
  using (user_id = auth.uid());

-- Authenticated role needs table grants; RLS still filters rows.
grant select, insert, update, delete on public.workout_logs to authenticated;
grant select, insert, update, delete on public.nutrition_days to authenticated;
grant select, insert, update, delete on public.user_settings to authenticated;
grant select, insert, update, delete on public.workout_progress to authenticated;
grant select, insert, update, delete on public.active_drafts to authenticated;
