import { NextResponse } from "next/server";
import { supabaseAdmin, getAuthedUserId } from "@/lib/supabase/admin";
import { errorMessage } from "@/lib/errors";

const INSIGHT_TYPES = ["pattern", "wound", "strength", "theme", "transit_theme"];

// GET  → the user's insights (most recent first) for the memory surface.
export async function GET(req: Request) {
  const uid = await getAuthedUserId(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("insights")
    .select("id,insight_type,title,content,created_at")
    .eq("user_id", uid)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  return NextResponse.json({ ok: true, insights: data ?? [] });
}

// POST → save an insight ("Remember this").
export async function POST(req: Request) {
  const uid = await getAuthedUserId(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { title?: string; content?: string; insightType?: string; sourceConversationId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const content = (body.content || "").trim();
  if (!content) return NextResponse.json({ error: "Nothing to remember." }, { status: 400 });

  const insightType = INSIGHT_TYPES.includes(body.insightType || "") ? body.insightType : "theme";
  const title = (body.title || content).trim().slice(0, 120);

  const { error } = await supabaseAdmin.from("insights").insert({
    user_id: uid,
    insight_type: insightType,
    title,
    content,
    source_conversation_id: body.sourceConversationId || null,
  });
  if (error) return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  return NextResponse.json({ ok: true });
}
