import { NextRequest, NextResponse } from "next/server";
import * as Astronomy from "astronomy-engine";
import { DateTime } from "luxon";
import tzlookup from "tz-lookup";
import { createClient } from "@supabase/supabase-js";

const SIGNS = [
  "Aries","Taurus","Gemini","Cancer","Leo","Virgo",
  "Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces",
] as const;

function normalizeDeg(deg: number) {
  return ((deg % 360) + 360) % 360;
}

function toSign(deg: number) {
  const d = normalizeDeg(deg);
  const signIndex = Math.floor(d / 30);
  return { sign: SIGNS[signIndex], deg: d % 30 };
}

// Mean obliquity (MVP-stable constant)
const EPS_DEG = 23.4392911;

function calcMidheaven(lstDeg: number, epsDeg: number) {
  const θ = (lstDeg * Math.PI) / 180;
  const ε = (epsDeg * Math.PI) / 180;
  const λmc = Math.atan2(Math.sin(θ) * Math.cos(ε), Math.cos(θ)) * (180 / Math.PI);
  return normalizeDeg(λmc);
}

function calcAscendant(lstDeg: number, latDeg: number, epsDeg: number) {
  const θ = (lstDeg * Math.PI) / 180;
  const φ = (latDeg * Math.PI) / 180;
  const ε = (epsDeg * Math.PI) / 180;

  const λasc =
    Math.atan2(
      Math.sin(θ) * Math.cos(ε) - Math.tan(φ) * Math.sin(ε),
      Math.cos(θ)
    ) * (180 / Math.PI);

  return normalizeDeg(λasc);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id } = body ?? {};

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "Missing SUPABASE env vars." },
        { status: 500 }
      );
    }

    if (!user_id) {
      return NextResponse.json({ error: "Missing user_id." }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Fetch lat and lng from profiles
    const { data: profile, error: profReadErr } = await supabase
      .from("profiles")
      .select("birth_date, birth_time, birth_place, lat, lng, tz")
      .eq("user_id", user_id)
      .maybeSingle();

    if (profReadErr) {
      return NextResponse.json({ error: profReadErr.message }, { status: 500 });
    }

    if (!profile?.birth_date) {
      return NextResponse.json({ error: "Birth date is required." }, { status: 400 });
    }

    // Require lat and lng from profile
    const lat = profile.lat as number | null;
    const lng = profile.lng as number | null;

    if (lat == null || lng == null) {
      return NextResponse.json(
        { error: "Birth location is required to calculate Rising and houses." },
        { status: 400 }
      );
    }

    // Resolve timezone with fallback logic
    let resolvedTz: string;
    
    if (profile.tz) {
      // Use existing timezone from profile
      resolvedTz = profile.tz;
    } else if (lat != null && lng != null) {
      // Compute timezone from coordinates
      try {
        resolvedTz = tzlookup(lat, lng);
        
        // Update profiles.tz with this value (one-time save)
        const { error: tzUpdateErr } = await supabase
          .from("profiles")
          .update({ tz: resolvedTz })
          .eq("user_id", user_id);
        
        if (tzUpdateErr) {
          console.error("Failed to update timezone in profile:", tzUpdateErr);
          // Continue anyway - we have the timezone value
        }
      } catch (tzError) {
        return NextResponse.json(
          { error: "Birth location is required to determine timezone." },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "Birth location is required to determine timezone." },
        { status: 400 }
      );
    }

    // Store inputs snapshot in natal_charts.inputs
    const inputs = {
      birth_date: profile.birth_date,
      birth_time: profile.birth_time || null,
      birth_place: profile.birth_place || null,
      lat,
      lng,
      tz: resolvedTz,
    };

    // Convert local birth datetime -> UTC
    if (!profile.birth_time) {
      return NextResponse.json(
        { error: "Birth time is required to calculate Rising and houses." },
        { status: 400 }
      );
    }

    const local = DateTime.fromISO(`${profile.birth_date}T${profile.birth_time}`, { zone: resolvedTz });
    if (!local.isValid) {
      return NextResponse.json({ error: "Invalid birth date/time." }, { status: 400 });
    }

    const utc = local.toUTC().toJSDate();
    const time = new Astronomy.AstroTime(utc);

    // Sun & Moon ecliptic longitude -> sign
    const sunVec = Astronomy.GeoVector(Astronomy.Body.Sun, time, false);
    const sunEcl = Astronomy.Ecliptic(sunVec);
    const sunLon = normalizeDeg(sunEcl.elon);
    const sun = toSign(sunLon);

    const moonVec = Astronomy.GeoVector(Astronomy.Body.Moon, time, false);
    const moonEcl = Astronomy.Ecliptic(moonVec);
    const moonLon = normalizeDeg(moonEcl.elon);
    const moon = toSign(moonLon);

    // Sidereal time -> LST degrees
    const gstHours = Astronomy.SiderealTime(time);
    const lstDeg = normalizeDeg(gstHours * 15 + lng); // east-positive

    // Asc/MC longitudes
    const ascLon = calcAscendant(lstDeg, lat, EPS_DEG);
    const mcLon = calcMidheaven(lstDeg, EPS_DEG);

    const asc = toSign(ascLon);
    const mc = toSign(mcLon);

    // Build chart_json structure
    const chart = {
      sun: { sign: sun.sign, deg: sun.deg },
      moon: { sign: moon.sign, deg: moon.deg },
      rising: { sign: asc.sign, deg: asc.deg },
      mc: { sign: mc.sign, deg: mc.deg },
    };

    // Update profiles with calculated signs and timezone
    const { error: profileUpdateErr } = await supabase
      .from("profiles")
      .update({
        tz: resolvedTz,
        sun_sign: sun.sign,
        moon_sign: moon.sign,
        rising_sign: asc.sign,
        mc_sign: mc.sign,
      })
      .eq("user_id", user_id);

    if (profileUpdateErr) {
      return NextResponse.json({ error: profileUpdateErr.message }, { status: 500 });
    }

    // Insert or update natal_charts with chart_json and inputs snapshot only
    const { error: chartWriteErr } = await supabase
      .from("natal_charts")
      .upsert(
        {
          user_id,
          chart_json: chart,
          inputs,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (chartWriteErr) {
      return NextResponse.json({ error: chartWriteErr.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      placements: {
        sun: sun.sign,
        moon: moon.sign,
        rising: asc.sign,
        mc: mc.sign,
      },
    });
  } catch (e: any) {
    console.error("chart generate error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Internal error" },
      { status: 500 }
    );
  }
}

