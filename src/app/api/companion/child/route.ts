import { NextResponse } from "next/server";
import { supabaseAdmin, getAuthedUserId } from "@/lib/supabase/admin";
import { loadCompanionContext } from "@/lib/companion/context";
import { transitingPositions } from "@/lib/astrology/transiting-positions";
import { synastryAspects, relationshipPlanets } from "@/lib/astrology/synastry";
import { complete } from "@/lib/astrology/prompt";
import type { NatalChart, AspectType } from "@/lib/astrology/types";

const DAY = 86_400_000;
const FAST = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"];

// Child-appropriate read of what a transiting body stirs — never romantic.
const HINT: Record<string, string> = {
  Sun: "confidence and being seen", Moon: "big feelings and comfort",
  Mercury: "words, curiosity, and focus", Venus: "connection and sweetness",
  Mars: "energy, drive, and frustration", Jupiter: "growth and enthusiasm",
  Saturn: "limits, patience, and lessons",
};
const quality = (t: AspectType) =>
  t === "conjunction" ? "heightened" : t === "trine" || t === "sextile" ? "easeful" : "stretching";

const DEFAULT_SYSTEM =
  "You are NEFELI, a warm, grounded astrology companion. Non-fatalistic, caring, plain-spoken.";

function ageFrom(dateISO: string): number | null {
  const b = new Date(dateISO);
  if (Number.isNaN(b.getTime())) return null;
  const now = new Date();
  let a = now.getUTCFullYear() - b.getUTCFullYear();
  const m = now.getUTCMonth() - b.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < b.getUTCDate())) a--;
  return a >= 0 && a < 130 ? a : null;
}

/** The most notable transit to the child's chart over the week ahead. */
function weekTransit(chart: NatalChart, now: Date) {
  const natal = relationshipPlanets(chart.planets ?? []);
  if (natal.length === 0) return null;
  let best: { transiting: string; natal: string; type: AspectType; hint: string; orb: number } | null = null;
  for (let d = 0; d < 7; d++) {
    const sky = transitingPositions(new Date(now.getTime() + d * DAY)).filter((p) => FAST.includes(p.name));
    for (const a of synastryAspects(sky, natal, 2)) {
      if (!best || a.orb < best.orb) {
        best = { transiting: a.a, natal: a.b, type: a.type, hint: `${quality(a.type)} ${HINT[a.a] ?? "shift"}`, orb: a.orb };
      }
    }
  }
  return best;
}

// POST { personId }: a warm, age-aware "parenting insight" — the child's
// temperament and how the week ahead may land for them, addressed to the parent.
export async function POST(req: Request) {
  try {
    const uid = await getAuthedUserId(req);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const personId = typeof body?.personId === "string" ? body.personId : null;
    if (!personId) return NextResponse.json({ error: "Provide personId" }, { status: 400 });

    const { data: person } = await supabaseAdmin
      .from("people")
      .select("name,relationship,birth_date,time_unknown,chart_data")
      .eq("user_id", uid).eq("id", personId).maybeSingle();
    if (!person?.chart_data) return NextResponse.json({ error: "No chart for that person." }, { status: 404 });

    const chart = person.chart_data as NatalChart;
    const age = ageFrom(person.birth_date as string);
    const rising = person.time_unknown ? null : chart.ascendantSign;

    const loaded = await loadCompanionContext(supabaseAdmin, uid);
    const system = loaded?.ctx.system ?? DEFAULT_SYSTEM;
    const parent = loaded?.profile.name ?? "you";

    const t = weekTransit(chart, new Date());
    const weekNote = t ? ` This week, transiting ${t.transiting} is ${t.type} their natal ${t.natal} (${t.hint}).` : "";
    const ageText = age != null ? `, age ${age}` : "";

    const reading = await complete(
      system,
      `${person.name} is ${parent}'s ${person.relationship || "child"}${ageText}. Their chart: Sun ${chart.sunSign}, Moon ${chart.moonSign}${rising ? `, Rising ${rising}` : ""}.${weekNote}

Write a warm "parenting insight" for ${parent} about ${person.name} — three short paragraphs, second person addressed to the parent, no headers:
1) ${person.name}'s core temperament and what they may especially need to feel secure, read through their Sun and Moon${rising ? " and Rising" : ""} — strengths-based and appropriate to their age.
2) How this week may land for them, and what to gently notice or support.
3) One small, concrete way ${parent} can show up for them this week.
Never romantic or predictive; never label, diagnose, or box the child in. Caring, practical, non-fatalistic — a temperament read, not a forecast of behavior.`,
      750,
    );

    return NextResponse.json({ ok: true, reading });
  } catch (e) {
    console.error("child reading error:", e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
