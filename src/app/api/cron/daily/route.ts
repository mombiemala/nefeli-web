import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { loadCompanionContext } from "@/lib/companion/context";
import { ensureDailyGuidance, dayKeyFor } from "@/lib/companion/daily";
import { complete } from "@/lib/astrology/prompt";
import { emailEnabled, sendEmail } from "@/lib/notify/email";

// Daily cron: pre-warm each onboarded user's guidance and, when a notable
// transit is forming, write a proactive "nudge" notification (and email it if
// email is configured). Triggered by Vercel Cron — see vercel.json.
//
// Protected by CRON_SECRET: Vercel sends `Authorization: Bearer $CRON_SECRET`
// automatically when that env var is set. We refuse to run without it so the
// endpoint is never publicly triggerable.

export const dynamic = "force-dynamic";
export const maxDuration = 300; // seconds (raised limit needs a paid Vercel plan)

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://nefeli.kamalacreated.com";
const NUDGE_MIN_INTENSITY = 4;
// Process several users at once (bounded, to respect Claude/API rate limits)
// so the run finishes well inside maxDuration instead of starving the tail.
const CONCURRENCY = 4;

interface UserOutcome { guidance: boolean; nudge: boolean; email: boolean; failed: boolean }

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  return header === `Bearer ${secret}`;
}

/** One user's daily work: pre-warm guidance and, on a notable transit, nudge. */
async function processUser(uid: string): Promise<UserOutcome> {
  const out: UserOutcome = { guidance: false, nudge: false, email: false, failed: false };
  try {
    const loaded = await loadCompanionContext(supabaseAdmin, uid);
    if (!loaded) return out;
    const { ctx, profile } = loaded;

    const { created } = await ensureDailyGuidance(supabaseAdmin, uid, ctx, profile);
    out.guidance = created;

    const top = [...ctx.transits].sort((a, b) => b.intensity - a.intensity)[0];
    if (!top || top.intensity < NUDGE_MIN_INTENSITY) return out;

    const date = dayKeyFor(profile.timezone);
    const dedupeKey = `transit_nudge:${date}`;
    const { data: existing } = await supabaseAdmin
      .from("notifications").select("id")
      .eq("user_id", uid).eq("dedupe_key", dedupeKey).maybeSingle();
    if (existing) return out;

    const body = await complete(
      ctx.system,
      `In 1-2 warm sentences (second person, no greeting, no sign-off), give ${profile.name} a heads-up that ${top.transitingPlanet} is ${top.aspect} their natal ${top.natalPlanet} right now. Name what it might stir and one gentle way to meet it. Non-fatalistic — weather, not fate.`,
      220,
    );
    const title = `${top.transitingPlanet} ${top.aspect} your ${top.natalPlanet}`;

    const { error: insErr } = await supabaseAdmin.from("notifications").insert({
      user_id: uid, kind: "transit_nudge", title, body,
      data: { transit: top }, dedupe_key: dedupeKey,
    });
    // Unique (user_id, dedupe_key) makes a concurrent double-insert a no-op.
    if (insErr) {
      if (!/duplicate|unique/i.test(insErr.message)) throw new Error(insErr.message);
      return out;
    }
    out.nudge = true;

    if (emailEnabled()) {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(uid);
      const to = u?.user?.email;
      if (to) {
        out.email = await sendEmail({
          to,
          subject: `NEFELI · ${title}`,
          text: `${body}\n\nSit with it in NEFELI: ${APP_URL}/app`,
        });
      }
    }
  } catch (e) {
    out.failed = true;
    console.error(`cron/daily user ${uid} failed:`, e);
  }
  return out;
}

async function run(): Promise<NextResponse> {
  // Every user who has completed onboarding, deduped to one per user.
  const { data: profiles, error } = await supabaseAdmin
    .from("birth_profiles")
    .select("user_id")
    .order("user_id", { ascending: true });
  if (error) throw new Error(error.message);

  const userIds = [...new Set((profiles ?? []).map((p) => p.user_id))];
  const totals = { guidance: 0, nudges: 0, emails: 0, failures: 0 };

  // Bounded worker pool: CONCURRENCY workers pull from a shared cursor.
  let cursor = 0;
  async function worker() {
    while (cursor < userIds.length) {
      const uid = userIds[cursor++];
      const r = await processUser(uid);
      if (r.guidance) totals.guidance++;
      if (r.nudge) totals.nudges++;
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
