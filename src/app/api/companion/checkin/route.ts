import { NextResponse } from "next/server";
import { supabaseAdmin, getAuthedUserId } from "@/lib/supabase/admin";
import { loadCompanionContext } from "@/lib/companion/context";
import { complete } from "@/lib/astrology/prompt";

// The 60-second daily check-in: the user says how they're arriving, NEFELI
// responds through their chart + memory, and the reflection is saved as an
// insight so the app visibly gets to know them over time.
export async function POST(req: Request) {
  try {
    const uid = await getAuthedUserId(req);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let body: { reflection?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    const reflection = (body.reflection || "").trim();
    if (!reflection) return NextResponse.json({ error: "Share a line first." }, { status: 400 });

    const loaded = await loadCompanionContext(supabaseAdmin, uid);
    if (!loaded) return NextResponse.json({ error: "onboarding_required" }, { status: 400 });

    const response = await complete(
      loaded.ctx.system,
      `${loaded.profile.name} is checking in with how they're arriving today:\n"${reflection}"\n\nRespond in 2-4 warm sentences — meet them where they are, reflect it back through their chart and the day's sky, and offer one small, kind thing to carry. No fixing, no toxic positivity, no tasks.`,
      600,
    );

    // Remember the reflection (the memory grows from real input).
    await supabaseAdmin.from("insights").insert({
      user_id: uid,
      insight_type: "theme",
      title: reflection.slice(0, 120),
      content: reflection,
    });

    return NextResponse.json({ ok: true, response });
  } catch (e) {
    console.error("companion checkin error:", e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
