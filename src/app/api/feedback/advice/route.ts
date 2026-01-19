import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, dayKey, intent, source, rating, reasons, comment } = body;

    if (!userId || !dayKey || !intent || !source || !rating) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (rating !== 1 && rating !== -1) {
      return NextResponse.json(
        { error: "Rating must be 1 or -1" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("advice_feedback")
      .insert({
        user_id: userId,
        day_key: dayKey,
        intent,
        source,
        rating,
        reasons: reasons || [],
        comment: comment || null,
      });

    if (error) {
      console.error("Error saving advice feedback:", error);
      return NextResponse.json(
        { error: "Failed to save feedback" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    console.error("Advice feedback route error:", e);
    return NextResponse.json(
      { error: "Internal server error", message: e?.message },
      { status: 500 }
    );
  }
}

