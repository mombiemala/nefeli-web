import { NextResponse } from "next/server";
import { supabaseAdmin, getAuthedUserId } from "@/lib/supabase/admin";

// Owner-only product analytics, computed from the first-party `events` table.
// Access is gated on ADMIN_EMAILS (comma-separated). All windows are UTC.

export const dynamic = "force-dynamic";

const DAY = 86_400_000;
const dayKey = (d: Date) => d.toISOString().slice(0, 10);

// Authed engagement surfaces (events that carry a user_id and mean "came back").
const SURFACES = [
  "daily_viewed", "chart_viewed", "forecast_viewed",
  "chat_sent", "person_added", "reading_shared", "connection_logged",
] as const;

// Built-in owner allowlist — opaque Supabase user ids (no PII), safe in source.
// Additional admins can be granted via the ADMIN_EMAILS env var, no code change.
const OWNER_IDS = ["a98d4a79-a4ac-436a-8229-108e5bef906a"];

async function isAdmin(uid: string): Promise<boolean> {
  if (OWNER_IDS.includes(uid)) return true;
  const allow = (process.env.ADMIN_EMAILS ?? "")
    .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (allow.length === 0) return false;
  const { data } = await supabaseAdmin.auth.admin.getUserById(uid);
  const email = data?.user?.email?.toLowerCase();
  return Boolean(email && allow.includes(email));
}

type EventRow = { name: string; user_id: string | null; created_at: string };

/** Page through all events in a window (PostgREST caps a single query ~1000). */
async function loadEvents(sinceIso: string): Promise<EventRow[]> {
  const rows: EventRow[] = [];
  const PAGE = 1000;
  for (let offset = 0; offset < 100_000; offset += PAGE) {
    const { data, error } = await supabaseAdmin
      .from("events").select("name,user_id,created_at")
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: true })
      .range(offset, offset + PAGE - 1);
    if (error) throw new Error(error.message);
    const batch = (data ?? []) as EventRow[];
    rows.push(...batch);
    if (batch.length < PAGE) break;
  }
  return rows;
}

async function countAccounts(): Promise<{ total: number; byId: Map<string, string> }> {
  const byId = new Map<string, string>(); // uid -> created_at
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const users = data?.users ?? [];
    for (const u of users) byId.set(u.id, u.created_at ?? "");
    if (users.length < 200) break;
  }
  return { total: byId.size, byId };
}

export async function GET(req: Request) {
  try {
    const uid = await getAuthedUserId(req);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!(await isAdmin(uid))) {
      return NextResponse.json(
        { error: "forbidden", hint: "This account isn't an admin. Grant access by adding an email to ADMIN_EMAILS (comma-separated) in your environment, then redeploy." },
        { status: 403 },
      );
    }

    const now = new Date();
    const since = new Date(now.getTime() - 60 * DAY);

    const [{ total: accounts, byId: acctCreated }, profilesRes, events] = await Promise.all([
      countAccounts(),
      supabaseAdmin.from("birth_profiles").select("user_id,created_at"),
      loadEvents(since.toISOString()),
    ]);

    const profiles = (profilesRes.data ?? []) as { user_id: string; created_at: string }[];
    const onboarded = new Map(profiles.map((p) => [p.user_id, p.created_at]));

    // ── Funnel (anonymous top, per-account bottom) ──
    const nameCount = (name: string, sinceMs = 0) =>
      events.filter((e) => e.name === name && +new Date(e.created_at) >= sinceMs).length;

    const funnel = {
      landing_view: nameCount("landing_view"),
      cta_begin: nameCount("cta_begin"),
      signups: accounts,
      onboarded: onboarded.size,
    };
    const activationRate = accounts > 0 ? onboarded.size / accounts : 0;

    // ── Per-user active days (from authed events) ──
    const activeDays = new Map<string, Set<string>>();
    const activeAt = (ms: number) => new Set(
      events.filter((e) => e.user_id && +new Date(e.created_at) >= ms).map((e) => e.user_id as string),
    ).size;
    for (const e of events) {
      if (!e.user_id) continue;
      const set = activeDays.get(e.user_id) ?? new Set<string>();
      set.add(dayKey(new Date(e.created_at)));
      activeDays.set(e.user_id, set);
    }

    const active = {
      dau: activeAt(now.getTime() - DAY),
      wau: activeAt(now.getTime() - 7 * DAY),
      mau: activeAt(now.getTime() - 30 * DAY),
    };

    // ── Rolling retention from onboarding: returned within N days ──
    function retention(nDays: number) {
      let eligible = 0, returned = 0;
      for (const [uid2, createdAt] of onboarded) {
        const start = new Date(createdAt);
        if (now.getTime() - start.getTime() < nDays * DAY) continue; // window not elapsed
        eligible++;
        const startDay = dayKey(start);
        const days = activeDays.get(uid2);
        if (!days) continue;
        for (const d of days) {
          const diff = Math.round((+new Date(d) - +new Date(startDay)) / DAY);
          if (diff >= 1 && diff <= nDays) { returned++; break; }
        }
      }
      return { rate: eligible > 0 ? returned / eligible : null, eligible, returned };
    }
    const retentionStats = { d1: retention(1), d7: retention(7), d30: retention(30) };

    // ── Return surface (last 7 days) ──
    const since7 = now.getTime() - 7 * DAY;
    const surfaces = SURFACES.map((name) => ({ name, count: nameCount(name, since7) }))
      .sort((a, b) => b.count - a.count);

    // ── Activity pulse: authed events/day, last 14 days ──
    const pulse: { day: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = dayKey(new Date(now.getTime() - i * DAY));
      const count = events.filter((e) => e.user_id && dayKey(new Date(e.created_at)) === d).length;
      pulse.push({ day: d, count });
    }

    return NextResponse.json({
      ok: true,
      generatedAt: now.toISOString(),
      windowDays: 60,
      accounts, funnel, activationRate, active, retention: retentionStats, surfaces, pulse,
    });
  } catch (e) {
    console.error("admin/stats error:", e);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
