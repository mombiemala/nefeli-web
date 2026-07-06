# NEFELI × Luminary — Consolidated Vision

**Paste this into the `nefeli-web` project as the north-star brief for folding
Luminary's deep-astrology companion into NEFELI.**

---

## 0. The north star

NEFELI becomes a **whole-self companion** — an app that knows your birth chart,
your life story, and your style, and interprets *everything* through that single
lens: what's happening in the sky, what you're healing, what to create, when to
rest, and yes, what to wear. Astrology is the **connective tissue**; fashion is
one beautiful expression of a deeper self-knowledge engine — not the whole point.

Today NEFELI is style-first with astrology bones (`chart/generate`, `chart/big4`,
a "Today" surface, a memory-aware chat). Luminary is astrology-first with deep
life integration (persistent memory of your healing journey, transits read
through your actual life, monthly guides, declarations). **Consolidated, NEFELI
becomes the most emotionally intelligent personal companion that exists** — it
dresses you *and* knows you.

> The test for every screen: does it connect the sky to *this person's actual
> life* — their healing, their work, their relationships, their creative
> practice — and only then, their style? If it's generic, it's not NEFELI.

---

## 1. What changes: from a style app to a whole-self companion

| Today (NEFELI) | Consolidated (NEFELI × Luminary) |
|---|---|
| Style/capsule + light astrology | One companion that reads life *and* style through the chart |
| "Today" = outfit/style prompt | "Today" = energy + transits + guidance **+** how to dress/move with it |
| Chat with memory of preferences | Chat with memory of your **whole life**: healing, career, family, creative work, declarations |
| Chart = big-four snapshot | Full interactive chart explorer + live transit tracker + monthly guide |
| Fashion is the subject | Fashion is one *output* of self-knowledge; astrology is the engine |

The wardrobe doesn't go away — it gets **deeper**. A capsule recommendation
becomes "dress for the energy of this transit"; an Explore collection becomes
"imagery for a Full Moon in your 10th house week." Style becomes *meaningful*.

---

## 2. The core differentiator (keep this sacred)

**Persistent memory + chart + life context, applied across every surface.**

Every existing astrology/style app forgets what you told it. NEFELI remembers:
the toxic family pattern you declared freedom from last month, the job search
while caregiving, the paintings you're trying to finish — and interprets every
transit, every daily guidance, every outfit suggestion through *that*. This is
the moat. Build the memory layer first; everything else hangs off it.

---

## 3. How astrology threads through *everything* (incl. fashion)

- **Today** → moon sign/phase + energy badge (Power Day / Navigate / Move Gently
  / Rest) + 3 key transits + a personal paragraph + a prompt **+** a style note
  ("armor colors for a Mars-square day" / "soft layers for a Cancer moon").
- **Capsule / boards** → outfits tagged by *energy and intent* (work/date/
  everyday/staples) get an astrological overlay: what the season, moon, and your
  transits invite you to embody. "Dressing for the chart," not just the weather.
- **Explore (editorial)** → collections keyed to the current sky and the user's
  transits (New Moon intentions, Venus-return softness, Saturn-return structure).
- **Chat** → one companion, one memory, fluidly moving from "what does my chart
  say about this grief" to "so what do I wear to the interview Thursday."
- **Chart explorer / transits / monthly guide** → the depth layer for people who
  want to go in.

---

## 4. Consolidated feature set

**Keep from NEFELI:** Supabase auth + RLS, admin/curator tooling, Explore
editorial + curator collections, capsule/boards, the "Today" surface, the chat
shell, `chart/generate` + `chart/big4`, the brand + `nefeli.kamalacreated.com`.

**Add from Luminary (adapted to NEFELI's stack):**

1. **Onboarding depth** — birth data (with "I don't know my birth time"
   handling) **+** life-context capture across 7 categories (Career, Relationships,
   Family, Creative, Health/Healing, Financial, Spiritual) **+** a healing focus
   **+** a declaration/intention. End with a personalized 3-paragraph welcome
   reading that weaves chart + the life context they just shared.
2. **Birth Chart Explorer** — interactive SVG chart wheel, planet table, aspect
   grid, big-three + elemental balance, and a per-planet slide-over with a
   Claude reading of *how that placement lives in this person's actual life*.
3. **Today's Guidance (upgraded)** — moon + energy badge + key transits +
   personal paragraph + prompt + **style note**, cached per day.
4. **Companion Chat (unified memory)** — one chat with the full context injected:
   chart, live transits, moon phase, life context, declarations, recent insights,
   **and** style profile. Streaming. "Remember this" saves insights.
5. **Transit Tracker** — all current transits, filter (active/upcoming/intense),
   sort (intensity/date/house), each with an intensity rating + "explore in chat."
6. **Monthly Guide** — overview, moon phases, major-transits accordion with a
   "for you specifically" section per event, day-by-day table (with a style/energy
   column that ties back to the capsule).
7. **Life Context Manager + Declarations** — add/archive life entries, a
   declarations tracker, and an insights timeline. This is the memory users can see.

---

## 5. Unified data model (add to NEFELI's Supabase — SQL/RLS, not Prisma)

Add these tables (snake_case, `auth.uid()`-scoped RLS, service-role for admin):

- `birth_profiles` — name, birth_date, birth_time (nullable), time_unknown,
  city, country, lat, lng, timezone, chart_data (jsonb), chart_xml (text), default flag.
- `life_contexts` — category (enum), title, description, is_active. *(the memory)*
- `declarations` — declaration, context_note, declared_at, is_active.
- `conversations` / `messages` — conversation_type enum, role, content, metadata (jsonb).
- `daily_guidance` — date, moon_sign, moon_phase, key_transits (jsonb), guidance,
  prompt, energy_level enum, **style_note**. Unique per (user, date).
- `monthly_guides` — month, year, overview, moon_phases (jsonb), major_transits
  (jsonb), daily_guides (jsonb). Unique per (user, month, year).
- `insights` — insight_type enum (pattern/wound/strength/theme/transit_theme),
  title, content, source_conversation_id.
- **Style bridge:** add `style_profile` (preferences, palette, sizing, intents)
  and a nullable `astro_energy` tag on capsule/board items so outfits can be
  filtered by transit/energy.

Every table RLS-scoped to the owner; admin/curator writes via service-role
(matching NEFELI's existing pattern).

---

## 6. AI / system-prompt architecture (the heart)

Every Claude call assembles a dynamic system prompt from:

```
NEFELI persona (warm, emotionally intelligent, non-bypassing, specific-not-generic)
+ NATAL CHART (AI-context XML from Astrologer API /context/birth-chart)
+ CURRENT TRANSITS (/context/transit)
+ MOON PHASE
+ LIFE CONTEXT SUMMARY  (condensed < 500 tokens)
+ ACTIVE DECLARATIONS
+ RECENT INSIGHTS (last 5)
+ STYLE PROFILE (palette, intents, capsule)   ← NEFELI's addition
+ TODAY'S DATE + USER LOCATION
```

One assembled context powers Today, chat, per-placement readings, daily and
monthly generation. Model: **claude-sonnet-4-6**, streaming for chat. Keep the
life-context section summarized, not raw-dumped.

---

## 7. Tech adaptation notes (NEFELI stack ≠ Luminary stack)

Luminary was built on **Prisma + NextAuth**; NEFELI is **Supabase + token auth**.
So this is an *adaptation*, not a copy-paste:

- **Auth/DB:** use NEFELI's Supabase client + RLS + `getAuthedUserId(req)` token
  verification. Do **not** introduce Prisma/NextAuth.
- **Reusable, framework-agnostic logic to port from the Luminary repo:**
  - `lib/astrologer-api.ts` — Astrologer API client (birth chart, transits,
    moon phase, AI-context XML) **with a deterministic zero-key demo fallback**.
  - `lib/demo-data.ts` — seeded pseudo-ephemeris so everything runs without keys.
  - `lib/chart-utils.ts` + `lib/astrology-constants.ts` — glyphs, signs, houses,
    aspects, formatting, element/modality balance.
  - `lib/claude.ts` + `lib/context-builder.ts` — the system-prompt builder and
    the life-context/declaration/insight summarizers.
  - `lib/guidance-generator.ts` + `lib/monthly-generator.ts` — daily energy-badge
    logic and the monthly sweep.
  - `components/chart/BirthChartSVG.tsx` — the pure-SVG interactive chart wheel
    (no external chart lib), plus `PlanetDetail` and `AspectGrid`.
- **Keep demo mode** — it lets the whole experience run with zero API keys, which
  is invaluable for building/testing before wiring RAPIDAPI/OPENCAGE/ANTHROPIC.
- **Geocoding:** OpenCage (with the demo fallback) for birth-city → lat/lng/tz.
- **Cron:** daily guidance pre-generation (NEFELI already deploys on Vercel).

---

## 8. UX / brand direction

Marry NEFELI's editorial elegance with Luminary's warmth:
- Dark, premium, gold + warm-cream accents; serif headings, clean sans body;
  subtle celestial/constellation touches (CSS only). Glass-morphism cards.
- Feels like a **premium wellness companion**, not a carnival horoscope app.
- Astrology shows up as *insight woven into plain, caring language*, never a
  jargon dump. Celebrate wins as astrologically significant; honor grief and
  ambivalence without toxic positivity.

---

## 9. Implementation order

**Phase 1 — the memory + companion core**
1. Add the data model (birth_profiles, life_contexts, declarations, conversations,
   messages, insights) + RLS.
2. Deepen onboarding (birth data + life context + declaration + welcome reading).
3. Port the Astrologer client + demo mode + context/system-prompt builder.
4. Upgrade the existing NEFELI chat to inject the full assembled context.
5. Upgrade "Today" to the full daily guidance (+ style note).

**Phase 2 — depth surfaces**
6. Birth Chart Explorer (SVG wheel + per-placement Claude readings).
7. Transit Tracker. 8. Monthly Guide. 9. Life Context Manager + insights timeline.

**Phase 3 — the fashion×astrology fusion (NEFELI's unique magic)**
10. Tag capsule/boards by energy/transit; "dress for the sky" recommendations.
11. Explore collections keyed to the current sky + the user's transits.
12. Pattern recognition, push notifications for major transits, PDF/share export.

---

## 10. One-paragraph pitch (for the top of a PR / README)

> NEFELI is a whole-self companion. It knows your birth chart, your life story,
> and your style — and reads every planetary moment through the lens of *your*
> healing, work, relationships, and creative practice. It remembers what you told
> it last month and connects it to what the sky is doing today, then helps you
> move through it: what to focus on, what to release, what to create, when to
> rest — and how to dress for the energy you're carrying. Not a horoscope. Not
> just a wardrobe. The most emotionally intelligent personal companion there is.
