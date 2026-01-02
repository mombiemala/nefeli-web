import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { z } from "zod";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const guidanceSchema = z.object({
  title: z.string(),
  one_liner: z.string(),
  rules: z.array(z.string()).length(3),
  color_story: z.array(z.string()).length(3),
  avoid: z.array(z.string()).length(2),
});

type GuidanceData = z.infer<typeof guidanceSchema>;

function getDayKey(tz: string): string {
  // Use en-CA because it formats as YYYY-MM-DD in most JS engines
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz || "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const y = parts.find(p => p.type === "year")?.value;
  const m = parts.find(p => p.type === "month")?.value;
  const d = parts.find(p => p.type === "day")?.value;

  if (!y || !m || !d) {
    // Safe fallback (UTC) if formatToParts behaves unexpectedly
    const iso = new Date().toISOString().slice(0, 10);
    return iso;
  }

  return `${y}-${m}-${d}`;
}

export async function POST(req: Request) {
  try {
    // --- Parse body ---
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body", message: "Failed to parse JSON" },
        { status: 400 }
      );
    }

    const userId = body?.userId;
    const force = Boolean(body?.force);

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Missing userId" },
        { status: 401 }
      );
    }

    console.log("[/api/nefeli/today] HIT", { userId, force, intent: body?.intent });

    // --- Verify user exists ---
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.getUserById(userId);

    const authUser = authData?.user;

    if (authError || !authUser) {
      return NextResponse.json(
        { error: "Unauthorized", message: authError?.message || "User not found" },
        { status: 401 }
      );
    }

    // --- Read optional request intent/occasion ---
    const requestedIntent =
      typeof body?.intent === "string" && body.intent.trim() ? body.intent.trim() : null;

    const occasion =
      typeof body?.occasion === "string" && body.occasion.trim() ? body.occasion.trim() : null;

    // --- Fetch profile ---
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select(
        "display_name, sun_sign, moon_sign, rising_sign, mc_sign, style_intent, tz, birth_time, birth_place"
      )
      .eq("user_id", userId)
      .maybeSingle();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Bad request", message: profileError?.message || "Profile not found" },
        { status: 400 }
      );
    }

    // REQUEST wins, then profile, then default
    const effectiveIntent = requestedIntent || profile.style_intent || "everyday";
    const source = force ? "today_manual" : "today";

    // day_key in user timezone
    const userTz = profile.tz || "UTC";
    const dayKey = getDayKey(userTz);

    // --- Cache lookup (must match your upsert conflict key) ---
    if (!force) {
      const { data: cached, error: cacheError } = await supabaseAdmin
        .from("ai_guidance")
        .select("title, bullets, why, source, intent, day_key, guidance_json")
        .eq("user_id", userId)
        .eq("day_key", dayKey)
        .eq("intent", effectiveIntent)
        .eq("source", source)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cacheError) {
        console.error("Cache lookup error:", cacheError);
      } else if (cached) {
        const g = cached.guidance_json;

        if (g) {
          // Use guidance_json if available
          return NextResponse.json(
            {
              ok: true,
              data: {
                ...g,
                title: g.title ?? "",
                one_liner: g.one_liner ?? "",
              },
              cached: true,
              source: cached.source,
              intent: cached.intent,
              day_key: cached.day_key,
            },
            { status: 200 }
          );
        }

        // Fallback for legacy rows:
        const bullets = Array.isArray(cached.bullets) ? cached.bullets : [];
        return NextResponse.json(
          {
            ok: true,
            data: {
              title: cached.title ?? "",
              one_liner: cached.why ?? "",
              rules: bullets.slice(0, 3),
              color_story: bullets.slice(3, 6),
              avoid: ["Overly fussy details", "Anything uncomfortable"],
            },
            cached: true,
            source: cached.source,
            intent: cached.intent,
            day_key: cached.day_key,
          },
          { status: 200 }
        );
      }
    }

    const hasCompleteBirthData = !!(profile.birth_time && profile.birth_place);

    // Optional capsule context
    const { data: recentCapsule } = await supabaseAdmin
      .from("capsules")
      .select("capsule_json, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let capsuleContext = "";
    if (recentCapsule?.capsule_json) {
      const capsule = recentCapsule.capsule_json as any;
      const itemCount = capsule.pieces?.length || 0;
      const outfits = capsule.outfits?.length || 0;

      const colors: string[] = [];
      if (capsule.pieces) {
        capsule.pieces.forEach((piece: any) => {
          if (piece.color && !colors.includes(piece.color)) colors.push(piece.color);
        });
      }

      capsuleContext = `\nCapsule context:
- ${itemCount} pieces, ${outfits} outfit formulas${
        colors.length ? `, dominant colors: ${colors.slice(0, 3).join(", ")}` : ""
      }`;
    }

    const displayName = profile.display_name || "there";

    const systemPrompt = `You are NEFELI, a calm, practical style guide. Provide realistic, wearable style guidance based on astrological placements. Avoid astrology jargon dumps.

CRITICAL: Respond with ONLY valid JSON matching:
{
  "title": "string",
  "one_liner": "string",
  "rules": ["string","string","string"],
  "color_story": ["string","string","string"],
  "avoid": ["string","string"]
}

Personalization:
- Name: ${displayName}
- Style intent: ${effectiveIntent}
- Sun: ${profile.sun_sign || "—"}
- Moon: ${profile.moon_sign || "—"}
- Rising: ${profile.rising_sign || "—"}${!hasCompleteBirthData ? " (estimated)" : ""}
- Midheaven: ${profile.mc_sign || "—"}${!hasCompleteBirthData ? " (estimated)" : ""}
${occasion ? `- Occasion: ${occasion}` : ""}${capsuleContext}

Return ONLY JSON. No markdown.`;

    // --- Generate ---
    const result = await generateText({
      model: openai("gpt-4o-mini"),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Generate today's style guidance." },
      ],
    });

    // --- Parse ---
      let jsonText = result.text.trim();
    if (jsonText.startsWith("```json")) jsonText = jsonText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    if (jsonText.startsWith("```")) jsonText = jsonText.replace(/^```\s*/, "").replace(/\s*```$/, "");
      
    const parsedResponse = guidanceSchema.parse(JSON.parse(jsonText));

    // --- Prepare write ---
    const anchors = {
      sun: profile.sun_sign,
      moon: profile.moon_sign,
      rising: profile.rising_sign,
      mc: profile.mc_sign,
    };

    const bullets = [...parsedResponse.rules, ...parsedResponse.color_story];

    const guidance_json = {
      title: parsedResponse.title,
      one_liner: parsedResponse.one_liner,
      rules: parsedResponse.rules,
      color_story: parsedResponse.color_story,
      avoid: parsedResponse.avoid,
    };

    const writeBase: any = {
      user_id: userId,
      day_key: dayKey,
      intent: effectiveIntent,
      source,
      title: parsedResponse.title,
      bullets,
      why: parsedResponse.one_liner,
      guidance_json, // ✅ add this
    };

    const writePayload = {
      ...writeBase,
      occasion,
      anchors,
      // ❌ remove avoid: parsedResponse.avoid
    };

    const { error: writeErr } = await supabaseAdmin
        .from("ai_guidance")
      .upsert(writePayload, { onConflict: "user_id,day_key,intent,source" });

    if (writeErr) {
      console.error("Supabase write failed:", writeErr);
      return NextResponse.json(
        { error: "Failed to save guidance", supabase: writeErr },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        data: {
          title: parsedResponse.title,
          one_liner: parsedResponse.one_liner,
          rules: parsedResponse.rules,
          color_story: parsedResponse.color_story,
          avoid: parsedResponse.avoid,
        },
        cached: false,
        source,
        intent: effectiveIntent,
        day_key: dayKey,
      },
      { status: 200 }
    );
  } catch (e: any) {
    console.error("today route crashed:", e);
    return NextResponse.json(
      { error: "today route crashed", message: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}