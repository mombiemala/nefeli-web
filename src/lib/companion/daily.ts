// Shared daily-guidance generation. Used by the Today route (on demand) and the
// daily cron (pre-warmed for everyone), so both produce identical rows.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AssembledContext } from "@/lib/astrology/assemble-context";
import type { BirthProfileRow } from "./context";
import { deriveEnergyLevel, pickPrompt } from "@/lib/astrology/guidance-logic";
import { complete } from "@/lib/astrology/prompt";
import { cleanModelText, looksInvalid } from "@/lib/astrology/sanitize";

/** The calendar day (YYYY-MM-DD) in the user's own timezone. */
export function dayKeyFor(tz: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz || "UTC", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  return y && m && d ? `${y}-${m}-${d}` : new Date().toISOString().slice(0, 10);
}

/**
 * Split a generated reading into its body and its trailing "ACTION: ..." line.
 * Tolerant of the model omitting the marker (action → null, body → whole text).
 */
export function splitAction(raw: string): { body: string; action: string | null } {
  const text = (raw ?? "").trim();
  const m = text.match(/(^|\n)[ \t]*action[ \t]*:[ \t]*/i);
  if (!m || m.index === undefined) return { body: text, action: null };
  const body = text.slice(0, m.index).trim();
  const action = text
    .slice(m.index + m[0].length)
    .trim()
    .replace(/^["""']|["""']$/g, "")
    .trim();
  return { body: body || text, action: action || null };
}

export interface DailyGuidanceResult {
  row: Record<string, unknown>;
  created: boolean;
  /** True when `row` is the non-persisted fallback (LLM was unreachable); the
   *  client should poll for the real reading rather than requiring a reload. */
  pending?: boolean;
}

/**
 * Return today's guidance row for a user, generating and caching it if absent.
 * One row per (user_id, date); safe against concurrent callers.
 */
export async function ensureDailyGuidance(
  supabase: SupabaseClient,
  uid: string,
  ctx: AssembledContext,
  profile: BirthProfileRow,
): Promise<DailyGuidanceResult> {
  const date = dayKeyFor(profile.timezone);

  const { data: cached } = await supabase
    .from("daily_guidance").select("*")
    .eq("user_id", uid).eq("date", date).maybeSingle();
  if (cached) return { row: cached, created: false };

  const level = deriveEnergyLevel(ctx.transits);
  const prompt = pickPrompt(uid + date, level);
  const keyTransits = [...ctx.transits]
    .sort((a, b) => b.intensity - a.intensity)
    .slice(0, 3);

  // Today's check-in, if they left one — so the reading answers a person who
  // said "tired but steady," not a blank. (Stored as a "theme" insight.)
  let checkIn: string | null = null;
  try {
    const since = new Date(Date.now() - 20 * 3600 * 1000).toISOString();
    const { data: ci } = await supabase
      .from("insights").select("content")
      .eq("user_id", uid).eq("insight_type", "theme")
      .gte("created_at", since)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (ci?.content) checkIn = String(ci.content).slice(0, 240);
  } catch { /* non-fatal */ }

  // The single sharpest transit — not a survey.
  const top = keyTransits[0];
  const sharpest = top
    ? `transiting ${top.transitingPlanet} ${top.aspect} their natal ${top.natalPlanet}`
    : `the ${ctx.moon.moonSign} Moon`;

  let guidance: string;
  const action: string | null = null; // the Today reading ends on a noticing, not an appended task
  try {
    const raw = await complete(
      ctx.system,
      `Write ${profile.name}'s reading for today (${date}).

Open with something true about ${profile.name}'s own life — draw on what they've told you${checkIn ? `, and especially what they said in today's check-in: "${checkIn}"` : ""}. Only in the second sentence bring in the sharpest thing in their sky right now: ${sharpest}. Name one tension between their life and that placement. You may set it against at most one opposing pull in the sky if that genuinely sharpens the tension — but no third thing, and no survey of transits.

Three to five short sentences, second person, no headers. End on a noticing or a question, never a summary or reassurance. Do not write a sentence that would be true for a stranger.`,
      500,
    );
    // Keep only the final prose — never a leaked checklist/scaffolding — and
    // reject a non-reading so we fall back and retry rather than caching garbage.
    guidance = cleanModelText(raw);
    if (looksInvalid(guidance)) throw new Error("model returned scaffolding/invalid reading");
  } catch (e) {
    // LLM unreachable (rate-limited/overloaded). Don't cache a degraded reading —
    // return a warm, chart-based placeholder marked `pending` so the client polls
    // and swaps in the real reading as soon as the model is reachable.
    console.error("daily guidance generation failed:", e);
    const t = keyTransits[0];
    const placeholder =
      `Today the Moon moves through ${ctx.moon.moonSign}${ctx.moon.phaseName ? `, ${String(ctx.moon.phaseName).toLowerCase()}` : ""}. ` +
      (t ? `The sky's strongest note is ${t.transitingPlanet} ${t.aspect} your ${t.natalPlanet}. ` : "") +
      `Your reading is still coming — it'll appear here in a moment.`;
    return {
      row: {
        user_id: uid, date, moon_sign: ctx.moon.moonSign, moon_phase: ctx.moon.phaseName,
        key_transits: keyTransits, guidance: placeholder, action: null, prompt, energy_level: level.toLowerCase(),
      },
      created: false,
      pending: true,
    };
  }

  const row = {
    user_id: uid,
    date,
    moon_sign: ctx.moon.moonSign,
    moon_phase: ctx.moon.phaseName,
    key_transits: keyTransits,
    guidance,
    action,
    prompt,
    energy_level: level.toLowerCase(),
  };

  const { data: saved, error } = await supabase
    .from("daily_guidance").insert(row).select("*").single();
  if (error) {
    // Another caller raced us — return the row they wrote.
    const { data: existing } = await supabase
      .from("daily_guidance").select("*")
      .eq("user_id", uid).eq("date", date).maybeSingle();
    if (existing) return { row: existing, created: false };
    throw new Error(error.message);
  }
  return { row: saved, created: true };
}
