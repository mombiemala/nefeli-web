// Astrocartography — planetary lines across the globe, computed in-house from
// the birth moment (no external API, so it works in demo mode too).
//
// For each planet we draw the four "angular" lines: where the planet is on the
// Midheaven (MC), Imum Coeli (IC), Ascendant (ASC, rising) and Descendant
// (DSC, setting). MC/IC are meridians (vertical); ASC/DSC are curves in
// latitude. All four depend on the exact birth time, so an unknown time yields
// no lines.

import * as Astronomy from "astronomy-engine";
import { DateTime } from "luxon";

export type Angle = "MC" | "IC" | "ASC" | "DSC";

export interface LinePoint { lat: number; lon: number }

export interface PlanetLine {
  planet: string;
  angle: Angle;
  color: string;
  /** MC/IC: two endpoints of a vertical meridian. ASC/DSC: a sampled curve. */
  points: LinePoint[];
}

export interface AstroMap {
  lines: PlanetLine[];
  timeUnknown: boolean;
}

export interface NearbyLine {
  planet: string;
  angle: Angle;
  /** Longitudinal distance from the query point, in degrees (smaller = closer). */
  orbDeg: number;
}

export interface BirthMoment {
  date: string;              // YYYY-MM-DD
  time: string | null;       // HH:mm (local), null if unknown
  timeUnknown: boolean;
  timezone: string;
  latitude: number;
  longitude: number;
}

// The classic astrocartography set (Sun through Pluto).
const BODIES: [string, Astronomy.Body][] = [
  ["Sun", Astronomy.Body.Sun],
  ["Moon", Astronomy.Body.Moon],
  ["Mercury", Astronomy.Body.Mercury],
  ["Venus", Astronomy.Body.Venus],
  ["Mars", Astronomy.Body.Mars],
  ["Jupiter", Astronomy.Body.Jupiter],
  ["Saturn", Astronomy.Body.Saturn],
  ["Uranus", Astronomy.Body.Uranus],
  ["Neptune", Astronomy.Body.Neptune],
  ["Pluto", Astronomy.Body.Pluto],
];

export const PLANET_LINE_COLOR: Record<string, string> = {
  Sun: "#f4c77b", Moon: "#c9d4e3", Mercury: "#9fd8c9", Venus: "#f0a6c8",
  Mars: "#e06c75", Jupiter: "#c9a0f0", Saturn: "#c8b68a", Uranus: "#7fb4e0",
  Neptune: "#6fb1c9", Pluto: "#b08fa8",
};

const DEG = Math.PI / 180;
const tanD = (d: number) => Math.tan(d * DEG);
const acosD = (x: number) => Math.acos(x) / DEG;

/** Wrap a longitude to [-180, 180). */
function norm(lon: number): number {
  return ((((lon + 180) % 360) + 360) % 360) - 180;
}

/** Convert a local birth date/time in a timezone to a UTC JS Date. */
export function birthToUTC(date: string, time: string, zone: string): Date | null {
  // Normalize "H:m" → "HH:mm" so the ISO string is well-formed.
  const [hh, mm] = time.split(":");
  const iso = `${date}T${hh.padStart(2, "0")}:${(mm ?? "0").padStart(2, "0")}`;
  const dt = DateTime.fromISO(iso, { zone: zone || "UTC" });
  if (!dt.isValid) return null;
  return dt.toUTC().toJSDate();
}

/** Geocentric, of-date right ascension (hours) and declination (deg). */
function raDec(body: Astronomy.Body, time: Astronomy.AstroTime): { ra: number; dec: number } {
  const eqj = Astronomy.GeoVector(body, time, true);
  const rot = Astronomy.Rotation_EQJ_EQD(time);
  const eqd = Astronomy.RotateVector(rot, eqj);
  const eq = Astronomy.EquatorFromVector(eqd);
  return { ra: eq.ra, dec: eq.dec };
}

const LAT_MIN = -85;
const LAT_MAX = 85;
const LAT_STEP = 3;

/** Compute every planet's four angular lines for a birth moment. */
export function computeAstroMap(birth: BirthMoment): AstroMap {
  if (birth.timeUnknown || !birth.time) return { lines: [], timeUnknown: true };

  const utc = birthToUTC(birth.date, birth.time, birth.timezone);
  if (!utc) return { lines: [], timeUnknown: true };

  const time = Astronomy.MakeTime(utc);
  const gastDeg = Astronomy.SiderealTime(time) * 15; // Greenwich sidereal time, degrees

  const lines: PlanetLine[] = [];
  for (const [name, body] of BODIES) {
    const { ra, dec } = raDec(body, time);
    const raDeg = ra * 15;
    const color = PLANET_LINE_COLOR[name] ?? "#f4c77b";

    // MC where local sidereal time == RA; IC is the opposite meridian.
    const lonMC = norm(raDeg - gastDeg);
    const lonIC = norm(lonMC + 180);
    lines.push({ planet: name, angle: "MC", color, points: [{ lat: LAT_MIN, lon: lonMC }, { lat: LAT_MAX, lon: lonMC }] });
    lines.push({ planet: name, angle: "IC", color, points: [{ lat: LAT_MIN, lon: lonIC }, { lat: LAT_MAX, lon: lonIC }] });

    // ASC (rising, hour angle −H) and DSC (setting, hour angle +H), where
    // cos(H) = −tan(lat)·tan(dec). Undefined (circumpolar) beyond a latitude.
    const asc: LinePoint[] = [];
    const dsc: LinePoint[] = [];
    for (let lat = LAT_MIN; lat <= LAT_MAX; lat += LAT_STEP) {
      const cosH = -tanD(lat) * tanD(dec);
      if (cosH < -1 || cosH > 1) continue;
      const H = acosD(cosH); // 0..180
      asc.push({ lat, lon: norm(-H + raDeg - gastDeg) });
      dsc.push({ lat, lon: norm(H + raDeg - gastDeg) });
    }
    if (asc.length > 1) lines.push({ planet: name, angle: "ASC", color, points: asc });
    if (dsc.length > 1) lines.push({ planet: name, angle: "DSC", color, points: dsc });
  }

  return { lines, timeUnknown: false };
}

/** The line's longitude at a given latitude (linear interpolation), or null. */
function lonAtLat(line: PlanetLine, lat: number): number | null {
  const pts = line.points;
  if (line.angle === "MC" || line.angle === "IC") return pts[0].lon;
  if (lat < pts[0].lat || lat > pts[pts.length - 1].lat) return null;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    if (lat >= a.lat && lat <= b.lat) {
      // Interpolate, guarding the antimeridian wrap.
      const f = (lat - a.lat) / (b.lat - a.lat);
      let dlon = b.lon - a.lon;
      if (dlon > 180) dlon -= 360;
      if (dlon < -180) dlon += 360;
      return norm(a.lon + f * dlon);
    }
  }
  return null;
}

/** Planetary lines running near a location, closest first (within orbDeg). */
export function linesNear(map: AstroMap, lat: number, lon: number, orbDeg = 5): NearbyLine[] {
  const out: NearbyLine[] = [];
  for (const line of map.lines) {
    const lineLon = lonAtLat(line, lat);
    if (lineLon === null) continue;
    const orb = Math.abs(norm(lineLon - lon));
    if (orb <= orbDeg) out.push({ planet: line.planet, angle: line.angle, orbDeg: Math.round(orb * 10) / 10 });
  }
  return out.sort((a, b) => a.orbDeg - b.orbDeg);
}
