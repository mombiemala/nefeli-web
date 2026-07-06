# NEFELI Astrology Kit

A **portable, framework-agnostic** extraction of Luminary's astrology engine —
Prisma and NextAuth stripped out — ready to drop into `nefeli-web` (Next.js +
Supabase + token auth). Everything runs in **demo mode with zero API keys**, so
you can build and test before wiring RAPIDAPI / OPENCAGE / ANTHROPIC.

## What's inside

```
nefeli-kit/
  sql/001_astrology_schema.sql        Supabase tables + RLS (owner-scoped)
  lib/astrology/
    constants.ts        glyphs, signs, houses, aspects, keywords         (pure)
    types.ts            NatalChart, Transit, MoonPhaseData, …            (pure)
    demo-data.ts        seeded pseudo-ephemeris (zero-key charts)         (pure)
    astrologer-api.ts   Astrologer API client + demo fallback
    geocoding.ts        OpenCage client + demo fallback
    chart-utils.ts      profileToSubject, degrees, balances  (no Prisma)
    summarize.ts        life-context / declarations / insights condensers
    guidance-logic.ts   energy badge + prompt + style-note + moon notes  (pure)
    prompt.ts           Claude client, system-prompt builder, streaming
    assemble-context.ts one call → full system prompt (Supabase-agnostic)
    utils.ts            isDemoMode, seededPick, titleCase, toISODate
  components/astrology/
    BirthChartSVG.tsx   interactive SVG chart wheel (no chart lib)        (pure)
    AspectGrid.tsx      aspect matrix                                     (pure)
```

`(pure)` = no external deps beyond React/TS; copy as-is. The rest need only
`@anthropic-ai/sdk` (already implied by NEFELI's chat) and `fetch`.

## Install

1. Copy `nefeli-kit/lib/astrology/*` → `src/lib/astrology/` in nefeli-web.
2. Copy `nefeli-kit/components/astrology/*` → `src/components/astrology/`.
   (Fix the two relative import paths in the components to match your tree,
   or set a `@/lib/astrology` path alias.)
3. Run `sql/001_astrology_schema.sql` in Supabase (or as a migration).
4. Env: `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL=claude-sonnet-4-6`,
   `RAPIDAPI_KEY`, `RAPIDAPI_HOST=astrologer.p.rapidapi.com`,
   `OPENCAGE_API_KEY`. Omit them all to run in demo mode
   (`NEFELI_ASTRO_DEMO=true` also forces it).

## The one integration seam

`assembleContext()` is the bridge. **You** fetch the user's rows from Supabase
and hand them in; the kit calls the Astrologer API and returns the finished
Claude system prompt. No DB coupling inside the kit.

```ts
import { assembleContext } from "@/lib/astrology/assemble-context";
import { streamChat } from "@/lib/astrology/prompt";

// in your authed API route (getAuthedUserId(req) → uid):
const { data: profile } = await supabase.from("birth_profiles")
  .select("*").eq("user_id", uid).eq("is_default", true).single();
const { data: contexts } = await supabase.from("life_contexts")
  .select("*").eq("user_id", uid).eq("is_active", true);
const { data: decls } = await supabase.from("declarations")
  .select("*").eq("user_id", uid).eq("is_active", true);
const { data: insights } = await supabase.from("insights")
  .select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(5);
const { data: style } = await supabase.from("style_profiles")
  .select("*").eq("user_id", uid).maybeSingle();

const { system, moon, transits } = await assembleContext({
  profile: {
    name: profile.name, birthDate: profile.birth_date,
    birthTime: profile.birth_time, timeUnknown: profile.time_unknown,
    birthCity: profile.birth_city, birthCountry: profile.birth_country,
    latitude: profile.latitude, longitude: profile.longitude, timezone: profile.timezone,
  },
  cachedChartXml: profile.chart_xml,
  lifeContexts: (contexts ?? []).map(c => ({ category: c.category, title: c.title, description: c.description, isActive: c.is_active })),
  declarations: (decls ?? []).map(d => ({ declaration: d.declaration, contextNote: d.context_note, declaredAt: d.declared_at, isActive: d.is_active })),
  insights: (insights ?? []).map(i => ({ insightType: i.insight_type, title: i.title, content: i.content })),
  styleProfile: style ? `palette: ${style.palette?.join(", ")}; intents: ${style.intents?.join(", ")}; ${style.notes ?? ""}` : undefined,
  userName: profile.name,
});

// then stream Claude:
const body = await streamChat(system, [...history, { role: "user", content: message }]);
return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
```

## Map onto NEFELI's existing routes

| NEFELI today | Do this |
|---|---|
| `chart/generate`, `chart/big4` | Replace body with `generateBirthChart(subject)` + `getBirthChartContext(subject)`; cache `chart_data` + `chart_xml` on `birth_profiles`. |
| **"Today"** surface | Build daily guidance: `getTransits` + `getMoonPhase` → `deriveEnergyLevel` → `pickPrompt` + `pickStyleNote`; cache in `daily_guidance`. Render energy badge + guidance + prompt **+ style_note**. |
| **NEFELI chat** | Swap its system prompt for `assembleContext().system`; stream with `streamChat`. Persist to `conversations`/`messages`. Add a "Remember this" → `insights`. |
| Onboarding | Add life-context (7 categories) + a healing focus + a declaration; call `getBirthChartContext` and generate a 3-paragraph welcome with `complete()`. |
| Chart view | Drop in `<BirthChartSVG chart={…} onSelectPlanet={…} />` + `<AspectGrid aspects={…} />`; per-placement reading via `complete()`. |
| **NEW** Transit tracker | `getTransits(subject, when)` → filter/sort in the client (see Luminary's `TransitsClient`). |
| **NEW** Monthly guide | Sweep the month (`getMoonPhase`/`getTransits` per day) + `complete()` per major transit; cache in `monthly_guides`. |
| **NEW** Capsule × sky | Tag capsule items with `astro_energy`; filter by the day's `energy_level` for "dress for the sky." |

## Adaptation notes

- **Auth/DB:** use NEFELI's Supabase client + `getAuthedUserId(req)`; RLS already
  scopes rows to the owner. Don't reintroduce Prisma/NextAuth.
- **Streaming:** `streamChat` returns a `ReadableStream` — return it directly, or
  tee it to persist the assistant message (see Luminary's `app/api/ai/chat`).
- **Caching:** natal `chart_data`/`chart_xml` once (never changes); `daily_guidance`
  per day; `monthly_guides` per month.
- **Demo mode** keeps the whole surface working with no keys — great for CI/preview.

The original, fuller reference implementation (routes, more components, the
cron) lives in the Luminary repo this kit was extracted from.
