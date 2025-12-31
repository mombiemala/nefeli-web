import { NextRequest, NextResponse } from "next/server";
import tzlookup from "tz-lookup";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { place } = body;

    if (!place || typeof place !== "string" || !place.trim()) {
      return NextResponse.json(
        { error: "Place is required" },
        { status: 400 }
      );
    }

    // Use Nominatim (OpenStreetMap) for geocoding
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(place.trim())}&limit=1`;
    
    const res = await fetch(url, {
      headers: {
        "User-Agent": "NEFELI/1.0", // Nominatim requires a User-Agent
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Geocoding service unavailable" },
        { status: 500 }
      );
    }

    const data = await res.json();

    if (!data || !Array.isArray(data) || data.length === 0 || !data[0]) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    const result = data[0];
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { error: "Invalid coordinates" },
        { status: 500 }
      );
    }

    // Get timezone from coordinates
    let tz: string;
    try {
      tz = tzlookup(lat, lng);
    } catch (tzError) {
      // Fallback to UTC if timezone lookup fails
      tz = "UTC";
    }

    return NextResponse.json({
      ok: true,
      lat,
      lng,
      tz,
    });
  } catch (e: any) {
    console.error("geocode error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Internal error" },
      { status: 500 }
    );
  }
}

