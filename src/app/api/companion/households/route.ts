import { NextResponse } from "next/server";
import { supabaseAdmin, getAuthedUserId } from "@/lib/supabase/admin";

// GET: the user's households with a member count.
export async function GET(req: Request) {
  try {
    const uid = await getAuthedUserId(req);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabaseAdmin
      .from("households")
      .select("id,name,include_self,created_at,household_members(person_id)")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const households = (data ?? []).map((h) => ({
      id: h.id, name: h.name, includeSelf: h.include_self,
      memberCount: (h.household_members?.length ?? 0) + (h.include_self ? 1 : 0),
    }));
    return NextResponse.json({ ok: true, households });
  } catch (e) {
    console.error("households GET error:", e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

// POST: create a household from saved people (+ optionally yourself).
export async function POST(req: Request) {
  try {
    const uid = await getAuthedUserId(req);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const name = String(body.name || "").trim().slice(0, 80);
    const includeSelf = body.includeSelf !== false;
    const memberIds: string[] = Array.isArray(body.memberPersonIds) ? body.memberPersonIds.map(String) : [];
    if (!name) return NextResponse.json({ error: "A household name is required." }, { status: 400 });
    if (memberIds.length === 0 && !includeSelf) {
      return NextResponse.json({ error: "Add at least one member." }, { status: 400 });
    }

    // Only accept people that actually belong to this user.
    let validIds: string[] = [];
    if (memberIds.length) {
      const { data: owned } = await supabaseAdmin
        .from("people").select("id").eq("user_id", uid).in("id", memberIds);
      validIds = (owned ?? []).map((p) => p.id);
    }

    const { data: hh, error } = await supabaseAdmin
      .from("households").insert({ user_id: uid, name, include_self: includeSelf })
      .select("id").single();
    if (error) throw new Error(error.message);

    if (validIds.length) {
      const rows = validIds.map((pid) => ({ household_id: hh.id, person_id: pid }));
      const { error: mErr } = await supabaseAdmin.from("household_members").insert(rows);
      if (mErr) throw new Error(mErr.message);
    }

    return NextResponse.json({ ok: true, id: hh.id });
  } catch (e) {
    console.error("households POST error:", e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

// DELETE: remove a household by ?id= (members cascade).
export async function DELETE(req: Request) {
  try {
    const uid = await getAuthedUserId(req);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const { error } = await supabaseAdmin.from("households").delete().eq("user_id", uid).eq("id", id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("households DELETE error:", e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
