-- Track when the user last connected with a saved person, so relationship
-- nudges can factor in recency ("it's been a while") rather than timing alone.
-- Nullable: null means "not logged yet", never treated as overdue.

alter table public.people add column if not exists last_contact_at timestamptz;
