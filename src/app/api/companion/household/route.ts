import { NextResponse } from "next/server";
import { supabaseAdmin, getAuthedUserId } from "@/lib/supabase/admin";
import { loadCompanionContext } from "@/lib/companion/context";
import { transitingPositions } from "@/lib/astrology/transiting-positions";
import { synastryAspects, relationshipPlanets, compatibilityScore } from "@/lib/astrology/synastry";
import { complete } from "@/lib/astrology/prompt";
import type { NatalChart, AspectType } from "@/lib/astrology/types";

const FAST = ["Sun", "Moon", "Mercury", "Venus", "Mars"];
const HINT: Record<string, string> = {
  Sun: "shared focus", Moon: "an emotional current", Mercury: "conversation",
  Venus: "warmth", Mars: "drive or friction",
};
const quality = (t: AspectType) =>
  t === "conjunction" ? "intensifying" : t === "trine" || t === "sextile" ? "flowing" : "testing";

interface Member {
  id: string; name: string; relationship: string | null; isSelf: boolean;
  birthDate: string; timeUnknown: boolean; age: number | null; chart: NatalChart;
}

function ageFrom(dateISO: string): number | null {
  const b = new Date(dateISO);
  if (Number.isNaN(b.getTime())) return null;
  const now = new Date();
  let a = now.getUTCFullYear() - b.getUTCFullYear();
  const m = now.getUTCMonth() - b.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < b.getUTCDate())) a--;
  return a >= 0 && a < 130 ? a : null;
}

async function loadHousehold(uid: string, id: string): Promise<{ name: string; members: Member[] } | null> {
  const { data: hh } = await supabaseAdmin
    .from("households").select("name,include_self").eq("user_id", uid).eq("id", id).maybeSingle();
  if (!hh) return null;

  const members: Member[] = [];
  if (hh.include_self) {
    const { data: p } = await supabaseAdmin
      .from("birth_profiles").select("name,birth_date,time_unknown,chart_data").eq("user_id", uid)
      .order("is_default", { ascending: false }).order("created_at", { ascending: true }).limit(1).maybeSingle();
    if (p?.chart_data) {
      members.push({ id: "self", name: p.name, relationship: "you", isSelf: true,
        birthDate: p.birth_date, timeUnknown: p.time_unknown, age: ageFrom(p.birth_date), chart: p.chart_data as NatalChart });
    }
  }

  const { data: rows } = await supabaseAdmin
    .from("household_members")
    .select("people(id,name,relationship,birth_date,time_unknown,chart_data)")
    .eq("household_id", id);
  for (const r of rows ?? []) {
    const p = r.people as unknown as { id: string; name: string; relationship: string | null; birth_date: string; time_unknown: boolean; chart_data: NatalChart | null };
    if (p?.chart_data) {
      members.push({ id: p.id, name: p.name, relationship: p.relationship, isSelf: false,
        birthDate: p.birth_date, timeUnknown: p.time_unknown, age: ageFrom(p.birth_date), chart: p.chart_data });
    }
  }
  return { name: hh.name, members };
}

function memberToday(chart: NatalChart, sky: { name: string; absoluteDegree: number }[]) {
  const aspects = synastryAspects(sky, relationshipPlanets(chart.planets ?? []), 3);
  const top = aspects[0];
  if (!top) return null;
  return { transiting: top.a, natal: top.b, type: top.type, hint: `${quality(top.type)} ${HINT[top.a] ?? "shift"}` };
}

// GET ?id → members (big-three + today) and the pairwise compatibility grid.
export async function GET(req: Request) {
  try {
    const uid = await getAuthedUserId(req);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const loaded = await loadHousehold(uid, id);
    if (!loaded) return NextResponse.json({ error: "Household not found." }, { status: 404 });

    const sky = transitingPositions(new Date()).filter((p) => FAST.includes(p.name));
    const members = loaded.members.map((m) => ({
      id: m.id, name: m.name, relationship: m.relationship, isSelf: m.isSelf, age: m.age,
      sunSign: m.chart.sunSign, moonSign: m.chart.moonSign,
      risingSign: m.timeUnknown ? null : m.chart.ascendantSign,
      today: memberToday(m.chart, sky),
    }));

    const matrix = [];
    for (let i = 0; i < loaded.members.length; i++) {
      for (let j = i + 1; j < loaded.members.length; j++) {
        const A = loaded.members[i], B = loaded.members[j];
        const asp = synastryAspects(relationshipPlanets(A.chart.planets ?? []), relationshipPlanets(B.chart.planets ?? []));
        matrix.push({ aId: A.id, bId: B.id, aName: A.name, bName: B.name, score: compatibilityScore(asp).score });
      }
    }

    return NextResponse.json({ ok: true, name: loaded.name, members, matrix });
  } catch (e) {
    console.error("household GET error:", e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

// POST ?id → a warm "household today" reading over everyone's charts + the sky.
export async function POST(req: Request) {
  try {
    const uid = await getAuthedUserId(req);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const loaded = await loadHousehold(uid, id);
    if (!loaded || loaded.members.length === 0) return NextResponse.json({ error: "Household not found." }, { status: 404 });

    const ctxLoad = await loadCompanionContext(supabaseAdmin, uid);
    if (!ctxLoad) return NextResponse.json({ error: "onboarding_required" }, { status: 400 });

    const sky = transitingPositions(new Date()).filter((p) => FAST.includes(p.name));
    const roster = loaded.members.map((m) => {
      const who = m.isSelf ? `${m.name} (you)` : `${m.name}${m.relationship ? `, ${m.relationship}` : ""}${m.age != null ? `, age ${m.age}` : ""}`;
      const t = memberToday(m.chart, sky);
      return `- ${who}: Sun ${m.chart.sunSign}, Moon ${m.chart.moonSign}${m.timeUnknown ? "" : `, Rising ${m.chart.ascendantSign}`}${t ? `; today ${t.transiting} ${t.type} their ${t.natal} (${t.hint})` : ""}`;
    }).join("\n");

    const reading = await complete(
      ctxLoad.ctx.system,
      `This is ${ctxLoad.profile.name}'s household "${loaded.name}". Members:\n${roster}\n
Write a warm "household today" read — 3 short paragraphs, second person addressed to ${ctxLoad.profile.name}, no headers. Cover the overall mood in the home today, what each person may especially need or be moving through (treat any children by age — temperament and needs, never romance), and one small way to tend the household today. Non-fatalistic, caring, practical.`,
      750,
    );

    return NextResponse.json({ ok: true, reading });
  } catch (e) {
    console.error("household POST error:", e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
