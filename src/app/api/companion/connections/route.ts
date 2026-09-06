import { NextResponse } from "next/server";
import { supabaseAdmin, getAuthedUserId } from "@/lib/supabase/admin";
import { computeConnections, recencyLabel, type ConnectionInput } from "@/lib/companion/connections";
import type { NatalChart } from "@/lib/astrology/types";

// GET: ranked "reach out" signals — who the week's weather is warm (or tender)
// with, and how long since you last connected. No AI cost; pure computation.
export async function GET(req: Request) {
  try {
    const uid = await getAuthedUserId(req);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: people } = await supabaseAdmin
      .from("people")
      .select("id,name,relationship,chart_data,last_contact_at")
      .eq("user_id", uid);

    if (!people || people.length === 0) return NextResponse.json({ ok: true, connections: [] });

    const input: ConnectionInput[] = people.map((p) => ({
      id: p.id as string,
      name: p.name as string,
      relationship: (p.relationship as string | null) ?? null,
      chart: (p.chart_data as NatalChart | null) ?? null,
      lastContactAt: (p.last_contact_at as string | null) ?? null,
    }));

    const connections = computeConnections(input, new Date()).map((c) => ({
      ...c,
      recency: recencyLabel(c.daysSince),
    }));
    return NextResponse.json({ ok: true, connections });
  } catch (e) {
    console.error("connections GET error:", e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

// POST { personId }: log that the user just connected with this person, stamping
// last_contact_at so future nudges factor in recency.
export async function POST(req: Request) {
  try {
    const uid = await getAuthedUserId(req);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const personId = typeof body?.personId === "string" ? body.personId : null;
    if (!personId) return NextResponse.json({ error: "Provide personId" }, { status: 400 });

    const now = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from("people")
      .update({ last_contact_at: now })
      .eq("user_id", uid) // ownership guard — never trust the body's id alone
      .eq("id", personId);
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, last_contact_at: now });
  } catch (e) {
    console.error("connections POST error:", e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
