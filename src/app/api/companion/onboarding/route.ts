import { NextResponse } from "next/server";
import { supabaseAdmin, getAuthedUserId } from "@/lib/supabase/admin";
import { profileToSubject, type BirthProfileInput } from "@/lib/astrology/chart-utils";
import { generateBirthChart, getBirthChartContext } from "@/lib/astrology/astrologer-api";
import { assembleContext } from "@/lib/astrology/assemble-context";
import { complete } from "@/lib/astrology/prompt";

interface LifeContextInput {
  category: string;
  title?: string;
  description: string;
}

// Must match the life_category enum in the companion_core migration.
const LIFE_CATEGORIES = new Set([
  "career", "relationships", "family", "creative",
  "health", "spiritual", "finances", "other",
]);

export async function POST(req: Request) {
  try {
    const uid = await getAuthedUserId(req);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
      name, birthDate, birthTime, timeUnknown,
      birthCity, birthCountry, latitude, longitude, timezone,
      lifeContexts, declaration,
    } = body ?? {};

    if (!name || !birthDate || !birthCity || latitude == null || longitude == null || !timezone) {
      return NextResponse.json(
        { error: "Missing required fields (name, birth date, and a selected birth location)." },
        { status: 400 },
      );
    }

    const profileInput: BirthProfileInput = {
      name,
      birthDate,
      birthTime: timeUnknown ? null : (birthTime || null),
      timeUnknown: !!timeUnknown,
      birthCity,
      birthCountry: birthCountry || "",
      latitude,
      longitude,
      timezone,
    };

    const subject = profileToSubject(profileInput);

    // Cache the natal chart + AI-context XML (never changes for this person).
    const [chartXml, chartRes] = await Promise.all([
      getBirthChartContext(subject),
      generateBirthChart(subject),
    ]);

    // One default birth profile per user. Insert the new one FIRST, then remove
    // any prior profiles — so a failed insert never leaves the user with none.
    const { data: inserted, error: bpErr } = await supabaseAdmin
      .from("birth_profiles").insert({
        user_id: uid,
        name,
        birth_date: birthDate,
        birth_time: profileInput.birthTime,
        time_unknown: profileInput.timeUnknown,
        birth_city: birthCity,
        birth_country: profileInput.birthCountry,
        latitude,
        longitude,
        timezone,
        chart_data: chartRes.chart,
        chart_xml: chartXml,
        is_default: true,
      })
      .select("id").single();
    if (bpErr || !inserted) throw new Error(`birth_profiles: ${bpErr?.message ?? "insert failed"}`);

    await supabaseAdmin.from("birth_profiles")
      .delete().eq("user_id", uid).neq("id", inserted.id);

    // Keep the account row's display name in sync (used across the app).
    await supabaseAdmin.from("profiles").upsert(
      { user_id: uid, display_name: name },
      { onConflict: "user_id" },
    );

    // Life contexts (the memory) + an optional opening declaration.
    const contexts: LifeContextInput[] = Array.isArray(lifeContexts) ? lifeContexts : [];
    const cleanContexts = contexts
      .filter((c) => c && c.description && c.description.trim())
      .map((c) => {
        const category = LIFE_CATEGORIES.has(c.category) ? c.category : "other";
        return {
          user_id: uid,
          category,
          title: (c.title || c.description).slice(0, 120),
          description: c.description.trim(),
        };
      });
    if (cleanContexts.length) {
      const { error: lcErr } = await supabaseAdmin.from("life_contexts").insert(cleanContexts);
      if (lcErr) console.error("onboarding life_contexts insert failed:", lcErr.message);
    }
    if (declaration && String(declaration).trim()) {
      await supabaseAdmin.from("declarations").insert({
        user_id: uid,
        declaration: String(declaration).trim(),
      });
    }

    // The Day-0 welcome reading — weave the chart with what they just shared.
    const { system } = await assembleContext({
      profile: profileInput,
      cachedChartXml: chartXml,
      lifeContexts: cleanContexts.map((c) => ({
        category: c.category, title: c.title, description: c.description, isActive: true,
      })),
      declarations: declaration && String(declaration).trim()
        ? [{ declaration: String(declaration).trim(), declaredAt: new Date().toISOString(), isActive: true }]
        : [],
      insights: [],
      userName: name,
    });

    const welcome = await complete(
      system,
      `Write ${name}'s welcome reading — exactly three warm paragraphs, second person, no headers, no jargon dumps.
1) Who they are at their core, weaving Sun, Moon, and Rising into one felt portrait.
2) Connect their chart to what they just told you about their life right now — be specific to what they shared.
3) What this season gently invites, and a warm invitation to come back each day so you can walk it together.`,
    );

    return NextResponse.json({ ok: true, welcome });
  } catch (e) {
    console.error("companion onboarding error:", e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
