import { NextResponse } from "next/server";
import { supabaseAdmin, getAuthedUserId } from "@/lib/supabase/admin";
import { profileToSubject } from "@/lib/astrology/chart-utils";
import { getTransits } from "@/lib/astrology/astrologer-api";

// The user's current transits (activations of their natal chart).
export async function GET(req: Request) {
  try {
    const uid = await getAuthedUserId(req);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabaseAdmin
      .from("birth_profiles").select("*")
      .eq("user_id", uid).order("is_default", { ascending: false })
      .limit(1).maybeSingle();
    if (!profile) return NextResponse.json({ error: "onboarding_required" }, { status: 400 });

    const subject = profileToSubject({
      name: profile.name, birthDate: profile.birth_date, birthTime: profile.birth_time,
      timeUnknown: profile.time_unknown, birthCity: profile.birth_city,
      birthCountry: profile.birth_country, latitude: profile.latitude,
      longitude: profile.longitude, timezone: profile.timezone,
    });

    const transits = await getTransits(subject, new Date());
    return NextResponse.json({ ok: true, transits });
  } catch (e) {
    console.error("API error:", e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
