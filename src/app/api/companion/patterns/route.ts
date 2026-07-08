import { NextResponse } from "next/server";
import { supabaseAdmin, getAuthedUserId } from "@/lib/supabase/admin";
import { loadCompanionContext } from "@/lib/companion/context";
import { complete } from "@/lib/astrology/prompt";

// Pattern recognition: look across the whole chart + everything the user has
// shared, and name ONE true pattern. Saved as an insight (type 'pattern').
export async function POST(req: Request) {
  try {
    const uid = await getAuthedUserId(req);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const loaded = await loadCompanionContext(supabaseAdmin, uid);
    if (!loaded) return NextResponse.json({ error: "onboarding_required" }, { status: 400 });

    // Give the model the patterns it already surfaced, so it finds something new.
    const { data: existing } = await supabaseAdmin
      .from("insights").select("title").eq("user_id", uid).eq("insight_type", "pattern")
      .order("created_at", { ascending: false }).limit(10);
    const seen = (existing ?? []).map((p) => p.title).filter(Boolean).join("; ");

    const raw = await complete(
      loaded.ctx.system,
      `Looking across ${loaded.profile.name}'s whole chart and everything they've shared with you, name ONE pattern or through-line you notice — something true that connects their placements to how they actually live. Make it a gentle, honest observation (not flattery, not doom).
${seen ? `Don't repeat these already-named patterns: ${seen}.` : ""}
Format exactly: a short title (3-6 words) on the first line, then a blank line, then 2-3 warm sentences. No headers or labels.`,
      500,
    );

    const [firstLine, ...rest] = raw.trim().split(/\n/);
    const title = firstLine.replace(/^["'#*\s]+|["'*\s]+$/g, "").slice(0, 120) || "A pattern";
    const content = rest.join("\n").trim() || raw.trim();

    const { data: saved, error } = await supabaseAdmin.from("insights").insert({
      user_id: uid, insight_type: "pattern", title, content,
    }).select("id,insight_type,title,content,created_at").single();
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, pattern: saved });
  } catch (e) {
    console.error("companion patterns error:", e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
