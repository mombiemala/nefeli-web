-- One gentle, optional "action" line generated alongside each day's guidance.
-- Nullable: older rows and LLM-unavailable placeholders simply have none.

alter table public.daily_guidance add column if not exists action text;
