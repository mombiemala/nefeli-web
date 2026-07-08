// Astrologer API (RapidAPI) client with a deterministic demo fallback.
// https://rapidapi.com/gbattaglia/api/astrologer
//
// In demo mode (no RAPIDAPI_KEY) every method returns coherent, stable data
// generated locally, so the whole app is explorable without any keys.

import {
  buildDemoChart, buildDemoChartXml, buildDemoMoonPhase, buildDemoTransits,
  buildDemoTransitXml,
} from "./demo-data";
import type { MoonPhaseData, NatalChart, Transit } from "./types";
import { demoEphemeris } from "./utils";
import { PLANET_GLYPHS, SIGN_GLYPHS } from "./constants";
import type { PlanetPosition, ZodiacSign } from "./types";

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
    year: when.getUTCFullYear(),
    month: when.getUTCMonth() + 1,
    day: when.getUTCDate(),
    hour: when.getUTCHours(),
    minute: when.getUTCMinutes(),
    city: subject.city,
    nation: subject.nation,
    latitude: subject.latitude,
    longitude: subject.longitude,
    timezone: subject.timezone,
  };
}

function mapApiChart(data: any, timeUnknown: boolean): NatalChart {
  const subj = data.data ?? data.subject ?? data;
  const bodies: any[] = subj.planets ?? subj.bodies ?? [];
  const planets: PlanetPosition[] = bodies.map((b: any) => {
    const sign = normaliseSign(b.sign ?? b.sign_name);
    return {
      name: titlePlanet(b.name),
      sign,
      signGlyph: SIGN_GLYPHS[sign] ?? "",
      glyph: PLANET_GLYPHS[titlePlanet(b.name)] ?? "•",
      degree: b.position ?? b.degree ?? 0,
      absoluteDegree: b.abs_pos ?? b.absolute_degree ?? 0,
      house: houseNumber(b.house),
      speed: b.speed ?? 0,
      retrograde: Boolean(b.retrograde),
    };
  });
  const find = (n: string) => planets.find((p) => p.name === n)?.sign ?? "Aries";
  return {
    planets,
    houses: [],
    aspects: [],
    ascendantSign: find("Ascendant"),
    sunSign: find("Sun"),
    moonSign: find("Moon"),
    svg: data.chart,
    timeUnknown,
  };
}

function mapApiTransits(data: any, when: Date): Transit[] {
  const aspects: any[] = data.aspects ?? data.transits ?? [];
  return aspects.map((a: any) => ({
    transitingPlanet: titlePlanet(a.p1_name ?? a.transiting ?? ""),
    aspect: (a.aspect ?? "conjunction").toLowerCase(),
    natalPlanet: titlePlanet(a.p2_name ?? a.natal ?? ""),
    glyph: "",
    exactDate: when.toISOString().slice(0, 10),
    startDate: when.toISOString().slice(0, 10),
    endDate: when.toISOString().slice(0, 10),
    house: houseNumber(a.house),
    intensity: 3,
    meaning: a.description ?? "",
  }));
}

function mapApiMoonPhase(data: any, when: Date): MoonPhaseData {
  const fallback = buildDemoMoonPhase(when);
  return {
    phaseName: data.moon_phase_name ?? data.phase_name ?? fallback.phaseName,
    emoji: data.emoji ?? fallback.emoji,
    illumination: data.illumination ?? fallback.illumination,
    moonSign: normaliseSign(data.moon_sign) ?? fallback.moonSign,
  };
}

function titlePlanet(n: string): string {
  if (!n) return "";
  return n.charAt(0).toUpperCase() + n.slice(1).toLowerCase();
}

function houseNumber(h: any): number {
  if (typeof h === "number") return h;
  const map: Record<string, number> = {
    First_House: 1, Second_House: 2, Third_House: 3, Fourth_House: 4,
    Fifth_House: 5, Sixth_House: 6, Seventh_House: 7, Eighth_House: 8,
    Ninth_House: 9, Tenth_House: 10, Eleventh_House: 11, Twelfth_House: 12,
  };
  return map[h] ?? 1;
}

function normaliseSign(s: string): ZodiacSign {
  const map: Record<string, ZodiacSign> = {
    Ari: "Aries", Tau: "Taurus", Gem: "Gemini", Can: "Cancer", Leo: "Leo",
    Vir: "Virgo", Lib: "Libra", Sco: "Scorpio", Sag: "Sagittarius",
    Cap: "Capricorn", Aqu: "Aquarius", Pis: "Pisces",
  };
  if (!s) return "Aries";
  const key = s.slice(0, 3);
  return map[key] ?? (s as ZodiacSign);
}
