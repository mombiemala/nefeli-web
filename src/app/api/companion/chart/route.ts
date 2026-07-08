import { NextResponse } from "next/server";
import { supabaseAdmin, getAuthedUserId } from "@/lib/supabase/admin";
import { profileToSubject } from "@/lib/astrology/chart-utils";
import { generateBirthChart } from "@/lib/astrology/astrologer-api";

// Returns the user's cached natal chart (computed once at onboarding).
export async function GET(req: Request) {
  try {
    const uid = await getAuthedUserId(req);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabaseAdmin
      .from("birth_profiles").select("*")
      .eq("user_id", uid).order("is_default", { ascending: false })
      .limit(1).maybeSingle();
    if (!profile) return NextResponse.json({ error: "onboarding_required" }, { status: 400 });

    let chart = profile.chart_data;
    if (!chart) {
      const subject = profileToSubject({
        name: profile.name, birthDate: profile.birth_date, birthTime: profile.birth_time,
        timeUnknown: profile.time_unknown, birthCity: profile.birth_city,
        birthCountry: profile.birth_country, latitude: profile.latitude,
        longitude: profile.longitude, timezone: profile.timezone,
      });
      const res = await generateBirthChart(subject);
      chart = res.chart;
      await supabaseAdmin.from("birth_profiles").update({ chart_data: chart }).eq("id", profile.id);
    }

    return NextResponse.json({ ok: true, chart, name: profile.name });
  } catch (e) {
    console.error("API error:", e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
