import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const capsuleSchema = z.object({
  title: z.string(),
  pieces: z.array(
    z.object({
      category: z.string(),
      item: z.string(),
      notes: z.string().optional(),
    })
  ).min(10).max(15),
  outfits: z.array(
    z.object({
      name: z.string(),
      items: z.array(z.string()),
      notes: z.string().optional(),
    })
  ).length(6),
  why: z.array(z.string()),
});

type CapsuleData = z.infer<typeof capsuleSchema>;

export async function POST(req: NextRequest) {
  try {
    // Check for OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key is missing" },
        { status: 500 }
      );
    }

    // Parse body safely
    let body = {};
    try {
      body = await req.json();
    } catch {}

    const userId = (body as any).userId;
    const intent = (body as any).intent || "everyday";
    const season = (body as any).season || null;
    const colorVibe = (body as any).colorVibe || null;
    const dressCode = (body as any).dressCode || null;
    const notes = (body as any).notes || null;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user exists
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("sun_sign, moon_sign, rising_sign, mc_sign, style_intent")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Profile not found. Please complete your profile first." },
        { status: 400 }
      );
    }

    // Fetch natal_charts.chart_json if it exists
    const { data: chartData } = await supabaseAdmin
      .from("natal_charts")
      .select("chart_json")
      .eq("user_id", userId)
      .maybeSingle();

    const chartJson = chartData?.chart_json || null;

    // Build system prompt
    const placements = {
      sun: profile.sun_sign || "—",
      moon: profile.moon_sign || "—",
      rising: profile.rising_sign || "—",
      mc: profile.mc_sign || "—",
    };

    const seasonText = season ? `Season: ${season}` : "";
    const colorText = colorVibe ? `Color vibe: ${colorVibe}` : "";
    const dressText = dressCode ? `Dress code: ${dressCode}` : "";
    const notesText = notes ? `Notes: ${notes}` : "";

    const systemPrompt = `You are NEFELI, a calm, practical style guide. Generate a capsule wardrobe based on astrological placements and user preferences. Keep recommendations practical, wearable, and specific. Avoid astrology jargon.

CRITICAL: You MUST respond with ONLY valid JSON matching this exact schema:
{
  "title": "string (short, evocative title like 'Effortless Work Essentials' or 'Weekend Capsule')",
  "pieces": [
    {
      "category": "string (e.g., 'Tops', 'Bottoms', 'Outerwear', 'Shoes', 'Accessories')",
      "item": "string (specific item like 'White button-down shirt' or 'Black tailored trousers')",
      "notes": "string (optional, brief styling note)"
    },
    ...
  ], // Exactly 10-15 pieces total
  "outfits": [
    {
      "name": "string (e.g., 'Monday meeting', 'Weekend brunch')",
      "items": ["string", ...], // 3-5 specific pieces from the capsule
      "notes": "string (optional, brief styling note)"
    },
    ...
  ], // Exactly 6 outfits
  "why": [
    "string (1 sentence tying to Sun in <sign> + intent)",
    "string (1 sentence tying to Moon in <sign> + intent)",
    "string (1 sentence tying to Rising/MC in <sign> + intent)"
  ] // 3 bullets explaining why this fits
}

Do NOT include any text before or after the JSON. Return ONLY the JSON object.

User's chart:
- Sun: ${placements.sun}
- Moon: ${placements.moon}
- Rising: ${placements.rising}
- Midheaven: ${placements.mc}
- Style intent: ${intent}
${seasonText}
${colorText}
${dressText}
${notesText}

Requirements:
- Generate 10-15 specific, wearable pieces organized by category
- Create exactly 6 outfit formulas that mix and match these pieces
- Keep language plain and practical. Avoid astrology jargon.
- Tie insights to "Sun in ${placements.sun}", "Moon in ${placements.moon}", "Rising in ${placements.rising}", "MC in ${placements.mc}" when explaining why pieces fit.
- Make recommendations specific (e.g., "Black tailored trousers" not just "pants")
- Ensure outfits are practical and mix pieces from the capsule.`;

    // Generate capsule with OpenAI
    let parsedResponse: CapsuleData;
    try {
      const result = await generateText({
        model: openai("gpt-4o-mini"),
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Generate the capsule wardrobe JSON." },
        ],
        temperature: 0.7,
      });

      // Parse and validate the response
      try {
        // Try to extract JSON from the response (handle cases where model adds markdown code blocks)
        let jsonText = result.text.trim();
        // Remove markdown code blocks if present
        if (jsonText.startsWith("```")) {
          const lines = jsonText.split("\n");
          lines.shift(); // Remove first line (```json or ```)
          if (lines[lines.length - 1].trim() === "```") {
            lines.pop(); // Remove last line (```)
          }
          jsonText = lines.join("\n");
        }

        parsedResponse = capsuleSchema.parse(JSON.parse(jsonText));
      } catch (parseError) {
        console.error("Failed to parse capsule response:", parseError);
        console.error("Raw response:", result.text);
        return NextResponse.json(
          { error: "Failed to parse capsule response" },
          { status: 500 }
        );
      }
    } catch (openaiError: any) {
      console.error("OpenAI error:", openaiError);
      return NextResponse.json(
        { error: "Failed to generate capsule" },
        { status: 500 }
      );
    }

    // Return structured JSON response
    return NextResponse.json(
      { ok: true, data: parsedResponse },
      { status: 200 }
    );
  } catch (e: any) {
    console.error("capsule route error", e);
    return NextResponse.json(
      { error: e?.message ?? "Internal error" },
      { status: 500 }
    );
  }
}

