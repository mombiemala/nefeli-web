import { NextRequest, NextResponse } from "next/server";
import tzlookup from "tz-lookup";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { lat, lng } = body ?? {};

    // Validate lat and lng exist and are numbers
    if (typeof lat !== "number" || typeof lng !== "number") {
      return NextResponse.json({ tz: null });
    }

    // Validate lat/lng are valid ranges
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json({ tz: null });
    }

    // Use tz-lookup to determine IANA timezone
    let tz: string | null = null;
    try {
      tz = tzlookup(lat, lng);
    } catch (error) {
      console.error("Timezone lookup error:", error);
      return NextResponse.json({ tz: null });
    }

    return NextResponse.json({ tz });
  } catch (e: any) {
    console.error("geo timezone error:", e);
    return NextResponse.json({ tz: null });
  }
}

