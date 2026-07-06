import type { BirthProfile } from "@prisma/client";
import type { BirthSubject } from "./astrologer-api";
import {
  HOUSE_THEMES, SIGN_ELEMENT, SIGN_KEYWORDS, SIGN_MODALITY,
} from "./astrology-constants";
import type { NatalChart, PlanetPosition, ZodiacSign } from "./types";

/** Convert a stored BirthProfile row into an Astrologer API subject. */
export function profileToSubject(p: BirthProfile): BirthSubject {
  const d = new Date(p.birthDate);
  let hour = 12;
  let minute = 0;
  if (p.birthTime && !p.timeUnknown) {
    const [h, m] = p.birthTime.split(":").map(Number);
    hour = Number.isFinite(h) ? h : 12;
    minute = Number.isFinite(m) ? m : 0;
  }
  return {
    name: p.name,
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour,
    minute,
    city: p.birthCity,
    nation: p.birthCountry,
    latitude: p.latitude,
    longitude: p.longitude,
    timezone: p.timezone,
    timeUnknown: p.timeUnknown,
  };
}

/** "12°34′ Leo" style label. */
export function formatDegree(p: PlanetPosition): string {
  const deg = Math.floor(p.degree);
  const min = Math.round((p.degree - deg) * 60);
  return `${deg}°${min.toString().padStart(2, "0")}′ ${p.sign}`;
}

export function signProfile(sign: ZodiacSign) {
  return {
    element: SIGN_ELEMENT[sign],
    modality: SIGN_MODALITY[sign],
    keywords: SIGN_KEYWORDS[sign],
  };
}

export function houseTheme(house: number): string {
  return HOUSE_THEMES[house] ?? "";
}

/** A short, non-AI base description used as a fallback / preview. */
export function basePlacementDescription(p: PlanetPosition): string {
  const { keywords } = signProfile(p.sign);
  const retro = p.retrograde ? " Retrograde here turns this energy inward and reflective." : "";
  return `${p.name} in ${p.sign} (${keywords}) sits in your ${ordinal(p.house)} house — the domain of ${houseTheme(p.house).toLowerCase()}.${retro}`;
}

export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

/** Count element/modality balance across the chart's core planets. */
export function elementBalance(chart: NatalChart) {
  const core = chart.planets.filter(
    (p) => !["Ascendant", "Midheaven"].includes(p.name),
  );
  const elements = { Fire: 0, Earth: 0, Air: 0, Water: 0 };
  const modality = { Cardinal: 0, Fixed: 0, Mutable: 0 };
  for (const p of core) {
    elements[SIGN_ELEMENT[p.sign]]++;
    modality[SIGN_MODALITY[p.sign]]++;
  }
  return { elements, modality };
}

export function bigThree(chart: NatalChart) {
  return {
    sun: chart.planets.find((p) => p.name === "Sun")?.sign ?? chart.sunSign,
    moon: chart.planets.find((p) => p.name === "Moon")?.sign ?? chart.moonSign,
    rising: chart.ascendantSign,
  };
}
