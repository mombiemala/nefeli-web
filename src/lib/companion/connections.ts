// Relationship "reach out" signals.
//
// For each saved person we read the week ahead for a standout window in the
// weather between the user and them — a warm one (Venus/Sun/Jupiter/Moon
// flowing) worth reaching out on, or a tender one worth tending gently — and
// combine it with how long it's been since they last connected. The result is a
// gentle, ranked list of who to reach out to and why. Pure + testable: the
// astronomy comes from transitingPositions(), everything else is deterministic.

import { transitingPositions } from "@/lib/astrology/transiting-positions";
import { synastryAspects, relationshipPlanets, type SynPlanet } from "@/lib/astrology/synastry";
import type { NatalChart, AspectType } from "@/lib/astrology/types";

// Fast, relational bodies — the ones that make a week feel different between two
// people. Outer planets sit on a point for months, so they're not "windows".
const REL_SET = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"];
const DAYS_AHEAD = 7;
const ORB = 2.5;

const FLOWING: AspectType[] = ["trine", "sextile", "conjunction"];

// How much each transiting body lifts (warm) or weighs on (tender) a window.
const WARM_PLANET: Record<string, number> = { Venus: 3, Jupiter: 2.4, Sun: 2.2, Mercury: 1.4, Moon: 1.3, Mars: 1.2 };
const TENDER_PLANET: Record<string, number> = { Saturn: 1.8, Mars: 1.6 };
const TYPE_W: Record<string, number> = { trine: 1.15, conjunction: 1, sextile: 0.85, square: 1, opposition: 0.9 };

const WARM_MIN = 0.9;
const TENDER_MIN = 1.0;

export type Quality = "warm" | "tender" | "quiet";

export interface ConnectionInput {
  id: string;
  name: string;
  relationship: string | null;
  chart: NatalChart | null;
  lastContactAt: string | null;
}

export interface Connection {
  personId: string;
  name: string;
  relationship: string | null;
  quality: Quality;
  headline: string;
  window: string; // "today", "tomorrow", "this Thursday", "this week"
  aspect: { planet: string; type: AspectType; natal: string; orb: number } | null;
  daysSince: number | null;
  overdue: boolean;
  score: number; // reach-out worthiness, higher = more worth a message
  surface: boolean; // whether it's worth showing at all
}

export function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / 86_400_000);
}

/** ISO-8601 week key like "2026-W36" — for once-a-week nudge dedupe. */
export function isoWeekKey(d: Date): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function recencyLabel(daysSince: number | null): string {
  if (daysSince === null) return "Not logged yet";
  if (daysSince <= 0) return "Connected today";
  if (daysSince === 1) return "Connected yesterday";
  if (daysSince < 7) return `Connected ${daysSince} days ago`;
  if (daysSince < 14) return "Connected about a week ago";
  if (daysSince < 21) return "It's been about two weeks";
  if (daysSince < 31) return "It's been about three weeks";
  if (daysSince < 60) return "It's been over a month";
  return "It's been a long while";
}

/** Reach-out worthiness — warmth first, lifted by how overdue a check-in is. */
export function reachOutScore(quality: Quality, daysSince: number | null, astroScore: number): number {
  const base = quality === "warm" ? 3 : quality === "tender" ? 1.5 : 0;
  let recency = 0;
  if (daysSince === null) recency = 0.3; // gentle nudge to start tracking
  else if (daysSince >= 30) recency = 2;
  else if (daysSince >= 14) recency = 1;
  else if (daysSince >= 7) recency = 0.4;
  return base + recency + Math.min(1.5, astroScore) * 0.5;
}

function dayLabel(offset: number, date: Date): string {
  if (offset === 0) return "today";
  if (offset === 1) return "tomorrow";
  if (offset <= 6) return `this ${date.toLocaleDateString("en-US", { weekday: "long" })}`;
  return "this week";
}

function headlineFor(quality: Quality, planet: string): string {
  if (quality === "warm") {
    switch (planet) {
      case "Venus": return "Venus is warming things between you";
      case "Sun": return "The Sun lights up your connection";
      case "Jupiter": return "Jupiter opens things up between you";
      case "Moon": return "An easy emotional current with them";
      case "Mercury": return "Words flow easily with them";
      case "Mars": return "A lively spark between you";
      default: return "The timing between you is warm";
    }
  }
  if (quality === "tender") {
    if (planet === "Saturn") return "Things feel a little heavy — tend it gently";
    return "A bit of friction to move through with care";
  }
  return "A quiet stretch between you";
}

/** Best warm and tender windows for one person over the week ahead. */
function readWindow(
  chart: NatalChart | null,
  skyByDay: { offset: number; date: Date; sky: SynPlanet[] }[],
): {
  quality: Quality;
  planet: string;
  window: string;
  aspect: Connection["aspect"];
  astroScore: number;
} {
  const empty = { quality: "quiet" as Quality, planet: "", window: "this week", aspect: null, astroScore: 0 };
  if (!chart?.planets) return empty;
  const natal = relationshipPlanets(chart.planets);
  if (natal.length === 0) return empty;

  let bestWarm = { score: 0, planet: "", offset: 0, date: skyByDay[0]?.date ?? new Date(), aspect: null as Connection["aspect"] };
  let bestTender = { ...bestWarm };

  for (const { offset, date, sky } of skyByDay) {
    for (const a of synastryAspects(sky, natal, ORB)) {
      const typeW = TYPE_W[a.type] ?? 0.8;
      const proximity = 1 - a.orb / ORB;
      if (FLOWING.includes(a.type) && WARM_PLANET[a.a]) {
        const s = WARM_PLANET[a.a] * typeW * proximity;
        if (s > bestWarm.score) bestWarm = { score: s, planet: a.a, offset, date, aspect: { planet: a.a, type: a.type, natal: a.b, orb: a.orb } };
      } else if (!FLOWING.includes(a.type) && TENDER_PLANET[a.a]) {
        const s = TENDER_PLANET[a.a] * typeW * proximity;
        if (s > bestTender.score) bestTender = { score: s, planet: a.a, offset, date, aspect: { planet: a.a, type: a.type, natal: a.b, orb: a.orb } };
      }
    }
  }

  if (bestWarm.score >= WARM_MIN) {
    return { quality: "warm", planet: bestWarm.planet, window: dayLabel(bestWarm.offset, bestWarm.date), aspect: bestWarm.aspect, astroScore: bestWarm.score };
  }
  if (bestTender.score >= TENDER_MIN) {
    return { quality: "tender", planet: bestTender.planet, window: dayLabel(bestTender.offset, bestTender.date), aspect: bestTender.aspect, astroScore: bestTender.score };
  }
  return empty;
}

/** Ranked reach-out signals for a user's people. Warmest + most overdue first. */
export function computeConnections(people: ConnectionInput[], now: Date): Connection[] {
  // The sky is the same for everyone — compute the week once.
  const skyByDay = Array.from({ length: DAYS_AHEAD }, (_, offset) => {
    const date = new Date(now.getTime() + offset * 86_400_000);
    return { offset, date, sky: transitingPositions(date).filter((p) => REL_SET.includes(p.name)) };
  });

  const out = people.map((p) => {
    const w = readWindow(p.chart, skyByDay);
    const daysSince = p.lastContactAt ? daysBetween(new Date(p.lastContactAt), now) : null;
    const overdue = daysSince !== null && daysSince >= 14;
    const score = reachOutScore(w.quality, daysSince, w.astroScore);
    return {
      personId: p.id,
      name: p.name,
      relationship: p.relationship,
      quality: w.quality,
      headline: headlineFor(w.quality, w.planet),
      window: w.window,
      aspect: w.aspect,
      daysSince,
      overdue,
      score,
      surface: w.quality !== "quiet" || overdue,
    };
  });

  return out.sort((a, b) => b.score - a.score);
}
