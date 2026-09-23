import { NextResponse } from "next/server";
import { supabaseAdmin, getAuthedUserId } from "@/lib/supabase/admin";
import { loadCompanionContext } from "@/lib/companion/context";
import { complete, LLMBusyError } from "@/lib/astrology/prompt";
import { cleanModelText } from "@/lib/astrology/sanitize";

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

    const response = cleanModelText(await complete(
      loaded.ctx.system,
      `${loaded.profile.name} just checked in with how they're arriving today:
"${reflection}"

Answer them directly, the way a perceptive friend would. Start from what they actually said — not the sky. Then read it through their chart and today's sky in one specific way. End on a noticing or a question. Two to four short sentences. No fixing, no pep talk, and nothing that would be true for a stranger.`,
      400,
    ));

    // Remember the reflection (the memory grows from real input).
    await supabaseAdmin.from("insights").insert({
      user_id: uid,
      insight_type: "theme",
      title: reflection.slice(0, 120),
      content: reflection,
    });

    return NextResponse.json({ ok: true, response });
  } catch (e) {
    if (e instanceof LLMBusyError) {
      return NextResponse.json(
        { error: "NEFELI is in high demand right now. Give it a moment and share again." },
        { status: 429 },
      );
    }
    console.error("companion checkin error:", e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
