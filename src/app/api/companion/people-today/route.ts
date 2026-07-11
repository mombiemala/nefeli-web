import { NextResponse } from "next/server";
import { supabaseAdmin, getAuthedUserId } from "@/lib/supabase/admin";
import { transitingPositions } from "@/lib/astrology/transiting-positions";
import { synastryAspects, relationshipPlanets } from "@/lib/astrology/synastry";
import { ASPECT_GLYPHS, PLANET_GLYPHS } from "@/lib/astrology/constants";
import type { NatalChart, AspectType } from "@/lib/astrology/types";

// Fast, relational transiting bodies — the ones that make a day feel different
// between two people (outer planets sit on a natal point for months).
const TRANSIT_SET = ["Sun", "Moon", "Mercury", "Venus", "Mars"];

const TRANSIT_HINT: Record<string, string> = {
  Sun: "shared focus", Moon: "an emotional current", Mercury: "conversation",
  Venus: "warmth and affection", Mars: "drive, spark, or friction",
};
function qualityHint(type: AspectType): string {
  if (type === "conjunction") return "intensifying";
  if (type === "trine" || type === "sextile") return "flowing";
  return "testing"; // square, opposition
}

// GET: today's tight transits from the sky to each of the user's people —
// a relationship-aware daily surface (no AI cost; links to People for depth).
export async function GET(req: Request) {
  try {
    const uid = await getAuthedUserId(req);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: people } = await supabaseAdmin
      .from("people").select("id,name,relationship,chart_data").eq("user_id", uid);
    if (!people || people.length === 0) return NextResponse.json({ ok: true, items: [] });

    const sky = transitingPositions(new Date()).filter((p) => TRANSIT_SET.includes(p.name));

    const items = [];
    for (const person of people) {
      const chart = person.chart_data as NatalChart | null;
      if (!chart?.planets) continue;
      const aspects = synastryAspects(sky, relationshipPlanets(chart.planets), 3);
      for (const a of aspects) {
        items.push({
          personId: person.id,
          name: person.name,
          relationship: person.relationship,
          transiting: a.a,
          natal: a.b,
          type: a.type,
          glyph: ASPECT_GLYPHS[a.type] ?? "",
          transitGlyph: PLANET_GLYPHS[a.a] ?? "",
          orb: a.orb,
          hint: `${qualityHint(a.type)} ${TRANSIT_HINT[a.a] ?? "connection"}`,
        });
      }
    }

    // Tightest, most exact aspects first; keep the day's few loudest notes.
    items.sort((x, y) => x.orb - y.orb);
    return NextResponse.json({ ok: true, items: items.slice(0, 4) });
  } catch (e) {
    console.error("people-today error:", e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
