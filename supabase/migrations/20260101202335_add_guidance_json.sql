-- Add guidance_json column to ai_guidance table
-- This column stores the full NEFELI guidance JSON structure
-- Backwards compatible: existing columns remain unchanged

alter table public.ai_guidance add column if not exists guidance_json jsonb;

-- Reload PostgREST schema to make the new column available via API
notify pgrst, 'reload schema';

