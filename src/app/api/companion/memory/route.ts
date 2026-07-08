import { NextResponse } from "next/server";
import { supabaseAdmin, getAuthedUserId } from "@/lib/supabase/admin";

const CATEGORIES = ["career","relationships","family","creative","health","spiritual","finances","other"];

// Everything NEFELI remembers — read.
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
    console.error("API error:", e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

// Add a life context or a declaration.
export async function POST(req: Request) {
  try {
    const uid = await getAuthedUserId(req);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json().catch(() => ({}));

    if (body.kind === "life_context") {
      const description = (body.description || "").trim();
      if (!description) return NextResponse.json({ error: "Say a little more." }, { status: 400 });
      const category = CATEGORIES.includes(body.category) ? body.category : "other";
      const { error } = await supabaseAdmin.from("life_contexts").insert({
        user_id: uid, category, title: description.slice(0, 120), description,
      });
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true });
    }

    if (body.kind === "declaration") {
      const declaration = (body.declaration || "").trim();
      if (!declaration) return NextResponse.json({ error: "Write your declaration." }, { status: 400 });
      const { error } = await supabaseAdmin.from("declarations").insert({
        user_id: uid, declaration,
      });
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown kind" }, { status: 400 });
  } catch (e) {
    console.error("API error:", e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

// Archive a life context / declaration, or delete an insight.
export async function PATCH(req: Request) {
  try {
    const uid = await getAuthedUserId(req);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const id = body.id;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    if (body.kind === "life_context") {
      await supabaseAdmin.from("life_contexts").update({ is_active: false }).eq("id", id).eq("user_id", uid);
    } else if (body.kind === "declaration") {
      await supabaseAdmin.from("declarations").update({ is_active: false }).eq("id", id).eq("user_id", uid);
    } else if (body.kind === "insight") {
      await supabaseAdmin.from("insights").delete().eq("id", id).eq("user_id", uid);
    } else {
      return NextResponse.json({ error: "Unknown kind" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("API error:", e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
