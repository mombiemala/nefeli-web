# NEFELI — Product Pivot & Phase 1 Plan

Supersedes the fashion-forward framing. Read alongside `MARKET_RESEARCH.md`.

## The pivot

**NEFELI is a reflective astrology companion that helps you understand yourself
and move through your life — kindly, and remembering you.** Astrology is the
*language* that makes self-reflection feel structured and safe. **Fashion is
removed entirely.**

Why: the research proved demand and proved one gap hard (Co-Star is harsh →
people want to feel *seen and cared for*). It did **not** prove fashion or memory
as needs on their own. Users hire these apps to understand themselves, feel less
alone, reduce uncertainty, and have a gentle daily ritual. We lead with that job.

### The one change that makes it fill a need: broadcast → participatory
Competitors talk *at* you. NEFELI's daily loop is **two-way — it listens,
remembers, and reflects you back**:

> "How are you arriving today?" → the user shares a line → NEFELI responds
> *through* their chart + what they've said before → saves an insight.

Over a week the app visibly **knows them** ("Last Tuesday you were dreading the
review — how did it land?"). That is the "feeling seen" job, and it is what makes
memory a *felt* payoff instead of an unproven bet. Memory only matters if the app
takes input, not just emits.

### Needs → how we fill them

| User need (JTBD) | How NEFELI fills it |
|---|---|
| Understand myself / make sense of my life | Chart as language + a memory that accumulates and reflects patterns back |
| Feel seen, not alone | Warm voice + "I remember you said…" callbacks (the participatory loop) |
| Reduce anxiety / uncertainty | Non-fatalistic daily framing (Navigate / Rest), one small doable focus, never doom |
| A daily ritual / habit | The 60-second check-in — light, emotional, repeatable (the retention engine) |
| Support at hard moments | Guidance keyed to transits **and** their declared life context |

### Non-negotiables
- **Safety is a designed feature, not a disclaimer** — honor difficulty without
  doom, no medical/mental-health claims, a gentle crisis-resource fallback.
- **Positioning line:** *"An astrology companion that's actually kind — and
  remembers you."*

## Validate the bets cheaply (before over-building)
- 5–10 user conversations with Co-Star / The Pattern users: what they wish it did,
  why they quit.
- Instrument the two moments the research says decide everything: **Day-0** (did
  the welcome reading land?) and **Day-7** (did they return to the check-in?).

---

## Phase 1 — Companion Core (fashion-free)

Branch: `claude/companion-p1-memory-core`. Build green in **demo mode**
(`NEFELI_ASTRO_DEMO=true`, zero keys), commit per step, open a PR, pause for
review before Phase 2.

### A. Companion core
1. **Migration** — owner-scoped, idempotent RLS on: `birth_profiles`,
   `life_contexts`, `declarations`, `conversations`, `messages`, `insights`,
   `daily_guidance` (**no `style_note`**). *Omit `style_profiles` and
   `monthly_guides`* (monthly is Phase 2). Delivered as a repo migration + a
   SQL-editor bundle to run against the live project.
2. **Port the kit, fashion stripped** — copy `nefeli-kit/lib/astrology/*` →
   `src/lib/astrology`, `components/astrology/*` → `src/components/astrology`;
   fix imports to `@/lib/astrology`; add `@anthropic-ai/sdk`. Remove all fashion:
   `pickStyleNote` / `STYLE_NOTES`, the `styleProfile` param in `assembleContext`
   and `buildSystemPrompt`, and the wardrobe lines in the persona. Typecheck +
   build green in demo mode.
3. **Safety guardrails** in `buildSystemPrompt` (adjustment ②) — non-fatalistic,
   no medical/clinical claims, honor grief/ambivalence, crisis-resource fallback.
4. **Deepen onboarding → the Day-0 wow** (adjustment ④) — birth data (+ "I don't
   know my birth time"), 7-category life context, a healing focus, a declaration →
   write rows, cache `chart_xml` via `getBirthChartContext`, then generate a
   3-paragraph welcome reading via `complete()` that weaves chart + what they just
   shared. Treated as the make-or-break screen.
5. **Unify the chat** — replace `/api/nefeli/chat`'s prompt with
   `assembleContext().system`; stream via `streamChat` (tee to persist the
   assistant turn); persist to `conversations`/`messages`; "Remember this" →
   `insights`. `/ask` becomes a streaming companion thread (outfit cards gone).
6. **Today = daily guidance + the check-in loop** (adjustment ①) —
   `getTransits` + `getMoonPhase` → `deriveEnergyLevel` → `pickPrompt`; cache in
   `daily_guidance`; render energy badge + guidance + prompt. **Plus** the
   60-second check-in: a reflection prompt whose response runs through the
   assembled context and writes an `insight` (and optionally a `life_context`).
7. **Visible memory** (adjustment ③) — a light "what I remember" surface (recent
   insights + active life contexts + declarations) with "I remember you said…"
   callbacks, so memory is felt early, not deferred to Phase 2.

### B. Retire fashion (deliberate, non-destructive to data)
Fashion is removed from the product surface. In Phase 1 we remove the *surfaces*
but keep the underlying tables/data for now (drop in a later cleanup):
- Remove nav + pages: `boards`, `capsule*`, `explore`, `curator*`, `collections`,
  `curators/[handle]`, `dev/image-test`; drop `SaveToBoardModal`.
- Supersede: the outfit-JSON `/ask` chat (→ companion chat), the style "Today"
  (`ai_guidance` → `daily_guidance`), `feedback/image`, the Explore seed/admin
  scripts, the `curator-images` bucket usage.
- Rewrite landing/marketing copy from "astrology-backed style" to the companion
  positioning.
- Keep (chart plumbing reused): `chart/generate`, `chart/big4`, `natal_charts`,
  Supabase auth, RLS patterns, `getAuthedUserId`, the forgot-password flow.

*Data cleanup (dropping fashion tables/buckets) is a separate, later step so we
don't destabilize while the companion core proves out.*

### Verification
- Each step builds green in demo mode here; UX verified in a Vercel preview.
- Live keys (`ANTHROPIC_API_KEY`, `RAPIDAPI_KEY`, `OPENCAGE_API_KEY`) wired only
  when ready; demo mode stays working end-to-end for CI/preview.

## Phases 2–3 (after Phase 1 review)
- **P2:** Chart Explorer (`BirthChartSVG` + `AspectGrid` + per-placement
  readings) · Transit Tracker · Monthly Guide (`monthly_guides`) · Life-context /
  declarations / insights manager.
- **P3:** deepen the memory/pattern layer — pattern recognition across chart +
  life, gentle proactive nudges for major transits (opt-in, never anxiety-baiting),
  share/export. *(No fashion.)*
