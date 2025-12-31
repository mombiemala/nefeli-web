import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const responseSchema = z.object({
  headline: z.string(),
  outfit_options: z.array(
    z.object({
      name: z.string(),
      items: z.array(z.string()).min(4).max(7),
      palette: z.array(z.string()).min(2).max(5),
      notes: z.string(),
    })
  ).length(3),
  accessories: z.array(z.string()).min(3).max(6),
  beauty: z.array(z.string()).min(2).max(5),
  why: z.string().max(200), // 1-2 sentences max
  intent: z.enum(["work", "date", "everyday", "staples"]),
  occasion: z.string().nullable(),
});

type ResponseData = z.infer<typeof responseSchema>;

// Safe fallback response
const safeFallback: ResponseData = {
  headline: "Style guidance",
  outfit_options: [
    {
      name: "Classic look",
      items: ["Neutral top", "Tailored pants", "Comfortable shoes", "Simple jacket"],
      palette: ["Neutral tones", "Black"],
      notes: "Versatile and timeless.",
    },
    {
      name: "Relaxed option",
      items: ["Soft sweater", "Jeans", "Sneakers", "Casual bag"],
      palette: ["Earth tones", "Navy"],
      notes: "Comfortable and easy.",
    },
    {
      name: "Polished choice",
      items: ["Structured blazer", "Fitted top", "Tailored bottoms", "Leather accessories"],
      palette: ["Neutral palette", "Accent color"],
      notes: "Professional and refined.",
    },
  ],
  accessories: ["Watch", "Bag", "Scarf"],
  beauty: ["Natural makeup", "Simple hairstyle"],
  why: "These options work for most occasions and body types.",
  intent: "everyday",
  occasion: null,
};

export async function POST(req: NextRequest) {
  try {
    const { userId, message } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Verify user exists
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user profile with birth details to check completeness
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("sun_sign, moon_sign, rising_sign, mc_sign, style_intent, birth_time, birth_place")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    // Check if birth time/location are missing (affects Rising/MC accuracy)
    const hasCompleteBirthData = !!(profile.birth_time && profile.birth_place);

    // Optionally fetch last 10 board_items for context
    const { data: boardItems } = await supabaseAdmin
      .from("board_items")
      .select("title, intent, item_type, item_json")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    const contextItems = boardItems?.map((item) => {
      const title = item.title || "Untitled";
      return `${item.intent || "general"}: ${title}`;
    }).join(", ") || "None yet";

    const systemPrompt = `You are NEFELI, a calm, practical style guide. You provide realistic, wearable suggestions based on astrological placements and user goals. Avoid astrology jargon dumps. Keep recommendations practical and specific.

CRITICAL: You MUST respond with ONLY valid JSON matching this exact schema:
{
  "headline": "string",
  "outfit_options": [
    {
      "name": "string",
      "items": ["string", ...], // 4-7 items
      "palette": ["string", ...], // 2-5 colors
      "notes": "string"
    },
    ... // exactly 3 outfit_options
  ],
  "accessories": ["string", ...], // 3-6 items
  "beauty": ["string", ...], // 2-5 items
  "why": "string (1-2 sentences, max 200 chars)",
  "intent": "work" | "date" | "everyday" | "staples",
  "occasion": "string" | null
}

Do NOT include any text before or after the JSON. Return ONLY the JSON object.

User's chart:
- Sun: ${profile.sun_sign || "—"}
- Moon: ${profile.moon_sign || "—"}
- Rising: ${profile.rising_sign || "—"}${!hasCompleteBirthData ? " (estimated, birth time/location incomplete)" : ""}
- Midheaven: ${profile.mc_sign || "—"}${!hasCompleteBirthData ? " (estimated, birth time/location incomplete)" : ""}
- Style intent: ${profile.style_intent || "everyday"}

${!hasCompleteBirthData ? "NOTE: Birth time and/or location are missing. Avoid making overconfident claims about Rising sign or Midheaven placements. Focus on Sun and Moon signs which are more reliable." : ""}

Recent saved items: ${contextItems}

Requirements:
- Return exactly 3 outfit_options
- Each outfit must have 4-7 items
- Each outfit must have 2-5 colors in palette
- Accessories: 3-6 items
- Beauty: 2-5 items
- "why" must be 1-2 sentences, max 200 characters
- Set "intent" to match the user's style_intent: "${profile.style_intent || "everyday"}"
- Keep "why" tied to Big 4 placements and style intent
- Be specific about items, colors, and styling notes`;

    const result = await generateText({
      model: openai("gpt-4o-mini"),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
    });

    // Parse and validate the response
    let parsedResponse: ResponseData;
    try {
      // Try to extract JSON from the response (handle cases where model adds markdown code blocks)
      let jsonText = result.text.trim();
      // Remove markdown code blocks if present
      if (jsonText.startsWith("```json")) {
        jsonText = jsonText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (jsonText.startsWith("```")) {
        jsonText = jsonText.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }
      
      const parsed = JSON.parse(jsonText);
      parsedResponse = responseSchema.parse(parsed);
    } catch (parseError) {
      // If parsing fails, log error and return safe fallback
      console.error("Failed to parse AI response:", parseError);
      console.error("Raw response:", result.text);
      parsedResponse = safeFallback;
    }

    // Return structured JSON response
    return NextResponse.json(
      { ok: true, data: parsedResponse },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate response" },
      { status: 500 }
    );
  }
}

