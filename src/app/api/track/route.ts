import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// First-party analytics sink. Best-effort by design: always 204, never surfaces
// an error, so a failing insert can't break a flow.
//
// It fires on every page load, so it must be cheap: we read the user id straight
// from the access token's payload (no GoTrue verification round-trip per event —
// analytics attribution doesn't need cryptographic verification, and the network
// call was needless load on a hot path).
function uidFromToken(req: Request): string | null {
  try {
    const h = req.headers.get("authorization") ?? req.headers.get("Authorization") ?? "";
    const [scheme, token] = h.split(" ");
    if (scheme?.toLowerCase() !== "bearer" || !token) return null;
    const payload = token.split(".")[1];
    if (!payload) return null;
    const json = JSON.parse(
      Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"),
    );
    return typeof json?.sub === "string" ? json.sub : null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const uid = uidFromToken(req);
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
