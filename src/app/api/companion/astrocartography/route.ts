import { NextResponse } from "next/server";
import { supabaseAdmin, getAuthedUserId } from "@/lib/supabase/admin";
import { loadCompanionContext } from "@/lib/companion/context";
import { computeAstroMap, linesNear, type BirthMoment } from "@/lib/astrology/astrocartography";
import { complete } from "@/lib/astrology/prompt";

async function birthMoment(uid: string): Promise<BirthMoment | null> {
  const { data: p } = await supabaseAdmin
    .from("birth_profiles")
    .select("birth_date,birth_time,time_unknown,timezone,latitude,longitude")
    .eq("user_id", uid)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!p) return null;
  return {
    date: p.birth_date,
    time: p.birth_time,
    timeUnknown: p.time_unknown,
    timezone: p.timezone,
    latitude: p.latitude,
    longitude: p.longitude,
  };
}

// GET: the user's full astrocartography map (all planetary lines).
export async function GET(req: Request) {
  try {
    const uid = await getAuthedUserId(req);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const birth = await birthMoment(uid);
    if (!birth) return NextResponse.json({ error: "onboarding_required" }, { status: 400 });

    const map = computeAstroMap(birth);
    return NextResponse.json({ ok: true, ...map, birthplace: { lat: birth.latitude, lon: birth.longitude } });
  } catch (e) {
    console.error("astrocartography GET error:", e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

// POST: a reading for a specific place — which lines run through it and what
// that activates for this person, in NEFELI's voice.
export async function POST(req: Request) {
  try {
    const uid = await getAuthedUserId(req);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const lat = Number(body.lat);
    const lon = Number(body.lon);
    const place = String(body.label || "this place").slice(0, 120);
    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      return NextResponse.json({ error: "A location is required." }, { status: 400 });
    }

    const birth = await birthMoment(uid);
    if (!birth) return NextResponse.json({ error: "onboarding_required" }, { status: 400 });

    const map = computeAstroMap(birth);
    if (map.timeUnknown) {
      return NextResponse.json({ error: "birth_time_required", nearby: [] }, { status: 400 });
    }
    const nearby = linesNear(map, lat, lon, 6);

    const loaded = await loadCompanionContext(supabaseAdmin, uid);
    if (!loaded) return NextResponse.json({ error: "onboarding_required" }, { status: 400 });

    const linesText = nearby.length
      ? nearby.map((n) => `${n.planet} ${n.angle} (orb ${n.orbDeg}°)`).join(", ")
      : "no strong planetary lines nearby";

    const reading = await complete(
      loaded.ctx.system,
      `${loaded.profile.name} is looking at ${place} on their astrocartography map. The planetary lines near there are: ${linesText}.
Write 2 short warm paragraphs (second person, no headers) on what this place tends to activate for them — tie the planet/angle meanings to their actual chart and life. If there are no strong lines, say honestly that it's an astrologically quiet place for them and what that can mean. Non-fatalistic: describe the energy of a place, never "you must move here."`,
      500,
    );

    return NextResponse.json({ ok: true, nearby, reading });
  } catch (e) {
    console.error("astrocartography POST error:", e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
