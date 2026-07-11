import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { loadCompanionContext } from "@/lib/companion/context";
import { ensureDailyGuidance, dayKeyFor } from "@/lib/companion/daily";
import { complete } from "@/lib/astrology/prompt";
import { emailEnabled, sendEmail } from "@/lib/notify/email";
import { transitingPositions } from "@/lib/astrology/transiting-positions";
import { synastryAspects, relationshipPlanets } from "@/lib/astrology/synastry";
import type { AssembledContext } from "@/lib/astrology/assemble-context";
import type { BirthProfileRow } from "@/lib/companion/context";
import type { NatalChart } from "@/lib/astrology/types";

// Daily cron: pre-warm each onboarded user's guidance and, when notable,
// write proactive "nudge" notifications — one about a transit to their own
// chart, and one about a transit between them and a saved person. Triggered by
// Vercel Cron (see vercel.json).
//
// Protected by CRON_SECRET: Vercel sends `Authorization: Bearer $CRON_SECRET`
// automatically when that env var is set. We refuse to run without it so the
// endpoint is never publicly triggerable.

export const dynamic = "force-dynamic";
export const maxDuration = 300; // seconds (raised limit needs a paid Vercel plan)

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://nefeli.kamalacreated.com";
const NUDGE_MIN_INTENSITY = 4;
const REL_NUDGE_MAX_ORB = 1.5;          // only genuinely tight relational hits
const REL_TRANSIT_SET = ["Sun", "Moon", "Mercury", "Venus", "Mars"];
const CONCURRENCY = 4;

interface UserOutcome { guidance: boolean; nudge: boolean; relNudge: boolean; email: boolean; failed: boolean }

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  return header === `Bearer ${secret}`;
}

/** Deliver a notification (insert + optional email). Returns {sent, emailed}. */
async function deliver(
  uid: string, kind: string, title: string, body: string, dedupeKey: string, data: object,
): Promise<{ sent: boolean; emailed: boolean }> {
  const { data: existing } = await supabaseAdmin
    .from("notifications").select("id").eq("user_id", uid).eq("dedupe_key", dedupeKey).maybeSingle();
  if (existing) return { sent: false, emailed: false };

  const { error } = await supabaseAdmin.from("notifications").insert({
    user_id: uid, kind, title, body, data, dedupe_key: dedupeKey,
  });
  if (error) {
    if (/duplicate|unique/i.test(error.message)) return { sent: false, emailed: false };
    throw new Error(error.message);
  }

  let emailed = false;
  if (emailEnabled()) {
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(uid);
    const to = u?.user?.email;
    if (to) {
      emailed = await sendEmail({
        to, subject: `NEFELI · ${title}`,
        text: `${body}\n\nSit with it in NEFELI: ${APP_URL}/app`,
      });
    }
  }
  return { sent: true, emailed };
}

/** A transit to the user's own chart. */
async function maybeTransitNudge(
  uid: string, ctx: AssembledContext, profile: BirthProfileRow, date: string,
): Promise<{ sent: boolean; emailed: boolean }> {
  const top = [...ctx.transits].sort((a, b) => b.intensity - a.intensity)[0];
  if (!top || top.intensity < NUDGE_MIN_INTENSITY) return { sent: false, emailed: false };

  const body = await complete(
    ctx.system,
    `In 1-2 warm sentences (second person, no greeting, no sign-off), give ${profile.name} a heads-up that ${top.transitingPlanet} is ${top.aspect} their natal ${top.natalPlanet} right now. Name what it might stir and one gentle way to meet it. Non-fatalistic — weather, not fate.`,
    220,
  );
  const title = `${top.transitingPlanet} ${top.aspect} your ${top.natalPlanet}`;
  return deliver(uid, "transit_nudge", title, body, `transit_nudge:${date}`, { transit: top });
}

/** The tightest transit today between the user and one of their people. */
async function maybeRelationshipNudge(
  uid: string, ctx: AssembledContext, profile: BirthProfileRow, date: string,
  sky: { name: string; absoluteDegree: number }[],
): Promise<{ sent: boolean; emailed: boolean }> {
  const { data: people } = await supabaseAdmin
    .from("people").select("name,relationship,chart_data").eq("user_id", uid);
  if (!people || people.length === 0) return { sent: false, emailed: false };

  let best: { name: string; rel: string | null; transiting: string; natal: string; type: string; orb: number } | null = null;
  for (const person of people) {
    const chart = person.chart_data as NatalChart | null;
    if (!chart?.planets) continue;
    for (const a of synastryAspects(sky, relationshipPlanets(chart.planets), REL_NUDGE_MAX_ORB)) {
      if (!best || a.orb < best.orb) {
        best = { name: person.name, rel: person.relationship, transiting: a.a, natal: a.b, type: a.type, orb: a.orb };
      }
    }
  }
  if (!best) return { sent: false, emailed: false };

  const relText = best.rel ? ` (${best.rel})` : "";
  const body = await complete(
    ctx.system,
    `Today, transiting ${best.transiting} is ${best.type} ${best.name}'s${relText} natal ${best.natal}. In 1-2 warm sentences (second person, no greeting, no sign-off), tell ${profile.name} what's alive between them and ${best.name} today and one caring way to meet it. Applies to any bond; non-fatalistic.`,
    220,
  );
  const title = `You & ${best.name}: ${best.transiting} ${best.type} their ${best.natal}`;
  return deliver(uid, "relationship_nudge", title, body, `relationship_nudge:${date}`, { relation: best });
}

async function processUser(
  uid: string, sky: { name: string; absoluteDegree: number }[],
): Promise<UserOutcome> {
  const out: UserOutcome = { guidance: false, nudge: false, relNudge: false, email: false, failed: false };
  try {
    const loaded = await loadCompanionContext(supabaseAdmin, uid);
    if (!loaded) return out;
    const { ctx, profile } = loaded;

    const { created } = await ensureDailyGuidance(supabaseAdmin, uid, ctx, profile);
    out.guidance = created;

    const date = dayKeyFor(profile.timezone);
    const t = await maybeTransitNudge(uid, ctx, profile, date);
    out.nudge = t.sent; out.email = t.emailed;

    const r = await maybeRelationshipNudge(uid, ctx, profile, date, sky);
    out.relNudge = r.sent; out.email = out.email || r.emailed;
  } catch (e) {
    out.failed = true;
    console.error(`cron/daily user ${uid} failed:`, e);
  }
  return out;
}

async function run(): Promise<NextResponse> {
  const { data: profiles, error } = await supabaseAdmin
    .from("birth_profiles").select("user_id").order("user_id", { ascending: true });
  if (error) throw new Error(error.message);

  const userIds = [...new Set((profiles ?? []).map((p) => p.user_id))];
  // The sky is the same for everyone at cron time — compute it once.
  const sky = transitingPositions(new Date()).filter((p) => REL_TRANSIT_SET.includes(p.name));
  const totals = { guidance: 0, nudges: 0, relNudges: 0, emails: 0, failures: 0 };

  let cursor = 0;
  async function worker() {
    while (cursor < userIds.length) {
      const r = await processUser(userIds[cursor++], sky);
      if (r.guidance) totals.guidance++;
      if (r.nudge) totals.nudges++;
      if (r.relNudge) totals.relNudges++;
      if (r.email) totals.emails++;
      if (r.failed) totals.failures++;
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, userIds.length) }, worker));

  return NextResponse.json({ ok: true, users: userIds.length, ...totals });
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return await run();
  } catch (e) {
    console.error("cron/daily error:", e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return GET(req);
}
