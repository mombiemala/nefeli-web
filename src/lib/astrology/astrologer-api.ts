// Astrologer API (RapidAPI) client with a deterministic demo fallback.
// https://rapidapi.com/gbattaglia/api/astrologer
//
// In demo mode (no RAPIDAPI_KEY) every method returns coherent, stable data
// generated locally, so the whole app is explorable without any keys.

import {
  buildDemoChart, buildDemoChartXml, buildDemoMoonPhase, buildDemoTransits,
  buildDemoTransitXml,
} from "./demo-data";
import type {
  Aspect, AspectType, HouseCusp, MoonPhaseData, NatalChart, PlanetPosition,
  Transit, ZodiacSign,
} from "./types";
import { demoEphemeris } from "./utils";
import { ASPECT_GLYPHS, PLANET_GLYPHS, SIGN_GLYPHS } from "./constants";

const BASE = "https://astrologer.p.rapidapi.com";

export interface BirthSubject {
  name: string;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  city: string;
  nation: string;
  latitude: number;
  longitude: number;
  timezone: string;
  timeUnknown: boolean;
}

function headers() {
  return {
    "Content-Type": "application/json",
    "X-RapidAPI-Key": process.env.RAPIDAPI_KEY ?? "",
    "X-RapidAPI-Host": process.env.RAPIDAPI_HOST ?? "astrologer.p.rapidapi.com",
  };
}

/** Shape the subject the way the Astrologer API expects it. */
function apiSubject(s: BirthSubject) {
  return {
    name: s.name,
    year: s.year,
    month: s.month,
    day: s.day,
    hour: s.hour,
    minute: s.minute,
    city: s.city,
    nation: s.nation,
    latitude: s.latitude,
    longitude: s.longitude,
    timezone: s.timezone,
    zodiac_type: "Tropic",
  };
}

function seedKey(s: BirthSubject) {
  return `${s.name}|${s.year}-${s.month}-${s.day}|${s.latitude},${s.longitude}`;
}

// ── Birth chart ──────────────────────────────────────────────

export async function generateBirthChart(
  subject: BirthSubject,
): Promise<{ chart: NatalChart; svg?: string; raw: unknown }> {
  if (demoEphemeris()) {
    const chart = buildDemoChart(seedKey(subject), subject.timeUnknown);
    return { chart, svg: undefined, raw: { demo: true } };
  }
  const res = await fetch(`${BASE}/api/v5/chart/birth-chart`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      subject: apiSubject(subject),
      theme: "dark",
      language: "EN",
    }),
  });
  if (!res.ok) throw new Error(`Astrologer birth-chart failed: ${res.status}`);
  const data = await res.json();
  return {
    chart: mapApiChart(data, subject.timeUnknown),
    svg: data.chart ?? data.svg,
    raw: data,
  };
}

/** AI-optimized XML context — fed directly into the Claude system prompt. */
export async function getBirthChartContext(subject: BirthSubject): Promise<string> {
  if (demoEphemeris()) {
    const chart = buildDemoChart(seedKey(subject), subject.timeUnknown);
    return buildDemoChartXml(subject.name, chart);
  }
  const res = await fetch(`${BASE}/api/v5/context/birth-chart`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ subject: apiSubject(subject) }),
  });
  if (!res.ok) throw new Error(`Astrologer context/birth-chart failed: ${res.status}`);
  const data = await res.json();
  return typeof data === "string" ? data : (data.context ?? JSON.stringify(data));
}

// ── Transits ─────────────────────────────────────────────────

export async function getTransits(
  subject: BirthSubject,
  when: Date,
): Promise<Transit[]> {
  if (demoEphemeris()) {
    const chart = buildDemoChart(seedKey(subject), subject.timeUnknown);
    return buildDemoTransits(chart, when);
  }
  const res = await fetch(`${BASE}/api/v5/chart/transit`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      first_subject: apiSubject(subject),
      transit_subject: transitMoment(subject, when),
    }),
  });
  if (!res.ok) throw new Error(`Astrologer transit failed: ${res.status}`);
  const data = await res.json();
  return mapApiTransits(data, when);
}

export async function getTransitContext(
  subject: BirthSubject,
  when: Date,
): Promise<string> {
  if (demoEphemeris()) {
    const chart = buildDemoChart(seedKey(subject), subject.timeUnknown);
    return buildDemoTransitXml(buildDemoTransits(chart, when), when);
  }
  const res = await fetch(`${BASE}/api/v5/context/transit`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      first_subject: apiSubject(subject),
      transit_subject: transitMoment(subject, when),
    }),
  });
  if (!res.ok) throw new Error(`Astrologer context/transit failed: ${res.status}`);
  const data = await res.json();
  return typeof data === "string" ? data : (data.context ?? JSON.stringify(data));
}

// ── Moon phase ───────────────────────────────────────────────

export async function getMoonPhase(when: Date): Promise<MoonPhaseData> {
  if (demoEphemeris()) return buildDemoMoonPhase(when);
  const res = await fetch(`${BASE}/api/v5/moon-phase`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      year: when.getUTCFullYear(),
      month: when.getUTCMonth() + 1,
      day: when.getUTCDate(),
    }),
  });
  if (!res.ok) throw new Error(`Astrologer moon-phase failed: ${res.status}`);
  const data = await res.json();
  return mapApiMoonPhase(data, when);
}

// ── Mapping helpers (best-effort for the live API) ───────────

function transitMoment(subject: BirthSubject, when: Date) {
  return {
    name: "Transit",
    year: when.getUTCFullYear(),
    month: when.getUTCMonth() + 1,
    day: when.getUTCDate(),
    hour: when.getUTCHours(),
    minute: when.getUTCMinutes(),
    city: subject.city,
    nation: subject.nation,
    latitude: subject.latitude,
    longitude: subject.longitude,
    // The date parts above are read in UTC (getUTC*), so label the moment UTC
    // too — otherwise the API treats e.g. 12:00 UTC as 12:00 in the subject's
    // local zone and the fast bodies (Moon ~0.5°/hr) land degrees off.
    timezone: "UTC",
    zodiac_type: "Tropic",
  };
}

// The Astrologer API (Kerykeion v5) returns planets as *named fields* on the
// subject object (subject.sun, subject.moon, …), houses as first_house…
// twelfth_house, and aspects under chart_data.aspects. See docs/ or a sample
// birth-chart response for the exact shape.

// API field key → the display name the rest of the app expects.
const PLANET_FIELDS: [string, string][] = [
  ["sun", "Sun"], ["moon", "Moon"], ["mercury", "Mercury"], ["venus", "Venus"],
  ["mars", "Mars"], ["jupiter", "Jupiter"], ["saturn", "Saturn"],
  ["uranus", "Uranus"], ["neptune", "Neptune"], ["pluto", "Pluto"],
  ["chiron", "Chiron"], ["mean_north_lunar_node", "North Node"],
  ["true_north_lunar_node", "North Node"], ["mean_south_lunar_node", "South Node"],
  ["mean_lilith", "Lilith"],
];

const HOUSE_FIELDS: [string, number][] = [
  ["first_house", 1], ["second_house", 2], ["third_house", 3],
  ["fourth_house", 4], ["fifth_house", 5], ["sixth_house", 6],
  ["seventh_house", 7], ["eighth_house", 8], ["ninth_house", 9],
  ["tenth_house", 10], ["eleventh_house", 11], ["twelfth_house", 12],
];

/** Build a PlanetPosition from a raw named body on the subject. */
function toPlanet(raw: any, name: string): PlanetPosition {
  const sign = normaliseSign(raw.sign);
  return {
    name,
    sign,
    signGlyph: SIGN_GLYPHS[sign] ?? "",
    glyph: PLANET_GLYPHS[name] ?? raw.emoji ?? "•",
    degree: Number(raw.position ?? 0),
    absoluteDegree: Number(raw.abs_pos ?? 0),
    house: houseNumber(raw.house),
    speed: Number(raw.speed ?? 0),
    retrograde: Boolean(raw.retrograde),
  };
}

export function mapApiChart(data: any, timeUnknown: boolean): NatalChart {
  // Kerykeion nests the real payload under chart_data; fall back gracefully.
  const cd = data.chart_data ?? data.data ?? data;
  const subj = cd.subject ?? cd;

  const planets: PlanetPosition[] = [];
  for (const [key, name] of PLANET_FIELDS) {
    const raw = subj[key];
    // Skip duplicates: mean_* and true_* node fields both map to "North Node".
    if (raw && typeof raw === "object" && !planets.some((p) => p.name === name)) {
      planets.push(toPlanet(raw, name));
    }
  }

  // Angles (Ascendant / Midheaven) come from the house cusps, not the bodies.
  const asc = subj.first_house ?? subj.ascendant;
  const mc = subj.tenth_house ?? subj.medium_coeli;
  if (asc?.sign) {
    const sign = normaliseSign(asc.sign);
    planets.push({
      name: "Ascendant", sign, signGlyph: SIGN_GLYPHS[sign] ?? "",
      glyph: PLANET_GLYPHS.Ascendant, degree: Number(asc.position ?? 0),
      absoluteDegree: Number(asc.abs_pos ?? 0), house: 1, speed: 0, retrograde: false,
    });
  }
  if (mc?.sign) {
    const sign = normaliseSign(mc.sign);
    planets.push({
      name: "Midheaven", sign, signGlyph: SIGN_GLYPHS[sign] ?? "",
      glyph: PLANET_GLYPHS.Midheaven, degree: Number(mc.position ?? 0),
      absoluteDegree: Number(mc.abs_pos ?? 0), house: 10, speed: 0, retrograde: false,
    });
  }

  const houses: HouseCusp[] = [];
  for (const [key, num] of HOUSE_FIELDS) {
    const raw = subj[key];
    if (raw && typeof raw === "object" && raw.sign) {
      const sign = normaliseSign(raw.sign);
      houses.push({
        house: num, sign,
        degree: Number(raw.position ?? 0),
        absoluteDegree: Number(raw.abs_pos ?? 0),
      });
    }
  }

  const rawAspects: any[] = cd.aspects ?? data.aspects ?? [];
  const aspects: Aspect[] = [];
  for (const a of rawAspects) {
    const type = normaliseAspect(a.aspect ?? a.aspect_name);
    if (!type) continue; // keep the five major aspects
    aspects.push({
      a: titlePlanet(a.p1_name),
      b: titlePlanet(a.p2_name),
      type,
      glyph: ASPECT_GLYPHS[type] ?? "",
      orb: Math.abs(Number(a.orbit ?? a.orb ?? 0)),
      applying: /apply/i.test(String(a.aspect_movement ?? "")),
    });
  }

  const signOf = (n: string): ZodiacSign =>
    planets.find((p) => p.name === n)?.sign ?? "Aries";
  return {
    planets,
    houses,
    aspects,
    ascendantSign: signOf("Ascendant"),
    sunSign: signOf("Sun"),
    moonSign: signOf("Moon"),
    svg: data.chart ?? cd.chart,
    timeUnknown,
  };
}

const ASPECT_INTENSITY: Record<AspectType, 1 | 2 | 3 | 4 | 5> = {
  conjunction: 5, opposition: 4, square: 4, trine: 3, sextile: 2,
};

export function mapApiTransits(data: any, when: Date): Transit[] {
  const cd = data.chart_data ?? data.data ?? data;
  const rawAspects: any[] = cd.aspects ?? data.aspects ?? data.transits ?? [];
  const iso = when.toISOString().slice(0, 10);
  const out: Transit[] = [];
  for (const a of rawAspects) {
    const aspect = normaliseAspect(a.aspect ?? a.aspect_name);
    if (!aspect) continue;
    // p*_owner tells us which side is the moving (transit) body vs the natal one.
    const p1IsTransit = /transit/i.test(String(a.p1_owner ?? ""));
    const transiting = p1IsTransit ? a.p1_name : a.p2_name;
    const natal = p1IsTransit ? a.p2_name : a.p1_name;
    out.push({
      transitingPlanet: titlePlanet(transiting),
      aspect,
      natalPlanet: titlePlanet(natal),
      glyph: ASPECT_GLYPHS[aspect] ?? "",
      exactDate: iso,
      startDate: iso,
      endDate: iso,
      house: 0,
      intensity: ASPECT_INTENSITY[aspect],
      meaning: a.description ?? "",
    });
  }
  return out;
}

export function mapApiMoonPhase(data: any, when: Date): MoonPhaseData {
  const fallback = buildDemoMoonPhase(when);
  // The /moon-phase endpoint nests the details under moon_phase_overview.moon.
  const m = data.moon_phase_overview?.moon ?? data.moon ?? data;
  const illum = m.illumination ?? m.illumination_percentage;
  return {
    phaseName: m.phase_name ?? m.moon_phase_name ?? fallback.phaseName,
    emoji: m.emoji ?? m.moon_emoji ?? fallback.emoji,
    illumination: typeof illum === "number"
      ? (illum <= 1 ? Math.round(illum * 100) : Math.round(illum))
      : fallback.illumination,
    moonSign: m.moon_sign ? normaliseSign(m.moon_sign) : fallback.moonSign,
  };
}

export function titlePlanet(n: string): string {
  if (!n) return "";
  // "Mean_North_Lunar_Node" → "North Node"; "Sun" stays "Sun".
  const key = n.toLowerCase().replace(/[\s_-]+/g, "_");
  const hit = PLANET_FIELDS.find(([k]) => k === key);
  if (hit) return hit[1];
  return n
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function houseNumber(h: any): number {
  if (typeof h === "number") return h;
  if (!h || typeof h !== "string") return 0;
  const map: Record<string, number> = {
    first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6,
    seventh: 7, eighth: 8, ninth: 9, tenth: 10, eleventh: 11, twelfth: 12,
  };
  return map[h.toLowerCase().split("_")[0]] ?? 0;
}

const ASPECT_ALIASES: Record<string, AspectType> = {
  conjunction: "conjunction", opposition: "opposition",
  trine: "trine", square: "square", sextile: "sextile",
};

/** Normalise the API aspect name to one of the five majors, or null. */
export function normaliseAspect(a: string): AspectType | null {
  if (!a) return null;
  return ASPECT_ALIASES[a.toLowerCase()] ?? null;
}

export function normaliseSign(s: string): ZodiacSign {
  const map: Record<string, ZodiacSign> = {
    Ari: "Aries", Tau: "Taurus", Gem: "Gemini", Can: "Cancer", Leo: "Leo",
    Vir: "Virgo", Lib: "Libra", Sco: "Scorpio", Sag: "Sagittarius",
    Cap: "Capricorn", Aqu: "Aquarius", Pis: "Pisces",
  };
  if (!s) return "Aries";
  const key = s.slice(0, 3);
  const norm = key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
  return map[norm] ?? map[key] ?? (s as ZodiacSign);
}
