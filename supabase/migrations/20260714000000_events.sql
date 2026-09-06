-- First-party product analytics. Written and read only via the service role
-- (the /api/track route) — never touched directly from the browser — so RLS is
-- enabled with no policies, denying all anon/authenticated access.

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  props jsonb not null default '{}'::jsonb,
  path text,
  created_at timestamptz not null default now()
);

alter table public.events enable row level security;

create index if not exists events_user_created_idx on public.events (user_id, created_at desc);
create index if not exists events_name_created_idx on public.events (name, created_at desc);
create index if not exists events_created_idx on public.events (created_at desc);
