-- RLS policies for public.images and public.image_links
-- Fixes "new row violates row-level security policy" error

-- Enable RLS on tables if not already enabled
alter table public.images enable row level security;
alter table public.image_links enable row level security;

-- Drop existing policies if they exist (to allow re-running)
drop policy if exists "images_insert_own" on public.images;
drop policy if exists "images_select_visible" on public.images;
drop policy if exists "image_links_insert_own" on public.image_links;
drop policy if exists "image_links_select_visible" on public.image_links;

-- public.images: authenticated can INSERT rows only when created_by = auth.uid()
create policy "images_insert_own"
  on public.images
  for insert
  to authenticated
  with check (created_by = auth.uid());

-- public.images: authenticated can SELECT rows where visibility='public' OR created_by = auth.uid()
create policy "images_select_visible"
  on public.images
  for select
  to authenticated
  using (visibility = 'public' OR created_by = auth.uid());

-- public.image_links: authenticated can INSERT only when:
--   - the linked image belongs to auth.uid()
--   - AND any linked guidance/capsule/board belongs to auth.uid()
create policy "image_links_insert_own"
  on public.image_links
  for insert
  to authenticated
  with check (
    -- Image must belong to the user
    exists (
      select 1 from public.images
      where id = image_id and created_by = auth.uid()
    )
    AND (
      -- If linking to guidance, it must belong to the user
      (guidance_id is not null AND exists (
        select 1 from public.ai_guidance
        where id = guidance_id and user_id = auth.uid()
      ))
      OR
      -- If linking to capsule, it must belong to the user
      (capsule_id is not null AND exists (
        select 1 from public.capsules
        where id = capsule_id and user_id = auth.uid()
      ))
      OR
      -- If linking to board, it must belong to the user
      (board_id is not null AND exists (
        select 1 from public.boards
        where id = board_id and user_id = auth.uid()
      ))
      OR
      -- At least one link target must be provided
      (guidance_id is null AND capsule_id is null AND board_id is null)
    )
  );

-- public.image_links: authenticated can SELECT only when the linked image is visible to the user
create policy "image_links_select_visible"
  on public.image_links
  for select
  to authenticated
  using (
    exists (
      select 1 from public.images
      where id = image_id
        and (visibility = 'public' OR created_by = auth.uid())
    )
  );

-- Reload PostgREST schema
notify pgrst, 'reload schema';
