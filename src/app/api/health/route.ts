import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Public health check — confirms the deployed build is pointed at a real,
// reachable Supabase project, from the server side (no browser, no login).
// Exposes only non-secret facts: the Supabase URL/ref (already public in the
// client bundle) and whether each subsystem responds. Never returns keys.

export const dynamic = "force-dynamic";

function projectRef(url: string): string | null {
  return url.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/i)?.[1] ?? null;
}

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  const env = {
    supabaseUrl: Boolean(url),
    anonKey: Boolean(anonKey),
    serviceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  };

  // Auth subsystem — exactly what login/signup hit in the browser.
  let auth: { ok: boolean; status: number | null; error?: string } = { ok: false, status: null };
  if (url) {
    try {
      const r = await fetch(`${url}/auth/v1/health`, { headers: { apikey: anonKey }, cache: "no-store" });
      auth = { ok: r.ok, status: r.status };
    } catch (e) {
      auth = { ok: false, status: null, error: e instanceof Error ? e.message : "unreachable" };
    }
  }

  // Database — via the service role, confirms URL + service key agree.
  let db: { ok: boolean; error?: string } = { ok: false };
  try {
    const { error } = await supabaseAdmin.from("birth_profiles").select("user_id", { count: "exact", head: true });
    db = error ? { ok: false, error: error.message } : { ok: true };
  } catch (e) {
    db = { ok: false, error: e instanceof Error ? e.message : "query failed" };
  }

  // Schema completeness — probe every table the companion app needs.
  const EXPECTED = [
    "birth_profiles", "life_contexts", "declarations", "conversations", "messages",
    "daily_guidance", "insights", "monthly_guides", "notifications", "people",
    "solar_returns", "households", "household_members", "daily_broadcasts",
  ];
  const present: string[] = [];
  const missing: string[] = [];
  await Promise.all(EXPECTED.map(async (t) => {
    const { error } = await supabaseAdmin.from(t).select("*", { head: true, count: "exact" });
    // "relation does not exist" (42P01) => missing; any other error still means the table resolves.
    if (error && /does not exist|42P01/i.test(error.message)) missing.push(t);
    else present.push(t);
  }));
  const schema = { complete: missing.length === 0, presentCount: present.length, missing };

  const ok = env.supabaseUrl && env.anonKey && env.serviceRole && auth.ok && db.ok && schema.complete;
  return NextResponse.json(
    {
      ok,
      supabase: { url, projectRef: projectRef(url), auth, db, schema },
      env,
      time: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 },
  );
}
