import { NextResponse } from "next/server";
import { supabaseAdmin, getAuthedUserId } from "@/lib/supabase/admin";
import { loadCompanionContext } from "@/lib/companion/context";
import { synastryAspects, relationshipPlanets } from "@/lib/astrology/synastry";
import { complete } from "@/lib/astrology/prompt";
import type { NatalChart } from "@/lib/astrology/types";

// POST { personId } → cross-aspects between the user's chart and that person's,
// plus a warm relationship reading in NEFELI's voice.
export async function POST(req: Request) {
  try {
    const uid = await getAuthedUserId(req);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const personId = String(body.personId || "");
    if (!personId) return NextResponse.json({ error: "personId is required" }, { status: 400 });

    const [{ data: person }, { data: profile }] = await Promise.all([
      supabaseAdmin.from("people").select("name,relationship,chart_data").eq("user_id", uid).eq("id", personId).maybeSingle(),
      supabaseAdmin.from("birth_profiles").select("name,chart_data").eq("user_id", uid)
        .order("is_default", { ascending: false }).order("created_at", { ascending: true }).limit(1).maybeSingle(),
    ]);
    if (!profile?.chart_data) return NextResponse.json({ error: "onboarding_required" }, { status: 400 });
    if (!person?.chart_data) return NextResponse.json({ error: "Person not found." }, { status: 404 });

    const userChart = profile.chart_data as NatalChart;
    const theirChart = person.chart_data as NatalChart;

    const aspects = synastryAspects(
      relationshipPlanets(userChart.planets ?? []),
      relationshipPlanets(theirChart.planets ?? []),
    ).slice(0, 12);

    const loaded = await loadCompanionContext(supabaseAdmin, uid);
    if (!loaded) return NextResponse.json({ error: "onboarding_required" }, { status: 400 });

    const aspectText = aspects.length
      ? aspects.map((a) => `your ${a.a} ${a.type} their ${a.b} (orb ${a.orb}°)`).join("; ")
      : "no tight cross-aspects between your personal planets";
    const rel = person.relationship ? ` (${person.relationship})` : "";

    const reading = await complete(
      loaded.ctx.system,
      `${loaded.profile.name} wants to understand their connection with ${person.name}${rel}.
Their signs — you: Sun ${userChart.sunSign}, Moon ${userChart.moonSign}, Rising ${userChart.ascendantSign}; them: Sun ${theirChart.sunSign}, Moon ${theirChart.moonSign}, Rising ${theirChart.ascendantSign}.
The synastry cross-aspects are: ${aspectText}.
Write a warm, honest relationship reading — 3 short paragraphs, second person, no headers. Cover the natural ease between you, the growth edges (name the harder aspects without doom), and one caring piece of guidance for tending this bond. Not fatalistic, not flattery. This applies to any relationship (love, friendship, family), so keep it about the human dynamic.`,
      700,
    );

    return NextResponse.json({ ok: true, aspects, reading, person: { name: person.name, relationship: person.relationship } });
  } catch (e) {
    console.error("synastry POST error:", e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
