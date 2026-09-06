import { NextResponse } from "next/server";
import { supabaseAdmin, getAuthedUserId } from "@/lib/supabase/admin";

// First-party analytics sink. Best-effort by design: it always returns 204 and
// never surfaces an error to the client, so a failing insert can't break a flow.
export async function POST(req: Request) {
  try {
    const uid = await getAuthedUserId(req).catch(() => null);
    const body = await req.json().catch(() => ({}) as Record<string, unknown>);

    const name = typeof body.name === "string" ? body.name.slice(0, 64) : "";
    if (!name) return new NextResponse(null, { status: 204 });

    const props =
      body.props && typeof body.props === "object" && !Array.isArray(body.props)
        ? (body.props as Record<string, unknown>)
        : {};
    const path = typeof body.path === "string" ? body.path.slice(0, 256) : null;

    await supabaseAdmin.from("events").insert({ user_id: uid, name, props, path });
  } catch {
    /* swallow — analytics must never fail loudly */
  }
  return new NextResponse(null, { status: 204 });
}
