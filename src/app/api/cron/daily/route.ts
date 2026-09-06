import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { loadCompanionContext } from "@/lib/companion/context";
import { ensureDailyGuidance, dayKeyFor } from "@/lib/companion/daily";
import { complete } from "@/lib/astrology/prompt";
import { emailEnabled, sendEmail } from "@/lib/notify/email";
import { discordEnabled, postToDiscord } from "@/lib/notify/discord";
import { computeSkyWeather } from "@/lib/astrology/sky-weather";
import { computeConnections, isoWeekKey, recencyLabel } from "@/lib/companion/connections";
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

/**
 * The person most worth reaching out to this week — the warmest (or most
 * overdue) connection — with recency-aware, gently-nudging copy. Deduped once
 * per person per week so we suggest a reach-out without nagging.
 */
async function maybeRelationshipNudge(
  uid: string, ctx: AssembledContext, profile: BirthProfileRow,
): Promise<{ sent: boolean; emailed: boolean }> {
  const { data: people } = await supabaseAdmin
    .from("people").select("id,name,relationship,chart_data,last_contact_at").eq("user_id", uid);
  if (!people || people.length === 0) return { sent: false, emailed: false };

  const input = people.map((p) => ({
    id: p.id as string,
    name: p.name as string,
    relationship: (p.relationship as string | null) ?? null,
    chart: (p.chart_data as NatalChart | null) ?? null,
    lastContactAt: (p.last_contact_at as string | null) ?? null,
  }));

  const now = new Date();
  const pick = computeConnections(input, now).find((c) => c.surface && (c.quality === "warm" || c.overdue));
  if (!pick) return { sent: false, emailed: false };

  const relText = pick.relationship ? ` (${pick.relationship})` : "";
  const recencyClause = pick.overdue
    ? ` It's been a while since they last connected (${recencyLabel(pick.daysSince).toLowerCase()}).`
    : "";

  let body: string;
  try {
    body = await complete(
      ctx.system,
      `${pick.name}${relText}: ${pick.headline.toLowerCase()} ${pick.window}.${recencyClause} In 1-2 warm sentences (second person, no greeting, no sign-off), gently suggest ${profile.name} reach out to ${pick.name}, and one caring way to do it. Non-fatalistic; applies to any bond.`,
      200,
    );
  } catch {
    body = `${pick.headline} ${pick.window} — a gentle, good moment to reach out to ${pick.name}.`;
  }

  const title = pick.overdue
    ? `A good moment to reach out to ${pick.name}`
    : `You & ${pick.name}: warm timing ${pick.window}`;
  const dedupe = `reach_out:${pick.personId}:${isoWeekKey(now)}`;
  return deliver(uid, "relationship_nudge", title, body, dedupe, { connection: pick });
}

async function processUser(uid: string): Promise<UserOutcome> {
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

    const r = await maybeRelationshipNudge(uid, ctx, profile);
    out.relNudge = r.sent; out.email = out.email || r.emailed;
  } catch (e) {
    out.failed = true;
    console.error(`cron/daily user ${uid} failed:`, e);
  }
  return out;
}

/** Post today's collective "sky weather" to the community Discord, once a day. */
async function broadcastSkyWeather(): Promise<boolean> {
  if (!discordEnabled()) return false;

  // Claim today's slot; a unique-key conflict means another run already posted.
  const today = new Date().toISOString().slice(0, 10);
  const { error: claimErr } = await supabaseAdmin.from("daily_broadcasts").insert({ broadcast_date: today });
  if (claimErr) {
    if (/duplicate|unique/i.test(claimErr.message)) return false;
    throw new Error(claimErr.message);
  }

  const sw = computeSkyWeather(new Date());
  const aspectLine = sw.aspect ? `${sw.aspect.a} ${sw.aspect.type} ${sw.aspect.b}` : "a quiet planetary day";

  let vibe = "";
  try {
    vibe = await complete(
      "You are NEFELI, a warm, grounded astrology companion writing a one-line collective 'sky weather' note for a community channel. Inclusive, non-fatalistic, no user-specific details.",
      `Moon in ${sw.moonSign}, ${sw.phase}. ${aspectLine}. Write ONE warm sentence (max 24 words) capturing today's collective mood and a gentle invitation. No greeting, no hashtags.`,
      120,
    );
  } catch { /* the vibe line is optional */ }

  const description =
    `${sw.phaseEmoji} Moon in **${sw.moonSign}** ${sw.moonGlyph} · ${sw.phase}\n` +
    `✦ ${aspectLine}` + (vibe ? `\n\n${vibe.trim()}` : "");

  return postToDiscord({
    embeds: [{ title: `🌙 Sky weather — ${sw.date}`, description, color: 0xb99cf0, footer: { text: "NEFELI · your astrology companion" } }],
  });
}

async function run(): Promise<NextResponse> {
  const { data: profiles, error } = await supabaseAdmin
    .from("birth_profiles").select("user_id").order("user_id", { ascending: true });
  if (error) throw new Error(error.message);

  const userIds = [...new Set((profiles ?? []).map((p) => p.user_id))];
  const totals = { guidance: 0, nudges: 0, relNudges: 0, emails: 0, failures: 0 };

  let cursor = 0;
  async function worker() {
    while (cursor < userIds.length) {
      const r = await processUser(userIds[cursor++]);
      if (r.guidance) totals.guidance++;
      if (r.nudge) totals.nudges++;
      if (r.relNudge) totals.relNudges++;
      if (r.email) totals.emails++;
      if (r.failed) totals.failures++;
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, userIds.length) }, worker));

  // Collective community broadcast (independent of per-user work).
  let broadcast = false;
  try {
    broadcast = await broadcastSkyWeather();
  } catch (e) {
    console.error("cron/daily sky-weather broadcast failed:", e);
  }

  return NextResponse.json({ ok: true, users: userIds.length, ...totals, broadcast });
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
