// Shared server-side loader: fetch a user's companion rows from Supabase and
// assemble the Claude system prompt (chart + transits + moon + memory).
// Used by the chat, Today, and check-in routes. Supabase does the fetching;
// the astrology kit stays DB-agnostic.

import type { SupabaseClient } from "@supabase/supabase-js";
import { assembleContext, type AssembledContext } from "@/lib/astrology/assemble-context";

export interface BirthProfileRow {
  id: string;
  name: string;
  birth_date: string;
  birth_time: string | null;
  time_unknown: boolean;
  birth_city: string;
  birth_country: string;
  latitude: number;
  longitude: number;
  timezone: string;
  chart_xml: string | null;
}

export interface CompanionContext {
  ctx: AssembledContext;
  profile: BirthProfileRow;
}

/** Returns null when the user has not completed onboarding (no birth profile). */
export async function loadCompanionContext(
  supabase: SupabaseClient,
  userId: string,
  when?: Date,
): Promise<CompanionContext | null> {
  const { data: profile } = await supabase
    .from("birth_profiles")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!profile) return null;

  const [{ data: contexts }, { data: decls }, { data: insights }] = await Promise.all([
    supabase.from("life_contexts").select("category,title,description,is_active")
      .eq("user_id", userId).eq("is_active", true),
    supabase.from("declarations").select("declaration,context_note,declared_at,is_active")
      .eq("user_id", userId).eq("is_active", true),
    supabase.from("insights").select("insight_type,title,content")
      .eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
  ]);

  const ctx = await assembleContext({
    profile: {
      name: profile.name,
      birthDate: profile.birth_date,
      birthTime: profile.birth_time,
      timeUnknown: profile.time_unknown,
      birthCity: profile.birth_city,
      birthCountry: profile.birth_country,
      latitude: profile.latitude,
      longitude: profile.longitude,
      timezone: profile.timezone,
    },
    cachedChartXml: profile.chart_xml,
    lifeContexts: (contexts ?? []).map((c) => ({
      category: c.category, title: c.title, description: c.description, isActive: c.is_active,
    })),
    declarations: (decls ?? []).map((d) => ({
      declaration: d.declaration, contextNote: d.context_note,
      declaredAt: d.declared_at, isActive: d.is_active,
    })),
    insights: (insights ?? []).map((i) => ({
      insightType: i.insight_type, title: i.title, content: i.content,
    })),
    userName: profile.name,
    when,
  });

  return { ctx, profile: profile as BirthProfileRow };
}
