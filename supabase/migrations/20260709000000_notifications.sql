-- NEFELI companion — proactive notifications (transit nudges)
-- The daily cron writes one row per user per day when a notable transit forms;
-- the app surfaces unread rows and can mark them read. Owner-scoped RLS;
-- service-role (the cron) bypasses RLS as elsewhere. Idempotent / safe to re-run.

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'transit_nudge',
  title text not null,
  body text not null,
  data jsonb not null default '{}',
  -- Idempotency: at most one notification per (user, dedupe_key). The cron uses
  -- e.g. 'transit_nudge:2026-07-09' so re-runs on the same day are no-ops.
  dedupe_key text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, dedupe_key)
);

create index if not exists notifications_user_idx on notifications(user_id);
create index if not exists notifications_unread_idx
  on notifications(user_id) where read_at is null;

alter table notifications enable row level security;

drop policy if exists notifications_owner on notifications;
create policy notifications_owner on notifications
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

notify pgrst, 'reload schema';
