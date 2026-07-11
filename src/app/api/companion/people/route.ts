import { NextResponse } from "next/server";
import { supabaseAdmin, getAuthedUserId } from "@/lib/supabase/admin";
import { profileToSubject } from "@/lib/astrology/chart-utils";
import { generateBirthChart } from "@/lib/astrology/astrologer-api";

// GET: the people this user has added (no chart payload — kept light).
export async function GET(req: Request) {
  try {
    const uid = await getAuthedUserId(req);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabaseAdmin
      .from("people")
      .select("id,name,relationship,birth_date,time_unknown,chart_data,created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const people = (data ?? []).map((p) => ({
      id: p.id, name: p.name, relationship: p.relationship,
      birthDate: p.birth_date, timeUnknown: p.time_unknown,
      sunSign: p.chart_data?.sunSign ?? null,
      moonSign: p.chart_data?.moonSign ?? null,
      risingSign: p.chart_data?.ascendantSign ?? null,
    }));
    return NextResponse.json({ ok: true, people });
  } catch (e) {
    console.error("people GET error:", e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

// POST: add a person (computes + caches their natal chart).
export async function POST(req: Request) {
  try {
    const uid = await getAuthedUserId(req);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const {
      name, relationship, birthDate, birthTime, timeUnknown,
      birthCity, birthCountry, latitude, longitude, timezone,
    } = body ?? {};

    if (!name || !birthDate || latitude == null || longitude == null || !timezone) {
      return NextResponse.json(
        { error: "Name, birth date, and a selected birth location are required." },
        { status: 400 },
      );
    }

    const subject = profileToSubject({
      name, birthDate,
      birthTime: timeUnknown ? null : (birthTime || null),
      timeUnknown: !!timeUnknown,
      birthCity: birthCity || "", birthCountry: birthCountry || "",
      latitude, longitude, timezone,
    });
    const { chart } = await generateBirthChart(subject);

    const { data: saved, error } = await supabaseAdmin.from("people").insert({
      user_id: uid,
      name: String(name).slice(0, 80),
      relationship: relationship ? String(relationship).slice(0, 60) : null,
      birth_date: birthDate,
      birth_time: timeUnknown ? null : (birthTime || null),
      time_unknown: !!timeUnknown,
      birth_city: birthCity || "",
      birth_country: birthCountry || "",
      latitude, longitude, timezone,
      chart_data: chart,
    }).select("id,name,relationship").single();
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, person: saved });
  } catch (e) {
    console.error("people POST error:", e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

// DELETE: remove a person by ?id=
export async function DELETE(req: Request) {
  try {
    const uid = await getAuthedUserId(req);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const { error } = await supabaseAdmin.from("people").delete().eq("user_id", uid).eq("id", id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("people DELETE error:", e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
