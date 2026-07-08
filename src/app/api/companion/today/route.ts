import { NextResponse } from "next/server";
import { supabaseAdmin, getAuthedUserId } from "@/lib/supabase/admin";
import { loadCompanionContext } from "@/lib/companion/context";
import { ensureDailyGuidance } from "@/lib/companion/daily";

export async function POST(req: Request) {
  try {
    const uid = await getAuthedUserId(req);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const loaded = await loadCompanionContext(supabaseAdmin, uid);
    if (!loaded) return NextResponse.json({ error: "onboarding_required" }, { status: 400 });

    const { row, created } = await ensureDailyGuidance(
      supabaseAdmin, uid, loaded.ctx, loaded.profile,
    );
    return NextResponse.json({ ok: true, cached: !created, guidance: row });
  } catch (e) {
    console.error("companion today error:", e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
