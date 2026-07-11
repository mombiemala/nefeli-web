// Synastry — the cross-aspects between two people's charts. Pure + testable.
// An aspect forms when one person's planet sits at a significant angle
// (0/60/90/120/180°) to the other's, within orb.

import { ASPECT_GLYPHS } from "./constants";
import type { AspectType } from "./types";

export interface SynPlanet { name: string; absoluteDegree: number }

export interface SynastryAspect {
  a: string;   // person A's planet
  b: string;   // person B's planet
  type: AspectType;
  glyph: string;
  orb: number; // degrees from exact (smaller = tighter)
}

const ASPECTS: [AspectType, number][] = [
  ["conjunction", 0], ["sextile", 60], ["square", 90], ["trine", 120], ["opposition", 180],
];

// The bodies that carry relationship meaning (skip nodes, Lilith, outer-planet
// pairings dominate otherwise). Ascendant included when birth time is known.
export const RELATIONSHIP_BODIES = [
  "Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Ascendant",
];

/** Smallest angle between two ecliptic longitudes, 0..180. */
function separation(a: number, b: number): number {
  const d = Math.abs((((a - b) % 360) + 360) % 360);
  return d > 180 ? 360 - d : d;
}

/** Cross-aspects between two planet sets, tightest first. */
export function synastryAspects(
  aPlanets: SynPlanet[],
  bPlanets: SynPlanet[],
  orb = 6,
): SynastryAspect[] {
  const out: SynastryAspect[] = [];
  for (const pa of aPlanets) {
    for (const pb of bPlanets) {
      const s = separation(pa.absoluteDegree, pb.absoluteDegree);
      for (const [type, angle] of ASPECTS) {
        const o = Math.abs(s - angle);
        if (o <= orb) {
          out.push({ a: pa.name, b: pb.name, type, glyph: ASPECT_GLYPHS[type] ?? "", orb: Math.round(o * 10) / 10 });
          break;
        }
      }
    }
  }
  return out.sort((x, y) => x.orb - y.orb);
}

/** Keep only the relationship-relevant bodies from a chart's planet list. */
export function relationshipPlanets(planets: { name: string; absoluteDegree: number }[]): SynPlanet[] {
  return planets
    .filter((p) => RELATIONSHIP_BODIES.includes(p.name))
    .map((p) => ({ name: p.name, absoluteDegree: p.absoluteDegree }));
}
