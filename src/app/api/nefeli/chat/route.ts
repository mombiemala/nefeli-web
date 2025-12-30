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
      items: z.array(z.string()),
      palette: z.array(z.string()),
      notes: z.string(),
    })
  ).length(3),
  accessories: z.array(z.string()),
  beauty: z.array(z.string()),
  why: z.string(),
  safety: z.object({
    constraints: z.array(z.string()),
  }),
});

export async function POST(req: NextRequest) {
  try {
    const { messages, userId } = await req.json();

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
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    // Optionally fetch last 10 board_items for context
    const { data: boardItems } = await supabaseAdmin
      .from("board_items")
      .select("title, intent")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    const contextItems = boardItems?.map((item) => `${item.intent}: ${item.title}`).join(", ") || "None yet";

    const systemPrompt = `You are NEFELI, a calm, practical style guide. You provide realistic, wearable suggestions based on astrological placements and user goals. Avoid astrology jargon dumps. Keep recommendations practical and specific.

User's chart:
- Sun: ${profile.sun_sign || "—"}
- Moon: ${profile.moon_sign || "—"}
- Rising: ${profile.rising_sign || "—"}
- Midheaven: ${profile.mc_sign || "—"}
- Style intent: ${profile.style_intent || "everyday"}

Recent saved items: ${contextItems}

Always return exactly 3 outfit_options. Keep "why" tied to Big 4 placements and style intent. Be specific about items, colors, and styling notes.`;

    const result = await generateText({
      model: openai("gpt-4o-mini"),
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      output: responseSchema,
    });

    // Return structured output as JSON string for useChat
    return new Response(JSON.stringify(result.object), {
      headers: { "Content-Type": "text/plain" },
    });
  } catch (error: any) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate response" },
      { status: 500 }
    );
  }
}

