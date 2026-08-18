// Energy calendar — a forward-looking "how supportive is the sky for *you*"
// score per day, and best-timing windows for an intention. Built on the same
// transit-to-natal machinery as the rest of the kit, so it runs in demo mode.
//
// The score is a warm heuristic, not a verdict: flowing transits to your natal
// planets lift it, hard ones lower it, and the fast-moving Moon gives the curve
// its day-to-day shape. An intention (love, career, rest…) weights the planets
// that matter for it.

import { transitingPositions } from "./transiting-positions";
import { synastryAspects, type SynPlanet, type SynastryAspect } from "./synastry";
import type { AspectType } from "./types";

export type Intention = "general" | "love" | "career" | "rest" | "social" | "growth";

export const INTENTIONS: { key: Intention; label: string }[] = [
  { key: "general", label: "Overall" },
  { key: "love", label: "Love & connection" },
  { key: "career", label: "Work & money" },
  { key: "rest", label: "Rest & healing" },
  { key: "social", label: "Socialising" },
  { key: "growth", label: "Growth & risk" },
];

const FAVORED: Record<Intention, string[]> = {
  general: [],
  love: ["Venus", "Moon", "Mars"],
  career: ["Sun", "Saturn", "Jupiter", "Mars", "MC", "Midheaven"],
  rest: ["Moon", "Neptune", "Venus"],
  social: ["Mercury", "Venus", "Jupiter"],
  growth: ["Jupiter", "Sun", "Uranus"],
};

const ASPECT_WEIGHT: Record<AspectType, number> = {
  trine: 2, sextile: 1.2, conjunction: 0.8, square: -1.5, opposition: -1.2,
};

// Fast bodies give the calendar meaningful day-to-day movement.
const TRANSIT_BODIES = ["Moon", "Sun", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"];
// Natal points worth activating (angles included when the birth time is known).
const NATAL_TARGETS = [
  "Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn",
  "Uranus", "Neptune", "Pluto", "Ascendant", "MC", "Midheaven",
];

/** Pull the natal points an energy read should consider. */
export function energyTargets(planets: { name: string; absoluteDegree: number }[]): SynPlanet[] {
  return planets
    .filter((p) => NATAL_TARGETS.includes(p.name))
    .map((p) => ({ name: p.name, absoluteDegree: p.absoluteDegree }));
}

function multiplier(aspect: SynastryAspect, intention: Intention): number {
  const favored = FAVORED[intention];
  if (favored.length === 0) return 1;
  return favored.includes(aspect.a) || favored.includes(aspect.b) ? 2 : 1;
}

export interface DayEnergy {
  score: number;                       // 0–100 (50 = neutral)
  supportive: SynastryAspect | null;   // the day's strongest lift
  challenging: SynastryAspect | null;  // the day's strongest drag
}

/** Energy for one moment (defaults to noon of the given date's UTC day). */
export function dayEnergy(natal: SynPlanet[], when: Date, intention: Intention = "general"): DayEnergy {
  const sky = transitingPositions(when).filter((p) => TRANSIT_BODIES.includes(p.name));
  const aspects = synastryAspects(sky, natal, 6);

  let sum = 0;
  let supportive: SynastryAspect | null = null;
  let challenging: SynastryAspect | null = null;
  let bestUp = 0, bestDown = 0;
  for (const a of aspects) {
    const base = ASPECT_WEIGHT[a.type] * (1 - a.orb / 12);
    const contrib = base * multiplier(a, intention);
    sum += contrib;
    if (contrib > bestUp) { bestUp = contrib; supportive = a; }
    if (contrib < bestDown) { bestDown = contrib; challenging = a; }
  }
  const score = Math.max(0, Math.min(100, Math.round(50 + sum * 5)));
  return { score, supportive, challenging };
}

export interface CalendarDay { date: string; score: number }

/** A day-by-day energy curve starting from `start` (UTC), sampled at noon. */
export function energyCalendar(natal: SynPlanet[], start: Date, days: number, intention: Intention = "general"): CalendarDay[] {
  const out: CalendarDay[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + i, 12, 0, 0));
    const iso = d.toISOString().slice(0, 10);
    out.push({ date: iso, score: dayEnergy(natal, d, intention).score });
  }
  return out;
}

export interface Window { date: string; score: number; reason: SynastryAspect | null }

/** The best upcoming days for an intention, strongest first. */
export function bestWindows(natal: SynPlanet[], start: Date, days: number, intention: Intention, top = 5): Window[] {
  const scored: Window[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + i, 12, 0, 0));
    const e = dayEnergy(natal, d, intention);
    scored.push({ date: d.toISOString().slice(0, 10), score: e.score, reason: e.supportive });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, top);
}
