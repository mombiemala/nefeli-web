-- NEFELI companion — monthly guides (Phase 2). Owner-scoped, idempotent.
create table if not exists monthly_guides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month int not null,
  year int not null,
  overview text not null,
  moon_phases jsonb not null default '[]',
  major_transits jsonb not null default '[]',
  daily_guides jsonb not null default '[]',
  created_at timestamptz not null default now(),
  unique (user_id, month, year)
);

create index if not exists monthly_guides_user_idx on monthly_guides(user_id);

alter table monthly_guides enable row level security;
drop policy if exists monthly_guides_owner on monthly_guides;
create policy monthly_guides_owner on monthly_guides
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

notify pgrst, 'reload schema';
