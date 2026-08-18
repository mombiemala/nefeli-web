import { NextResponse } from "next/server";
import { supabaseAdmin, getAuthedUserId } from "@/lib/supabase/admin";
import { energyTargets, energyCalendar, bestWindows, dayEnergy, type Intention } from "@/lib/astrology/energy";
import type { NatalChart } from "@/lib/astrology/types";

async function natalTargets(uid: string) {
  const { data: p } = await supabaseAdmin
    .from("birth_profiles").select("chart_data").eq("user_id", uid)
    .order("is_default", { ascending: false }).order("created_at", { ascending: true })
    .limit(1).maybeSingle();
  if (!p?.chart_data) return null;
  return energyTargets((p.chart_data as NatalChart).planets ?? []);
}

const VALID: Intention[] = ["general", "love", "career", "rest", "social", "growth"];

// GET: the next 30 days of overall energy + today's supportive/challenging pull.
export async function GET(req: Request) {
  try {
    const uid = await getAuthedUserId(req);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const natal = await natalTargets(uid);
    if (!natal) return NextResponse.json({ error: "onboarding_required" }, { status: 400 });

    const now = new Date();
    const calendar = energyCalendar(natal, now, 30, "general");
    const today = dayEnergy(natal, now, "general");
    return NextResponse.json({ ok: true, calendar, today });
  } catch (e) {
    console.error("energy GET error:", e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

// POST { intention, days? } → energy curve + best windows for an intention.
export async function POST(req: Request) {
  try {
    const uid = await getAuthedUserId(req);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const natal = await natalTargets(uid);
    if (!natal) return NextResponse.json({ error: "onboarding_required" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const intention: Intention = VALID.includes(body.intention) ? body.intention : "general";
    const days = Math.min(90, Math.max(7, Number(body.days) || 30));

    const now = new Date();
    const calendar = energyCalendar(natal, now, days, intention);
    const windows = bestWindows(natal, now, days, intention, 5);
    return NextResponse.json({ ok: true, intention, calendar, windows });
  } catch (e) {
    console.error("energy POST error:", e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
