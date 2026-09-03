// In-house natal chart — real geocentric positions from astronomy-engine, so
// the app never depends on an external astrology API (which was hitting
// rate-limits / input errors). Planets Sun–Pluto + North Node, a real
// Ascendant & Midheaven, whole-sign houses (the system Co-Star uses), and
// major aspects. Same NatalChart shape the rest of the app expects.

import * as Astronomy from "astronomy-engine";
import { DateTime } from "luxon";
import { SIGNS, SIGN_GLYPHS, PLANET_GLYPHS, ASPECT_GLYPHS } from "./constants";
import { signFromLongitude } from "./sky-weather";
import type { BirthSubject } from "./astrologer-api";
import type { NatalChart, PlanetPosition, HouseCusp, Aspect, AspectType, ZodiacSign } from "./types";

const DEG = Math.PI / 180;
const sinD = (d: number) => Math.sin(d * DEG);
const cosD = (d: number) => Math.cos(d * DEG);
const tanD = (d: number) => Math.tan(d * DEG);
const wrap360 = (d: number) => ((d % 360) + 360) % 360;
/** atan2 in degrees, normalized to [0, 360). */
const atan2D = (y: number, x: number) => wrap360(Math.atan2(y, x) / DEG);

const BODIES: [string, Astronomy.Body][] = [
  ["Moon", Astronomy.Body.Moon], ["Mercury", Astronomy.Body.Mercury],
  ["Venus", Astronomy.Body.Venus], ["Mars", Astronomy.Body.Mars],
  ["Jupiter", Astronomy.Body.Jupiter], ["Saturn", Astronomy.Body.Saturn],
  ["Uranus", Astronomy.Body.Uranus], ["Neptune", Astronomy.Body.Neptune],
  ["Pluto", Astronomy.Body.Pluto],
];

/** Geocentric, of-date ecliptic longitude of a body (degrees). */
function eclipticLon(body: Astronomy.Body, time: Astronomy.AstroTime): number {
  const v = Astronomy.GeoVector(body, time, true);
  const rot = Astronomy.Rotation_EQJ_ECT(time);
  return wrap360(Astronomy.SphereFromVector(Astronomy.RotateVector(rot, v)).lon);
}
function sunLon(time: Astronomy.AstroTime): number {
  return wrap360(Astronomy.SunPosition(time).elon);
}

/** Mean obliquity of the ecliptic (degrees) — Laskar/Meeus. */
function obliquity(time: Astronomy.AstroTime): number {
  const T = time.tt / 36525;
  return 23.439291 - 0.0130042 * T - 1.64e-7 * T * T + 5.04e-7 * T * T * T;
}

/** Mean lunar (North) node longitude (degrees) — always retrograde. */
function meanNode(time: Astronomy.AstroTime): number {
  const T = time.tt / 36525;
  return wrap360(125.0445479 - 1934.1362891 * T + 0.0020754 * T * T);
}

function subjectToUTC(s: BirthSubject): Date {
  const iso = `${s.year}-${String(s.month).padStart(2, "0")}-${String(s.day).padStart(2, "0")}T${String(s.hour).padStart(2, "0")}:${String(s.minute).padStart(2, "0")}`;
  const dt = DateTime.fromISO(iso, { zone: s.timezone || "UTC" });
  return (dt.isValid ? dt : DateTime.fromISO(iso, { zone: "UTC" })).toUTC().toJSDate();
}

function signIndex(lon: number): number {
  return Math.floor(wrap360(lon) / 30);
}

/** Compute the Ascendant and Midheaven ecliptic longitudes (degrees). */
function angles(lstDeg: number, latitude: number, obl: number): { asc: number; mc: number } {
  const ramc = wrap360(lstDeg);
  const mc = atan2D(sinD(ramc), cosD(ramc) * cosD(obl));
  // Standard ascendant formula; normalized to the rising (eastern) point.
  let asc = atan2D(cosD(ramc), -(sinD(ramc) * cosD(obl) + tanD(latitude) * sinD(obl)));
  // The Ascendant must be within ~180° ahead of the MC (rising after culmination
  // point on the ecliptic); flip to the correct semicircle if needed.
  if (wrap360(asc - mc) > 180) asc = wrap360(asc + 180);
  return { asc, mc };
}

const ASPECTS: [AspectType, number][] = [
  ["conjunction", 0], ["sextile", 60], ["square", 90], ["trine", 120], ["opposition", 180],
];
const ORB: Record<AspectType, number> = { conjunction: 8, opposition: 8, trine: 7, square: 7, sextile: 5 };

function planetAspects(planets: { name: string; absoluteDegree: number }[]): Aspect[] {
  const out: Aspect[] = [];
  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      let sep = Math.abs(planets[i].absoluteDegree - planets[j].absoluteDegree) % 360;
      if (sep > 180) sep = 360 - sep;
      for (const [type, angle] of ASPECTS) {
        const orb = Math.abs(sep - angle);
        if (orb <= ORB[type]) {
          out.push({ a: planets[i].name, b: planets[j].name, type, glyph: ASPECT_GLYPHS[type] ?? "", orb: Math.round(orb * 100) / 100, applying: false });
          break;
        }
      }
    }
  }
  return out.sort((a, b) => a.orb - b.orb);
}

function mkPoint(name: string, lon: number, ascLon: number, speed: number): PlanetPosition {
  const sign = signFromLongitude(lon);
  // Whole-sign houses: house 1 = the Ascendant's sign.
  const house = ((signIndex(lon) - signIndex(ascLon) + 12) % 12) + 1;
  return {
    name, sign, signGlyph: SIGN_GLYPHS[sign], glyph: PLANET_GLYPHS[name] ?? "•",
    degree: wrap360(lon) % 30, absoluteDegree: wrap360(lon),
    house, speed: Math.round(speed * 1000) / 1000, retrograde: speed < 0,
  };
}

/** Compute a full natal chart in-house. */
export function computeNatalChart(subject: BirthSubject): NatalChart {
  const utc = subjectToUTC(subject);
  const time = Astronomy.MakeTime(utc);
  const timePlus = Astronomy.MakeTime(new Date(utc.getTime() + 12 * 3600 * 1000)); // +12h for speed
  const obl = obliquity(time);

  // Angles (need the birth time; without it, fall back to a solar chart at 0° Aries asc).
  const gast = Astronomy.SiderealTime(time) * 15; // degrees
  const lst = wrap360(gast + subject.longitude);
  const { asc, mc } = subject.timeUnknown
    ? { asc: sunLon(time), mc: wrap360(sunLon(time) + 270) } // whole-sign from Sun when time unknown
    : angles(lst, subject.latitude, obl);
  const ascLon = asc;

  const lonOf = (name: string, t: Astronomy.AstroTime) =>
    name === "Sun" ? sunLon(t) : name === "North Node" ? meanNode(t)
      : eclipticLon(BODIES.find(([n]) => n === name)![1], t);

  const names = ["Sun", ...BODIES.map(([n]) => n), "North Node"];
  const planets: PlanetPosition[] = names.map((name) => {
    const l1 = lonOf(name, time);
    const l2 = lonOf(name, timePlus);
    let d = l2 - l1;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    const speed = name === "North Node" ? -0.053 : d / 0.5; // deg/day
    return mkPoint(name, l1, ascLon, speed);
  });

  const houses: HouseCusp[] = [];
  for (let i = 0; i < 12; i++) {
    const idx = (signIndex(ascLon) + i) % 12;
    houses.push({ house: i + 1, sign: SIGNS[idx], degree: 0, absoluteDegree: idx * 30 });
  }

  // Aspects among planets + the two angles.
  const aspectPoints = [
    ...planets.map((p) => ({ name: p.name, absoluteDegree: p.absoluteDegree })),
    ...(subject.timeUnknown ? [] : [{ name: "Ascendant", absoluteDegree: asc }, { name: "MC", absoluteDegree: mc }]),
  ];

  const ascendantSign: ZodiacSign = signFromLongitude(asc);
  const sun = planets.find((p) => p.name === "Sun")!;
  const moon = planets.find((p) => p.name === "Moon")!;

  return {
    planets, houses, aspects: planetAspects(aspectPoints),
    ascendantSign, sunSign: sun.sign, moonSign: moon.sign,
    timeUnknown: subject.timeUnknown,
  };
}
