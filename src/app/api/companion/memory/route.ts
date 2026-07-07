import { NextResponse } from "next/server";
import { supabaseAdmin, getAuthedUserId } from "@/lib/supabase/admin";
import { errorMessage } from "@/lib/errors";

// Everything NEFELI remembers about the user — the memory made visible.
export async function GET(req: Request) {
  try {
    const uid = await getAuthedUserId(req);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [insights, lifeContexts, declarations] = await Promise.all([
      supabaseAdmin.from("insights")
        .select("id,insight_type,title,content,created_at")
        .eq("user_id", uid).order("created_at", { ascending: false }).limit(100),
      supabaseAdmin.from("life_contexts")
        .select("id,category,title,description,created_at")
        .eq("user_id", uid).eq("is_active", true).order("created_at", { ascending: false }),
      supabaseAdmin.from("declarations")
        .select("id,declaration,context_note,declared_at")
        .eq("user_id", uid).eq("is_active", true).order("declared_at", { ascending: false }),
    ]);

    return NextResponse.json({
      ok: true,
      insights: insights.data ?? [],
      lifeContexts: lifeContexts.data ?? [],
      declarations: declarations.data ?? [],
    });
  } catch (e) {
    return NextResponse.json({ error: errorMessage(e) }, { status: 500 });
  }
}
