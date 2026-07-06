// Deterministic demo data so Luminary runs with zero API keys.
// NOT astronomically accurate — it produces a coherent, stable chart per
// birth profile so the whole experience is explorable in demo mode.

import {
  ASPECT_ANGLE, ASPECT_GLYPHS, PLANET_GLYPHS, SIGNS, SIGN_GLYPHS,
} from "./astrology-constants";
import type {
  Aspect, AspectType, HouseCusp, MoonPhaseData, NatalChart,
  PlanetPosition, Transit, ZodiacSign,
} from "./types";

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function signFromAbsolute(abs: number): ZodiacSign {
  return SIGNS[Math.floor((abs % 360) / 30)];
}

const DEMO_PLANETS = [
  "Sun", "Moon", "Mercury", "Venus", "Mars",
  "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto", "Chiron", "North Node",
];

export function buildDemoChart(seedKey: string, timeUnknown: boolean): NatalChart {
  const rand = mulberry32(hash(seedKey));
  const planets: PlanetPosition[] = [];

  // Ascendant + houses (equal-house from a seeded ascendant degree).
  const ascAbs = rand() * 360;
  const ascSign = signFromAbsolute(ascAbs);
  const houses: HouseCusp[] = [];
  for (let i = 0; i < 12; i++) {
    const abs = (ascAbs + i * 30) % 360;
    houses.push({
      house: i + 1,
      sign: signFromAbsolute(abs),
      degree: abs % 30,
      absoluteDegree: abs,
    });
  }

  const houseOf = (abs: number) => {
    const rel = (((abs - ascAbs) % 360) + 360) % 360;
    return Math.floor(rel / 30) + 1;
  };

  for (const name of DEMO_PLANETS) {
    const abs = rand() * 360;
    const retro = name !== "Sun" && name !== "Moon" && rand() < 0.22;
    const baseSpeed =
      name === "Moon" ? 13 : name === "Sun" ? 1 : name === "Mercury" ? 1.3 : 0.6;
    planets.push({
      name,
      sign: signFromAbsolute(abs),
      signGlyph: SIGN_GLYPHS[signFromAbsolute(abs)],
      glyph: PLANET_GLYPHS[name] ?? "•",
      degree: abs % 30,
      absoluteDegree: abs,
      house: houseOf(abs),
      speed: retro ? -baseSpeed : baseSpeed,
      retrograde: retro,
    });
  }

  // Ascendant & Midheaven as chart points.
  planets.push({
    name: "Ascendant",
    sign: ascSign,
    signGlyph: SIGN_GLYPHS[ascSign],
    glyph: "AC",
    degree: ascAbs % 30,
    absoluteDegree: ascAbs,
    house: 1,
    speed: 0,
    retrograde: false,
  });
  const mcAbs = (ascAbs + 270) % 360;
  planets.push({
    name: "Midheaven",
    sign: signFromAbsolute(mcAbs),
    signGlyph: SIGN_GLYPHS[signFromAbsolute(mcAbs)],
    glyph: "MC",
    degree: mcAbs % 30,
    absoluteDegree: mcAbs,
    house: 10,
    speed: 0,
    retrograde: false,
  });

  const aspects = computeAspects(planets);

  return {
    planets,
    houses,
    aspects,
    ascendantSign: ascSign,
    sunSign: planets.find((p) => p.name === "Sun")!.sign,
    moonSign: planets.find((p) => p.name === "Moon")!.sign,
    timeUnknown,
  };
}

export function computeAspects(planets: PlanetPosition[]): Aspect[] {
  const majors: [AspectType, number, number][] = [
    ["conjunction", 0, 8],
    ["opposition", 180, 8],
    ["trine", 120, 7],
    ["square", 90, 7],
    ["sextile", 60, 5],
  ];
  const core = planets.filter((p) => p.name !== "Ascendant" && p.name !== "Midheaven");
  const out: Aspect[] = [];
  for (let i = 0; i < core.length; i++) {
    for (let j = i + 1; j < core.length; j++) {
      let diff = Math.abs(core[i].absoluteDegree - core[j].absoluteDegree) % 360;
      if (diff > 180) diff = 360 - diff;
      for (const [type, angle, maxOrb] of majors) {
        const orb = Math.abs(diff - angle);
        if (orb <= maxOrb) {
          out.push({
            a: core[i].name,
            b: core[j].name,
            type,
            glyph: ASPECT_GLYPHS[type],
            orb: Math.round(orb * 10) / 10,
            applying: core[i].speed > core[j].speed,
          });
          break;
        }
      }
    }
  }
  return out.sort((a, b) => a.orb - b.orb);
}

const MOON_PHASES: [string, string][] = [
  ["New Moon", "🌑"], ["Waxing Crescent", "🌒"], ["First Quarter", "🌓"],
  ["Waxing Gibbous", "🌔"], ["Full Moon", "🌕"], ["Waning Gibbous", "🌖"],
  ["Last Quarter", "🌗"], ["Waning Crescent", "🌘"],
];

export function buildDemoMoonPhase(date: Date): MoonPhaseData {
  // Synodic month ~29.53 days; anchor to a fixed epoch new moon.
  const epoch = Date.UTC(2000, 0, 6, 18, 14); // known new moon
  const days = (date.getTime() - epoch) / 86400000;
  const pos = ((days % 29.53059) + 29.53059) % 29.53059;
  const idx = Math.floor((pos / 29.53059) * 8) % 8;
  const [phaseName, emoji] = MOON_PHASES[idx];
  const illumination = Math.round((1 - Math.cos((pos / 29.53059) * 2 * Math.PI)) * 50);
  // Moon moves ~13.2°/day.
  const moonAbs = (days * 13.176) % 360;
  return {
    phaseName,
    emoji,
    illumination,
    moonSign: signFromAbsolute(((moonAbs % 360) + 360) % 360),
  };
}

const TRANSIT_MEANINGS: Record<string, string> = {
  conjunction: "a fusion of energies — a fresh cycle begins here",
  opposition: "a relationship or balance point comes to a head",
  trine: "an easeful flow, an open door worth walking through",
  square: "productive friction that asks you to grow",
  sextile: "a gentle opportunity that rewards a small effort",
};

export function buildDemoTransits(chart: NatalChart, date: Date): Transit[] {
  const rand = mulberry32(hash(chart.ascendantSign + date.toDateString()));
  const transiting = ["Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Pluto"];
  const natal = chart.planets.filter(
    (p) => !["Ascendant", "Midheaven", "North Node", "Chiron"].includes(p.name),
  );
  const aspectKinds: AspectType[] = ["conjunction", "trine", "square", "sextile", "opposition"];
  const out: Transit[] = [];
  const count = 5 + Math.floor(rand() * 4);
  for (let i = 0; i < count; i++) {
    const tp = transiting[Math.floor(rand() * transiting.length)];
    const np = natal[Math.floor(rand() * natal.length)];
    const aspect = aspectKinds[Math.floor(rand() * aspectKinds.length)];
    const offset = Math.floor(rand() * 7) - 2;
    const exact = new Date(date.getTime() + offset * 86400000);
    out.push({
      transitingPlanet: tp,
      aspect,
      natalPlanet: np.name,
      glyph: ASPECT_GLYPHS[aspect],
      exactDate: exact.toISOString().slice(0, 10),
      startDate: new Date(exact.getTime() - 2 * 86400000).toISOString().slice(0, 10),
      endDate: new Date(exact.getTime() + 2 * 86400000).toISOString().slice(0, 10),
      house: np.house,
      intensity: (Math.floor(rand() * 5) + 1) as Transit["intensity"],
      meaning: `Transiting ${tp} ${aspect} your natal ${np.name}: ${TRANSIT_MEANINGS[aspect]}.`,
    });
  }
  return out.sort((a, b) => b.intensity - a.intensity);
}

/** Build the AI-context XML string the way the Astrologer API would. */
export function buildDemoChartXml(name: string, chart: NatalChart): string {
  const planetLines = chart.planets
    .map(
      (p) =>
        `    <body name="${p.name}" sign="${p.sign}" degree="${p.degree.toFixed(2)}" house="${p.house}" retrograde="${p.retrograde}" />`,
    )
    .join("\n");
  const aspectLines = chart.aspects
    .slice(0, 20)
    .map((a) => `    <aspect between="${a.a}" and="${a.b}" type="${a.type}" orb="${a.orb}" />`)
    .join("\n");
  return `<natal-chart subject="${name}">
  <ascendant sign="${chart.ascendantSign}" />
  <sun sign="${chart.sunSign}" />
  <moon sign="${chart.moonSign}" />
  <bodies>
${planetLines}
  </bodies>
  <aspects>
${aspectLines}
  </aspects>
</natal-chart>`;
}

export function buildDemoTransitXml(transits: Transit[], date: Date): string {
  const lines = transits
    .map(
      (t) =>
        `    <transit transiting="${t.transitingPlanet}" aspect="${t.aspect}" natal="${t.natalPlanet}" exact="${t.exactDate}" house="${t.house}" intensity="${t.intensity}" />`,
    )
    .join("\n");
  return `<current-transits date="${date.toISOString().slice(0, 10)}">
${lines}
</current-transits>`;
}
