-- Enable Row Level Security on public.profiles.
--
-- ⚠️  REVIEW/TEST ON A STAGING (restored) DATABASE BEFORE APPLYING TO PRODUCTION.
--     profiles is read/written across several flows (own profile, public curator
--     pages, admin approval), and it holds privilege columns (role, curator_status,
--     curator_tier). Getting these policies wrong can break login/onboarding/admin.
--
-- Access patterns this migration preserves:
--   1. Own profile:      read/insert/update your own row.
--   2. Public curator:   anyone can read curator profiles that have a public handle
--                        (used by /curators/[handle]).
--   3. Admin:            admins can read every profile and update others (approve /
--                        reject curator applications).
--
-- Privilege protection: a BEFORE INSERT/UPDATE trigger prevents non-admins from
-- granting themselves role/tier or self-approving curator_status. Without this, a
-- self-update policy would let any user set role='admin'.

-- 1. Admin check as SECURITY DEFINER so it bypasses RLS and does NOT recurse when
--    referenced from policies/triggers on public.profiles itself.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

-- 2. Enable RLS
alter table public.profiles enable row level security;

-- 3. Policies (drop-then-create for idempotency)
drop policy if exists "profiles_select_own_public_or_admin" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own_or_admin" on public.profiles;

create policy "profiles_select_own_public_or_admin"
  on public.profiles
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or (role = 'curator' and public_handle is not null)
    or public.is_admin()
  );

create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "profiles_update_own_or_admin"
  on public.profiles
  for update
  to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- 4. Prevent non-admins from escalating privilege columns.
create or replace function public.enforce_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Admins may set anything.
  if public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- New self-created profiles are always plain users.
    new.role := 'user';
    new.curator_tier := coalesce(new.curator_tier, 'contributor');
    if new.curator_status is null or new.curator_status not in ('none', 'applied') then
      new.curator_status := 'none';
    end if;
  elsif tg_op = 'UPDATE' then
    -- Non-admins cannot change role or tier.
    new.role := old.role;
    new.curator_tier := old.curator_tier;
    -- curator_status may only advance to 'applied' (the apply flow). Any other
    -- self-initiated transition (e.g. self-approval) is reverted.
    if new.curator_status is distinct from old.curator_status
       and not (old.curator_status in ('none', 'rejected') and new.curator_status = 'applied') then
      new.curator_status := old.curator_status;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_profile_privileges on public.profiles;
create trigger enforce_profile_privileges
  before insert or update on public.profiles
  for each row execute function public.enforce_profile_privileges();

-- Reload PostgREST schema
notify pgrst, 'reload schema';
