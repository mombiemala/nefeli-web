import { NextResponse } from "next/server";
import { supabaseAdmin, getAuthedUserId } from "@/lib/supabase/admin";

const CURATOR_TIERS = [
  "contributor",
  "editor",
  "verified_stylist",
  "verified_astrologer",
] as const;
type CuratorTier = (typeof CURATOR_TIERS)[number];

// Verify the caller is an authenticated admin. Returns the admin's user id, or a
// NextResponse to return early (401 unauthenticated / 403 not an admin).
async function requireAdmin(req: Request): Promise<string | NextResponse> {
  const userId = await getAuthedUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return userId;
}

// List pending curator applications.
export async function GET(req: Request) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("user_id, display_name, curator_status, curator_bio, curator_specialties, public_handle")
    .eq("curator_status", "applied")
    .order("user_id", { ascending: false });

  if (error) {
    console.error("admin/curators list error:", error);
    return NextResponse.json({ error: "Failed to load applicants" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, applicants: data ?? [] });
}

// Approve or reject a curator application.
export async function POST(req: Request) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const action = body?.action;
  const targetUserId = body?.targetUserId;

  if (!targetUserId || typeof targetUserId !== "string") {
    return NextResponse.json({ error: "targetUserId is required" }, { status: 400 });
  }

  if (action === "approve") {
    const tier = body?.tier as CuratorTier;
    if (!CURATOR_TIERS.includes(tier)) {
      return NextResponse.json({ error: "Invalid curator tier" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ role: "curator", curator_status: "approved", curator_tier: tier })
      .eq("user_id", targetUserId);

    if (error) {
      console.error("admin/curators approve error:", error);
      return NextResponse.json({ error: "Failed to approve" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (action === "reject") {
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ curator_status: "rejected" })
      .eq("user_id", targetUserId);

    if (error) {
      console.error("admin/curators reject error:", error);
      return NextResponse.json({ error: "Failed to reject" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
