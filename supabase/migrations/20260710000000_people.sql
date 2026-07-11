-- NEFELI companion — people (synastry / compatibility)
-- The people a user wants to understand their connection with. Each stores
-- birth details + a cached natal chart; synastry is computed against the
-- user's own chart. Owner-scoped RLS; service-role bypasses as elsewhere.
-- Idempotent / safe to re-run.

create table if not exists people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  relationship text,                 -- free text: "partner", "friend", "mother"…
  birth_date date not null,
  birth_time text,                   -- "HH:mm", null if unknown
  time_unknown boolean not null default false,
  birth_city text not null default '',
  birth_country text not null default '',
  latitude double precision not null,
  longitude double precision not null,
  timezone text not null,
  chart_data jsonb,                  -- cached natal chart (never changes)
  created_at timestamptz not null default now()
);

create index if not exists people_user_idx on people(user_id);

alter table people enable row level security;

drop policy if exists people_owner on people;
create policy people_owner on people
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

notify pgrst, 'reload schema';
