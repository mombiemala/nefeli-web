-- NEFELI companion — solar returns (the year ahead)
-- One cached solar-return chart + AI overview per user per solar year.
-- Owner-scoped RLS; service-role bypasses as elsewhere. Idempotent.

create table if not exists solar_returns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  year int not null,                 -- the solar-return year
  return_at timestamptz not null,    -- exact moment the Sun returned
  chart_data jsonb,                  -- the solar-return chart
  overview text not null,
  created_at timestamptz not null default now(),
  unique (user_id, year)
);

create index if not exists solar_returns_user_idx on solar_returns(user_id);

alter table solar_returns enable row level security;

drop policy if exists solar_returns_owner on solar_returns;
create policy solar_returns_owner on solar_returns
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

notify pgrst, 'reload schema';
