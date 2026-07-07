import { NextResponse } from "next/server";
import { supabaseAdmin, getAuthedUserId } from "@/lib/supabase/admin";
import { loadCompanionContext } from "@/lib/companion/context";
import { deriveEnergyLevel, ENERGY_LABEL, pickPrompt } from "@/lib/astrology/guidance-logic";
import { complete } from "@/lib/astrology/prompt";
import { errorMessage } from "@/lib/errors";

function dayKeyFor(tz: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz || "UTC", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  return y && m && d ? `${y}-${m}-${d}` : new Date().toISOString().slice(0, 10);
}

export async function POST(req: Request) {
  try {
    const uid = await getAuthedUserId(req);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const loaded = await loadCompanionContext(supabaseAdmin, uid);
    if (!loaded) return NextResponse.json({ error: "onboarding_required" }, { status: 400 });

    const { ctx, profile } = loaded;
    const date = dayKeyFor(profile.timezone);

    // Cache: one guidance per user per day.
    const { data: cached } = await supabaseAdmin
      .from("daily_guidance").select("*")
      .eq("user_id", uid).eq("date", date).maybeSingle();
    if (cached) {
      return NextResponse.json({ ok: true, cached: true, guidance: cached });
    }

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

    const { data: saved, error } = await supabaseAdmin
      .from("daily_guidance").insert(row).select("*").single();
    if (error) {
      // If another request raced us, return the existing row.
      const { data: existing } = await supabaseAdmin
        .from("daily_guidance").select("*").eq("user_id", uid).eq("date", date).maybeSingle();
      if (existing) return NextResponse.json({ ok: true, cached: true, guidance: existing });
      throw new Error(error.message);
    }

    return NextResponse.json({ ok: true, cached: false, guidance: saved });
  } catch (e) {
    console.error("companion today error:", e);
    return NextResponse.json({ error: errorMessage(e) }, { status: 500 });
  }
}
