-- Curator and moderation system migration
-- Adds curator roles, shared images, and feedback loops

-- 1. Update profiles table with curator fields
alter table public.profiles
  add column if not exists role text not null default 'user' check (role in ('user', 'curator', 'admin')),
  add column if not exists curator_status text not null default 'none' check (curator_status in ('none', 'applied', 'approved', 'rejected')),
  add column if not exists curator_bio text,
  add column if not exists curator_specialties jsonb not null default '[]'::jsonb,
  add column if not exists public_handle text unique;

-- 2. Create curator_images table
create table if not exists public.curator_images (
  id uuid primary key default gen_random_uuid(),
  curator_user_id uuid not null references public.profiles(user_id) on delete cascade,
  storage_path text not null,
  title text,
  tags jsonb not null default '[]'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

-- 3. Create advice_feedback table
create table if not exists public.advice_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day_key text not null,
  intent text not null,
  source text not null,
  rating smallint not null check (rating in (1, -1)),
  reasons jsonb not null default '[]'::jsonb,
  comment text,
  created_at timestamptz not null default now()
);

-- 4. Create image_feedback table
create table if not exists public.image_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  image_id uuid not null references public.curator_images(id) on delete cascade,
  feedback_type text not null check (feedback_type in ('save', 'like', 'dislike', 'report', 'matches_advice', 'more_like_this')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- 5. Create indexes for performance
create index if not exists idx_curator_images_curator_user_id on public.curator_images(curator_user_id);
create index if not exists idx_curator_images_published_at on public.curator_images(published_at) where published_at is not null;
create index if not exists idx_advice_feedback_user_id on public.advice_feedback(user_id);
create index if not exists idx_advice_feedback_day_key on public.advice_feedback(day_key, intent, source);
create index if not exists idx_image_feedback_user_id on public.image_feedback(user_id);
create index if not exists idx_image_feedback_image_id on public.image_feedback(image_id);

-- 6. RLS Policies

-- Enable RLS
alter table public.curator_images enable row level security;
alter table public.advice_feedback enable row level security;
alter table public.image_feedback enable row level security;

-- curator_images: readable by authenticated users ONLY when published_at is not null
create policy "curator_images_read_published"
  on public.curator_images
  for select
  to authenticated
  using (published_at is not null);

-- curator_images: writable only by curator_user_id if role=curator/admin
create policy "curator_images_insert_curator"
  on public.curator_images
  for insert
  to authenticated
  with check (
    curator_user_id = auth.uid() and
    exists (
      select 1 from public.profiles
      where user_id = auth.uid() and role in ('curator', 'admin')
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
      where user_id = auth.uid() and role in ('curator', 'admin')
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
      where user_id = auth.uid() and role in ('curator', 'admin')
    )
  );

-- advice_feedback: insertable by authenticated users for their own user_id
create policy "advice_feedback_insert_own"
  on public.advice_feedback
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- advice_feedback: readable only by owner + admin
create policy "advice_feedback_read_own_or_admin"
  on public.advice_feedback
  for select
  to authenticated
  using (
    user_id = auth.uid() or
    exists (
      select 1 from public.profiles
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- image_feedback: insertable by authenticated users for their own user_id
create policy "image_feedback_insert_own"
  on public.image_feedback
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- image_feedback: readable only by owner + admin
create policy "image_feedback_read_own_or_admin"
  on public.image_feedback
  for select
  to authenticated
  using (
    user_id = auth.uid() or
    exists (
      select 1 from public.profiles
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- Reload PostgREST schema
notify pgrst, 'reload schema';

