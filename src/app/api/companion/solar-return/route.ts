import { NextResponse } from "next/server";
import { supabaseAdmin, getAuthedUserId } from "@/lib/supabase/admin";
import { loadCompanionContext } from "@/lib/companion/context";
import { birthToUTC } from "@/lib/astrology/astrocartography";
import { solarReturnMoment, currentSolarYear } from "@/lib/astrology/solar-return";
import { generateBirthChart, type BirthSubject } from "@/lib/astrology/astrologer-api";
import { complete } from "@/lib/astrology/prompt";
import type { NatalChart } from "@/lib/astrology/types";

function serialize(chart: NatalChart) {
  const at = (name: string) => chart.planets.find((p) => p.name === name);
  return {
    risingSign: chart.ascendantSign,
    sunSign: chart.sunSign,
    moonSign: chart.moonSign,
    sunHouse: at("Sun")?.house ?? null,
    moonHouse: at("Moon")?.house ?? null,
  };
}

// POST { year? } → the solar-return chart + AI overview for that solar year
// (defaults to the year currently in effect). Cached per user per year.
export async function POST(req: Request) {
  try {
    const uid = await getAuthedUserId(req);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabaseAdmin
      .from("birth_profiles")
      .select("name,birth_date,birth_time,time_unknown,timezone,latitude,longitude,birth_city,birth_country")
      .eq("user_id", uid)
      .order("is_default", { ascending: false }).order("created_at", { ascending: true })
      .limit(1).maybeSingle();
    if (!profile) return NextResponse.json({ error: "onboarding_required" }, { status: 400 });

    const natalUTC = birthToUTC(profile.birth_date, profile.birth_time || "12:00", profile.timezone);
    if (!natalUTC) return NextResponse.json({ error: "Invalid birth data." }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const rawYear = Number(body.year);
    const year = rawYear >= 1900 && rawYear <= 2200 ? rawYear : currentSolarYear(natalUTC, new Date());

    // Cache: one per user per solar year.
    const { data: cached } = await supabaseAdmin
      .from("solar_returns").select("*").eq("user_id", uid).eq("year", year).maybeSingle();
    if (cached) {
      return NextResponse.json({ ok: true, cached: true, year, returnAt: cached.return_at, overview: cached.overview, ...serialize(cached.chart_data as NatalChart) });
    }

    const srMoment = solarReturnMoment(natalUTC, year);
    if (!srMoment) return NextResponse.json({ error: "Could not compute your solar return." }, { status: 500 });

    // The SR chart is the sky at the return instant, cast to the birth place.
    const subject: BirthSubject = {
      name: profile.name,
      year: srMoment.getUTCFullYear(), month: srMoment.getUTCMonth() + 1, day: srMoment.getUTCDate(),
      hour: srMoment.getUTCHours(), minute: srMoment.getUTCMinutes(),
      city: profile.birth_city || "", nation: profile.birth_country || "",
      latitude: profile.latitude, longitude: profile.longitude,
      timezone: "UTC", timeUnknown: false,
    };
    const { chart } = await generateBirthChart(subject);
    const s = serialize(chart);

    const loaded = await loadCompanionContext(supabaseAdmin, uid);
    if (!loaded) return NextResponse.json({ error: "onboarding_required" }, { status: 400 });

    const overview = await complete(
      loaded.ctx.system,
      `Write ${profile.name}'s solar-return overview for their ${year}–${year + 1} year (the year that begins at their birthday).
Solar-return highlights — Rising: ${s.risingSign}; Sun in house ${s.sunHouse}; Moon in ${s.moonSign}${s.moonHouse ? ` (house ${s.moonHouse})` : ""}.
Write 3 short paragraphs, second person, warm, no headers: the overall theme/tone of this year for them, where their energy and focus are being drawn (tie the SR rising and Sun house to their real life), and one grounding invitation for the year. Non-fatalistic — a season's weather, not fate.`,
      700,
    );

    const { error: insErr } = await supabaseAdmin.from("solar_returns").insert({
      user_id: uid, year, return_at: srMoment.toISOString(), chart_data: chart, overview,
    });
    if (insErr && !/duplicate|unique/i.test(insErr.message)) throw new Error(insErr.message);

    return NextResponse.json({ ok: true, cached: false, year, returnAt: srMoment.toISOString(), overview, ...s });
  } catch (e) {
    console.error("solar-return error:", e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
