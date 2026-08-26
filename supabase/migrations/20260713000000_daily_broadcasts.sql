-- NEFELI — daily community broadcast dedupe
-- One row per day the "sky weather" was posted to Discord, so the cron posts
-- exactly once per day even across retries or concurrent runs. Service-role
-- only (RLS on, no policy). Idempotent.

create table if not exists daily_broadcasts (
  broadcast_date date primary key,
  posted_at timestamptz not null default now()
);

alter table daily_broadcasts enable row level security;

notify pgrst, 'reload schema';
