-- Enable Row Level Security on the core per-user tables.
--
-- Background: our /api routes use the service-role key (which bypasses RLS), but
-- the browser also queries these tables directly with the anon key. Without RLS,
-- any authenticated user could read or modify another user's rows directly. These
-- policies scope every row to its owner (user_id = auth.uid()).
--
-- All access to these tables in the app is authenticated and own-scoped, so
-- owner-only policies do not change app behaviour — they only close the hole.
--
-- Idempotent: safe to re-run.

-- Helper note: server (service_role) bypasses RLS entirely, so the API routes
-- that legitimately act across users (via a verified token) are unaffected.

do $$
declare
  t text;
begin
  foreach t in array array[
    'ai_guidance',
    'capsules',
    'boards',
    'board_items',
    'natal_charts'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);

    execute format('drop policy if exists %I on public.%I;', t || '_select_own', t);
    execute format('drop policy if exists %I on public.%I;', t || '_insert_own', t);
    execute format('drop policy if exists %I on public.%I;', t || '_update_own', t);
    execute format('drop policy if exists %I on public.%I;', t || '_delete_own', t);

    execute format(
      'create policy %I on public.%I for select to authenticated using (user_id = auth.uid());',
      t || '_select_own', t
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (user_id = auth.uid());',
      t || '_insert_own', t
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());',
      t || '_update_own', t
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using (user_id = auth.uid());',
      t || '_delete_own', t
    );
  end loop;
end $$;

-- Reload PostgREST schema
notify pgrst, 'reload schema';
