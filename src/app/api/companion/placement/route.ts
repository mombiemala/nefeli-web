import { NextResponse } from "next/server";
import { supabaseAdmin, getAuthedUserId } from "@/lib/supabase/admin";
import { loadCompanionContext } from "@/lib/companion/context";
import { complete } from "@/lib/astrology/prompt";
import { errorMessage } from "@/lib/errors";

// A per-placement reading: how a specific planet/point lives in this person's
// actual life. Uses the full assembled context (chart + transits + memory).
export async function POST(req: Request) {
  try {
    const uid = await getAuthedUserId(req);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let body: { planet?: string; sign?: string; house?: number };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    const planet = (body.planet || "").trim();
    if (!planet) return NextResponse.json({ error: "Which placement?" }, { status: 400 });

    const loaded = await loadCompanionContext(supabaseAdmin, uid);
    if (!loaded) return NextResponse.json({ error: "onboarding_required" }, { status: 400 });

    const where = [body.sign && `in ${body.sign}`, body.house && `in the ${body.house} house`]
      .filter(Boolean).join(" ");

    const reading = await complete(
      loaded.ctx.system,
      `Read ${loaded.profile.name}'s ${planet}${where ? " " + where : ""} — two short paragraphs, second person, warm.
Not a textbook definition: how this placement actually shows up in their life and what it's inviting them toward right now, connected to what you know about them. No jargon dump.`,
      700,
    );

    return NextResponse.json({ ok: true, reading });
  } catch (e) {
    return NextResponse.json({ error: errorMessage(e) }, { status: 500 });
  }
}
