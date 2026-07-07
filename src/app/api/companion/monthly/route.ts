import { NextResponse } from "next/server";
import { supabaseAdmin, getAuthedUserId } from "@/lib/supabase/admin";
import { loadCompanionContext } from "@/lib/companion/context";
import { complete } from "@/lib/astrology/prompt";
import { errorMessage } from "@/lib/errors";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

// A monthly guide: overview + key lunations + major transits with a
// "for you specifically" reading each. Cached per user per month.
export async function POST(req: Request) {
  try {
    const uid = await getAuthedUserId(req);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const now = new Date();
    const month = Number(body.month) || now.getUTCMonth() + 1; // 1-12
    const year = Number(body.year) || now.getUTCFullYear();

    const { data: cached } = await supabaseAdmin
      .from("monthly_guides").select("*")
      .eq("user_id", uid).eq("month", month).eq("year", year).maybeSingle();
    if (cached) return NextResponse.json({ ok: true, cached: true, guide: cached });

    // Assemble context around mid-month so transits/moon reflect the period.
    const midMonth = new Date(Date.UTC(year, month - 1, 15));
    const loaded = await loadCompanionContext(supabaseAdmin, uid, midMonth);
    if (!loaded) return NextResponse.json({ error: "onboarding_required" }, { status: 400 });
    const { ctx, profile } = loaded;
    const monthName = MONTHS[month - 1];

    const overview = await complete(
      ctx.system,
      `Write ${profile.name}'s overview for ${monthName} ${year} — two short paragraphs, warm, second person. What themes this month holds for them specifically (tie to their chart, the season's transits, and what's alive in their life). Non-fatalistic. No headers.`,
    );

    const major = [...ctx.transits]
      .filter((t) => t.intensity >= 3)
      .sort((a, b) => b.intensity - a.intensity)
      .slice(0, 5);

    // "For you specifically" on the top 3 to keep generation bounded.
    const majorTransits = await Promise.all(
      major.map(async (t, i) => {
        let forYou: string | null = null;
        if (i < 3) {
          forYou = await complete(
            ctx.system,
            `In 2-3 sentences, what does ${t.transitingPlanet} ${t.aspect} ${t.natalPlanet} mean for ${profile.name} specifically this month — connected to their actual life? Warm, no jargon.`,
            300,
          );
        }
        return {
          label: `${t.transitingPlanet} ${t.aspect} ${t.natalPlanet}`,
          glyph: t.glyph, intensity: t.intensity, house: t.house,
          exactDate: t.exactDate, meaning: t.meaning, forYou,
        };
      }),
    );

    const moonPhases = [{
      moonSign: ctx.moon.moonSign,
      nextNewMoon: ctx.moon.nextNewMoon ?? null,
      nextFullMoon: ctx.moon.nextFullMoon ?? null,
    }];

    const row = {
      user_id: uid, month, year, overview,
      moon_phases: moonPhases, major_transits: majorTransits, daily_guides: [],
    };
    const { data: saved, error } = await supabaseAdmin
      .from("monthly_guides").insert(row).select("*").single();
    if (error) {
      const { data: existing } = await supabaseAdmin
        .from("monthly_guides").select("*").eq("user_id", uid).eq("month", month).eq("year", year).maybeSingle();
      if (existing) return NextResponse.json({ ok: true, cached: true, guide: existing });
      throw new Error(error.message);
    }
    return NextResponse.json({ ok: true, cached: false, guide: saved });
  } catch (e) {
    console.error("companion monthly error:", e);
    return NextResponse.json({ error: errorMessage(e) }, { status: 500 });
  }
}
