import { NextRequest, NextResponse } from "next/server";

type SearchResult = {
  label: string;
  city: string | null;
  state: string | null;
  country: string | null;
  lat: number;
  lng: number;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { q } = body ?? {};

    // Basic validation and rate limiting
    if (!q || typeof q !== "string") {
      return NextResponse.json({ results: [] });
    }

    const query = q.trim();

    // Refuse if query is too long (rate limiting protection)
    if (query.length > 120) {
      return NextResponse.json({ results: [] });
    }

    // Return empty if query is too short
    if (query.length < 3) {
      return NextResponse.json({ results: [] });
    }

    // Fetch from Nominatim
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&q=${encodeURIComponent(query)}`;

    let response;
    try {
      response = await fetch(url, {
        headers: {
          "User-Agent": "NEFELI/1.0", // Nominatim requires a User-Agent
        },
      });
    } catch (fetchError) {
      console.error("Nominatim fetch error:", fetchError);
      return NextResponse.json({ results: [] });
    }

    if (!response.ok) {
      console.error("Nominatim response not ok:", response.status);
      return NextResponse.json({ results: [] });
    }

    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      console.error("Failed to parse Nominatim response:", parseError);
      return NextResponse.json({ results: [] });
    }

    if (!Array.isArray(data)) {
      return NextResponse.json({ results: [] });
    }

    // Map results to our format
    const results: SearchResult[] = data.map((item: any) => {
      const address = item.address || {};
      const city = address.city || address.town || address.village || address.municipality || null;
      const state = address.state || address.region || null;
      const country = address.country || null;

      // Build label: "city, state, country" or fallback to display_name
      let label = item.display_name || "";
      if (city && state && country) {
        label = `${city}, ${state}, ${country}`;
      } else if (city && country) {
        label = `${city}, ${country}`;
      } else if (state && country) {
        label = `${state}, ${country}`;
      } else if (country) {
        label = country;
      } else if (city) {
        label = city;
      }

      return {
        label,
        city,
        state,
        country,
        lat: Number(item.lat),
        lng: Number(item.lon),
      };
    });

    return NextResponse.json({ results });
  } catch (e: any) {
    console.error("geo search error:", e);
    return NextResponse.json({ results: [] });
  }
}

