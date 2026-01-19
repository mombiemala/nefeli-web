-- Upgrade curator system to premium/editorial
-- Adds tiers, badges, collections, and enhanced image metadata

-- 1. Add curator tier and links to profiles
alter table public.profiles
  add column if not exists curator_tier text not null default 'contributor' 
    check (curator_tier in ('contributor', 'editor', 'verified_stylist', 'verified_astrologer')),
  add column if not exists curator_links jsonb not null default '{}'::jsonb;

-- 2. Create curator_collections table
create table if not exists public.curator_collections (
  id uuid primary key default gen_random_uuid(),
  curator_user_id uuid not null references public.profiles(user_id) on delete cascade,
  title text not null,
  description text,
  cover_image_path text,
  tags jsonb not null default '[]'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

-- 3. Update curator_images table with new fields
alter table public.curator_images
  add column if not exists collection_id uuid references public.curator_collections(id) on delete set null,
  add column if not exists intent text not null default 'everyday',
  add column if not exists occasion text,
  add column if not exists caption text,
  add column if not exists keywords jsonb not null default '[]'::jsonb;

-- 4. Create indexes
create index if not exists idx_curator_collections_curator_user_id on public.curator_collections(curator_user_id);
create index if not exists idx_curator_collections_published_at on public.curator_collections(published_at) where published_at is not null;
create index if not exists idx_curator_images_collection_id on public.curator_images(collection_id);
create index if not exists idx_curator_images_intent on public.curator_images(intent);
create index if not exists idx_curator_images_keywords on public.curator_images using gin(keywords);

-- 5. Enable RLS on curator_collections
alter table public.curator_collections enable row level security;

-- 6. RLS Policies for curator_collections

-- Readable by authenticated users when published
create policy "curator_collections_read_published"
  on public.curator_collections
  for select
  to authenticated
  using (published_at is not null);

-- Writable by curator_user_id if role=curator/admin and status=approved
create policy "curator_collections_insert_curator"
  on public.curator_collections
  for insert
  to authenticated
  with check (
    curator_user_id = auth.uid() and
    exists (
      select 1 from public.profiles
      where user_id = auth.uid() 
        and role in ('curator', 'admin')
        and curator_status = 'approved'
    )
  );

create policy "curator_collections_update_curator"
  on public.curator_collections
  for update
  to authenticated
  using (
    curator_user_id = auth.uid() and
    exists (
      select 1 from public.profiles
      where user_id = auth.uid() 
        and role in ('curator', 'admin')
        and curator_status = 'approved'
    )
  )
  with check (
    curator_user_id = auth.uid() and
    exists (
      select 1 from public.profiles
      where user_id = auth.uid() 
        and role in ('curator', 'admin')
        and curator_status = 'approved'
    )
  );

create policy "curator_collections_delete_curator"
  on public.curator_collections
  for delete
  to authenticated
  using (
    curator_user_id = auth.uid() and
    exists (
      select 1 from public.profiles
      where user_id = auth.uid() 
        and role in ('curator', 'admin')
        and curator_status = 'approved'
    )
  );

-- Admin can always write
create policy "curator_collections_admin_all"
  on public.curator_collections
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where user_id = auth.uid() and role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- 7. Update curator_images RLS to require approved status

-- Drop existing policies
drop policy if exists "curator_images_insert_curator" on public.curator_images;
drop policy if exists "curator_images_update_curator" on public.curator_images;
drop policy if exists "curator_images_delete_curator" on public.curator_images;

-- Recreate with approved status check
create policy "curator_images_insert_curator"
  on public.curator_images
  for insert
  to authenticated
  with check (
    curator_user_id = auth.uid() and
    exists (
      select 1 from public.profiles
      where user_id = auth.uid() 
        and role in ('curator', 'admin')
        and curator_status = 'approved'
    )
  );

create policy "curator_images_update_curator"
  on public.curator_images
  for update
  to authenticated
  using (
    curator_user_id = auth.uid() and
    exists (
      select 1 from public.profiles
      where user_id = auth.uid() 
        and role in ('curator', 'admin')
        and curator_status = 'approved'
    )
  )
  with check (
    curator_user_id = auth.uid() and
    exists (
      select 1 from public.profiles
      where user_id = auth.uid() 
        and role in ('curator', 'admin')
        and curator_status = 'approved'
    )
  );

create policy "curator_images_delete_curator"
  on public.curator_images
  for delete
  to authenticated
  using (
    curator_user_id = auth.uid() and
    exists (
      select 1 from public.profiles
      where user_id = auth.uid() 
        and role in ('curator', 'admin')
        and curator_status = 'approved'
    )
  );

-- Admin can always write
create policy "curator_images_admin_all"
  on public.curator_images
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where user_id = auth.uid() and role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- Reload PostgREST schema
notify pgrst, 'reload schema';

