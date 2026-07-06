-- NEFELI × Luminary — astrology + memory schema (Supabase / Postgres)
-- Owner-scoped RLS via auth.uid(); admin/service-role bypasses as in NEFELI.
-- Run in the Supabase SQL editor or as a migration.

-- ── Enums ────────────────────────────────────────────────────
do $$ begin
  create type life_category as enum
    ('career','relationships','family','creative','health','spiritual','finances','other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type conversation_type as enum
    ('chart_reading','daily_guidance','transit_deep_dive','healing_session',
     'monthly_guide','life_context','daily_advice','open_chat');
exception when duplicate_object then null; end $$;

do $$ begin
  create type energy_level as enum ('high','medium','low','rest');
exception when duplicate_object then null; end $$;

do $$ begin
  create type insight_type as enum ('pattern','wound','strength','theme','transit_theme');
exception when duplicate_object then null; end $$;

-- ── Tables ───────────────────────────────────────────────────
create table if not exists birth_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  birth_date date not null,
  birth_time text,                 -- "HH:mm", null if unknown
  time_unknown boolean not null default false,
  birth_city text not null,
  birth_country text not null default '',
  latitude double precision not null,
  longitude double precision not null,
  timezone text not null,
  chart_data jsonb,                -- cached natal chart (never changes)
  chart_xml text,                  -- cached AI-context XML for prompts
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists life_contexts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category life_category not null,
  title text not null,
  description text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists declarations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  declaration text not null,
  context_note text,
  declared_at timestamptz not null default now(),
  is_active boolean not null default true
);

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New conversation',
  conversation_type conversation_type not null default 'open_chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table if not exists daily_guidance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  moon_sign text not null,
  moon_phase text not null,
  key_transits jsonb not null default '[]',
  guidance text not null,
  prompt text not null,
  style_note text,                 -- NEFELI: fashion×astrology cue
  energy_level energy_level not null default 'medium',
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

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

create table if not exists insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  insight_type insight_type not null default 'theme',
  title text not null,
  content text not null,
  source_conversation_id uuid references conversations(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Optional style bridge for the fashion×astrology fusion.
create table if not exists style_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  palette text[],
  sizing jsonb,
  intents text[],                  -- work/date/everyday/staples ...
  notes text,
  updated_at timestamptz not null default now()
);
-- Consider adding: alter table capsule_items add column astro_energy energy_level;

create index if not exists birth_profiles_user_idx on birth_profiles(user_id);
create index if not exists life_contexts_user_idx on life_contexts(user_id);
create index if not exists declarations_user_idx on declarations(user_id);
create index if not exists conversations_user_idx on conversations(user_id);
create index if not exists messages_conversation_idx on messages(conversation_id);
create index if not exists daily_guidance_user_idx on daily_guidance(user_id);
create index if not exists monthly_guides_user_idx on monthly_guides(user_id);
create index if not exists insights_user_idx on insights(user_id);

-- ── Row Level Security (owner-scoped) ────────────────────────
alter table birth_profiles enable row level security;
alter table life_contexts  enable row level security;
alter table declarations   enable row level security;
alter table conversations  enable row level security;
alter table messages       enable row level security;
alter table daily_guidance enable row level security;
alter table monthly_guides enable row level security;
alter table insights       enable row level security;
alter table style_profiles enable row level security;

-- Owner can do everything with their own rows.
do $$
declare t text;
begin
  foreach t in array array[
    'birth_profiles','life_contexts','declarations','conversations',
    'daily_guidance','monthly_guides','insights','style_profiles'
  ] loop
    execute format($f$
      create policy %1$s_owner on %1$I
        using (user_id = auth.uid())
        with check (user_id = auth.uid());
    $f$, t);
  end loop;
end $$;

-- Messages are owned transitively through their conversation.
create policy messages_owner on messages
  using (exists (select 1 from conversations c
                 where c.id = messages.conversation_id and c.user_id = auth.uid()))
  with check (exists (select 1 from conversations c
                 where c.id = messages.conversation_id and c.user_id = auth.uid()));
