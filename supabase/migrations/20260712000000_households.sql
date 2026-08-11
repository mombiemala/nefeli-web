-- NEFELI companion — households (group charts)
-- A named group of people (the user + saved people, adults or children) for
-- daily group weather and pairwise compatibility. Owner-scoped RLS.
-- Idempotent / safe to re-run.

create table if not exists households (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  include_self boolean not null default true,   -- is the account holder a member?
  created_at timestamptz not null default now()
);

create index if not exists households_user_idx on households(user_id);

-- Members are people rows (a child is just a person with birth details).
create table if not exists household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  person_id uuid not null references people(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (household_id, person_id)
);

create index if not exists household_members_hh_idx on household_members(household_id);

alter table households enable row level security;
alter table household_members enable row level security;

drop policy if exists households_owner on households;
create policy households_owner on households
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Membership rows are reachable only through a household the user owns.
drop policy if exists household_members_owner on household_members;
create policy household_members_owner on household_members
  for all to authenticated
  using (exists (select 1 from households h where h.id = household_id and h.user_id = auth.uid()))
  with check (exists (select 1 from households h where h.id = household_id and h.user_id = auth.uid()));

notify pgrst, 'reload schema';
