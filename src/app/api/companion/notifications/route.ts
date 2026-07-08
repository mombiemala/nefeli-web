import { NextResponse } from "next/server";
import { supabaseAdmin, getAuthedUserId } from "@/lib/supabase/admin";
import { errorMessage } from "@/lib/errors";

// GET: recent notifications + unread count for the signed-in user.
export async function GET(req: Request) {
  try {
    const uid = await getAuthedUserId(req);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabaseAdmin
      .from("notifications")
      .select("id,kind,title,body,data,read_at,created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);

    const notifications = data ?? [];
    const unread = notifications.filter((n) => !n.read_at).length;
    return NextResponse.json({ ok: true, notifications, unread });
  } catch (e) {
    console.error("notifications GET error:", e);
    return NextResponse.json({ error: errorMessage(e) }, { status: 500 });
  }
}

// PATCH: mark one ({ id }) or all ({ all: true }) notifications read.
export async function PATCH(req: Request) {
  try {
    const uid = await getAuthedUserId(req);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const now = new Date().toISOString();
    let q = supabaseAdmin.from("notifications").update({ read_at: now }).eq("user_id", uid);
    if (body?.all === true) {
      q = q.is("read_at", null);
    } else if (typeof body?.id === "string") {
      q = q.eq("id", body.id);
    } else {
      return NextResponse.json({ error: "Provide id or all:true" }, { status: 400 });
    }

    const { error } = await q;
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("notifications PATCH error:", e);
    return NextResponse.json({ error: errorMessage(e) }, { status: 500 });
  }
}
