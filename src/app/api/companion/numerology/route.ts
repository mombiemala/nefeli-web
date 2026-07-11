import { NextResponse } from "next/server";
import { supabaseAdmin, getAuthedUserId } from "@/lib/supabase/admin";
import { loadCompanionContext } from "@/lib/companion/context";
import { computeNumerology, lifePath, birthdayNumber } from "@/lib/numerology";
import { complete } from "@/lib/astrology/prompt";

async function birthDate(uid: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("birth_profiles").select("birth_date").eq("user_id", uid)
    .order("is_default", { ascending: false }).order("created_at", { ascending: true })
    .limit(1).maybeSingle();
  return data?.birth_date ?? null;
}

// GET: the numbers derivable from the birth date alone (instant, no AI).
export async function GET(req: Request) {
  try {
    const uid = await getAuthedUserId(req);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const date = await birthDate(uid);
    if (!date) return NextResponse.json({ error: "onboarding_required" }, { status: 400 });

    return NextResponse.json({ ok: true, lifePath: lifePath(date), birthday: birthdayNumber(date) });
  } catch (e) {
    console.error("numerology GET error:", e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

// POST { fullName } → all core numbers + a reading weaving them with the chart.
export async function POST(req: Request) {
  try {
    const uid = await getAuthedUserId(req);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const date = await birthDate(uid);
    if (!date) return NextResponse.json({ error: "onboarding_required" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const fullName = String(body.fullName || "").slice(0, 120);

    const core = computeNumerology(date, fullName || undefined);

    const loaded = await loadCompanionContext(supabaseAdmin, uid);
    if (!loaded) return NextResponse.json({ error: "onboarding_required" }, { status: 400 });

    const parts = [`Life Path ${core.lifePath}`, `Birthday ${core.birthday}`];
    if (core.expression) parts.push(`Expression ${core.expression}`, `Soul Urge ${core.soulUrge}`, `Personality ${core.personality}`);

    const reading = await complete(
      loaded.ctx.system,
      `${loaded.profile.name}'s numerology: ${parts.join(", ")}.
Write 2 short warm paragraphs (second person, no headers) reading these numbers together — what their Life Path asks of them${core.expression ? " and how their Expression/Soul Urge nuance it" : ""}. Where it rhymes with their astrology (name the resonance honestly, don't force it). Numerology as one more mirror, not fate.`,
      500,
    );

    return NextResponse.json({ ok: true, ...core, reading });
  } catch (e) {
    console.error("numerology POST error:", e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
