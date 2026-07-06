# Paste-into-nefeli-web prompt

> Copy everything in the fenced block below into a Claude Code session running
> on the `mombiemala/nefeli-web` repository.

```
You are working in the nefeli-web repo (Next.js + TypeScript + Supabase, token
auth, Turbopack, deployed on Vercel at nefeli.kamalacreated.com). I want to
evolve NEFELI from a style-first app into a WHOLE-SELF COMPANION: it already has
astrology bones (chart/generate, chart/big4, a "Today" surface, a memory-aware
NEFELI chat) plus style features (capsule/boards, Explore editorial). I want to
fold in a deep astrology + persistent-memory engine so NEFELI reads the user's
LIFE (healing, career, relationships, creative practice) and their STYLE through
one chart-driven memory. Astrology is the connective tissue; fashion is one
expression of it — not the whole point.

There is a ready-made, framework-agnostic kit for this. Pull it from the public
Luminary repo (do not add it as a dependency — copy the files in):

  git clone --depth 1 --branch claude/luminary-astrology-app-2m8gzj \
    https://github.com/mombiemala/luminary /tmp/luminary
  # the kit is at /tmp/luminary/nefeli-kit/ ; also read:
  #   /tmp/luminary/docs/NEFELI_x_LUMINARY_VISION.md  (the full vision)
  #   /tmp/luminary/nefeli-kit/README.md              (per-file route mapping)

FIRST: read /tmp/luminary/nefeli-kit/README.md and the vision doc, then explore
this repo (src/lib, src/app/api, the chat + Today + chart routes, the Supabase
client + getAuthedUserId helper, existing tables) and give me a short plan before
writing code. Do NOT reintroduce Prisma or NextAuth — use NEFELI's existing
Supabase client, token auth (getAuthedUserId), and RLS patterns.

Then implement in phases, committing each and pausing for my review:

PHASE 1 — memory + companion core
1. Apply nefeli-kit/sql/001_astrology_schema.sql via a Supabase migration
   (birth_profiles, life_contexts, declarations, conversations, messages,
   daily_guidance, monthly_guides, insights, style_profiles) with owner-scoped
   RLS. Reconcile names with any existing NEFELI tables; don't duplicate.
2. Copy nefeli-kit/lib/astrology/* -> src/lib/astrology/ and
   nefeli-kit/components/astrology/* -> src/components/astrology/. Fix import
   paths / add an @/lib/astrology alias. It must type-check and run in DEMO MODE
   with zero API keys (set NEFELI_ASTRO_DEMO=true) before wiring real keys.
3. Deepen onboarding: birth data (with "I don't know my birth time"), life
   context across the 7 categories, a healing focus, and a declaration. On
   completion generate a 3-paragraph welcome reading via prompt.ts `complete()`
   that weaves chart + the life context they just shared.
4. Upgrade the existing NEFELI chat: replace its system prompt with
   `assembleContext({...}).system` (fetch the user's Supabase rows and pass them
   in — see the wiring example in the kit README) and stream with `streamChat`.
   Persist turns to conversations/messages. Add a "Remember this" -> insights.
5. Upgrade "Today": build daily guidance with getTransits + getMoonPhase ->
   deriveEnergyLevel -> pickPrompt + pickStyleNote; cache per day in
   daily_guidance; render an energy badge + guidance + prompt + STYLE NOTE.

PHASE 2 — depth surfaces
6. Chart explorer using <BirthChartSVG> + <AspectGrid>, with a per-placement
   Claude reading via `complete()`. Cache chart_data/chart_xml on birth_profiles.
7. Transit tracker (filter active/upcoming/intense, sort by intensity/date/house).
8. Monthly guide (sweep the month; "for you specifically" per major transit;
   day-by-day table with an energy/style column). Cache in monthly_guides.
9. Life-context manager + declarations + insights timeline.

PHASE 3 — NEFELI's unique fashion×astrology fusion
10. Add astro_energy to capsule items; "dress for the sky" filtering by the
    day's energy_level. Key Explore collections to the current sky + user transits.

CONSTRAINTS & QUALITY BAR
- Supabase + token auth + RLS only; every new table owner-scoped; admin/service-
  role writes follow NEFELI's existing pattern.
- Keep demo mode working end-to-end (great for preview/CI). Env for live data:
  ANTHROPIC_API_KEY, ANTHROPIC_MODEL=claude-sonnet-4-6, RAPIDAPI_KEY,
  RAPIDAPI_HOST=astrologer.p.rapidapi.com, OPENCAGE_API_KEY.
- Cache aggressively: natal chart once, daily guidance per day, monthly per month.
- Streaming chat via streamChat (tee the stream to persist the assistant message).
- Voice: warm, specific, emotionally intelligent; never generic, never toxic
  positivity; style is offered as an expression of the day's energy, never pushy.
- Match NEFELI's existing aesthetic; premium wellness feel.
- Work on a feature branch, commit per phase with clear messages, open a PR, and
  keep the app building green on Vercel. Verify each phase in demo mode before
  moving on. Show me the plan before Phase 1 and pause after each phase.
```
