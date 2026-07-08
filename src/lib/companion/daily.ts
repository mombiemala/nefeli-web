// Shared daily-guidance generation. Used by the Today route (on demand) and the
// daily cron (pre-warmed for everyone), so both produce identical rows.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AssembledContext } from "@/lib/astrology/assemble-context";
import type { BirthProfileRow } from "./context";
import { deriveEnergyLevel, ENERGY_LABEL, pickPrompt } from "@/lib/astrology/guidance-logic";
import { complete } from "@/lib/astrology/prompt";

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

export interface DailyGuidanceResult {
  row: Record<string, unknown>;
  created: boolean;
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

  const guidance = await complete(
    ctx.system,
    `Write ${profile.name}'s guidance for today (${date}). Two short paragraphs, second person, warm, no headers.
The felt energy today is "${ENERGY_LABEL[level]}". Weave in the moon and the strongest current transits, and connect them to what's alive in their life right now. Non-fatalistic — describe the weather, not fate. End on something grounding, not a task list.`,
  );

  const row = {
    user_id: uid,
    date,
    moon_sign: ctx.moon.moonSign,
    moon_phase: ctx.moon.phaseName,
    key_transits: keyTransits,
    guidance,
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
