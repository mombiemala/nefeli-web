import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, imageId, feedbackType, metadata } = body;

    if (!userId || !imageId || !feedbackType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const validTypes = ["save", "like", "dislike", "report", "matches_advice", "more_like_this"];
    if (!validTypes.includes(feedbackType)) {
      return NextResponse.json(
        { error: "Invalid feedback type" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("image_feedback")
      .insert({
        user_id: userId,
        image_id: imageId,
        feedback_type: feedbackType,
        metadata: metadata || {},
      });

    if (error) {
      console.error("Error saving image feedback:", error);
      return NextResponse.json(
        { error: "Failed to save feedback" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    console.error("Image feedback route error:", e);
    return NextResponse.json(
      { error: "Internal server error", message: e?.message },
      { status: 500 }
    );
  }
}

