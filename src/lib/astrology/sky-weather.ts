// Collective "sky weather" — what the sky is doing today for everyone (not
// tied to any chart). Powers the daily community broadcast. In-house via
// astronomy-engine.

import * as Astronomy from "astronomy-engine";
import { transitingPositions } from "./transiting-positions";
import { SIGNS, SIGN_GLYPHS, ASPECT_GLYPHS } from "./constants";
import type { AspectType, ZodiacSign } from "./types";

export function signFromLongitude(deg: number): ZodiacSign {
  const idx = Math.floor((((deg % 360) + 360) % 360) / 30);
  return SIGNS[idx];
}

const PHASES: { name: string; emoji: string }[] = [
  { name: "New Moon", emoji: "🌑" }, { name: "Waxing Crescent", emoji: "🌒" },
  { name: "First Quarter", emoji: "🌓" }, { name: "Waxing Gibbous", emoji: "🌔" },
  { name: "Full Moon", emoji: "🌕" }, { name: "Waning Gibbous", emoji: "🌖" },
  { name: "Last Quarter", emoji: "🌗" }, { name: "Waning Crescent", emoji: "🌘" },
];

/** Map the Moon's phase angle (0=new, 180=full) to a named phase. */
export function moonPhase(angleDeg: number): { name: string; emoji: string } {
  const a = (((angleDeg % 360) + 360) % 360);
  return PHASES[Math.floor(((a + 22.5) % 360) / 45)];
}

const ASPECTS: [AspectType, number][] = [
  ["conjunction", 0], ["sextile", 60], ["square", 90], ["trine", 120], ["opposition", 180],
];
// Planets (not the Moon) whose mutual aspects make a "headline" for the day.
const HEADLINE = ["Sun", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"];

function sep(a: number, b: number): number {
  const d = Math.abs((((a - b) % 360) + 360) % 360);
  return d > 180 ? 360 - d : d;
}

export interface SkyWeather {
  date: string;
  moonSign: ZodiacSign;
  moonGlyph: string;
  phase: string;
  phaseEmoji: string;
  aspect: { a: string; b: string; type: AspectType; glyph: string; orb: number } | null;
}

/** Today's collective sky: Moon sign + phase, and the tightest planet aspect. */
export function computeSkyWeather(when: Date): SkyWeather {
  const sky = transitingPositions(when);
  const byName = new Map(sky.map((p) => [p.name, p.absoluteDegree]));
  const moonLon = byName.get("Moon") ?? 0;

  const phaseAngle = Astronomy.MoonPhase(Astronomy.MakeTime(when));
  const ph = moonPhase(phaseAngle);

  // Tightest aspect between two headline planets.
  let best: SkyWeather["aspect"] = null;
  for (let i = 0; i < HEADLINE.length; i++) {
    for (let j = i + 1; j < HEADLINE.length; j++) {
      const la = byName.get(HEADLINE[i]), lb = byName.get(HEADLINE[j]);
      if (la == null || lb == null) continue;
      const s = sep(la, lb);
      for (const [type, angle] of ASPECTS) {
        const orb = Math.abs(s - angle);
        if (orb <= 5 && (!best || orb < best.orb)) {
          best = { a: HEADLINE[i], b: HEADLINE[j], type, glyph: ASPECT_GLYPHS[type] ?? "", orb: Math.round(orb * 10) / 10 };
        }
      }
    }
  }

  return {
    date: when.toISOString().slice(0, 10),
    moonSign: signFromLongitude(moonLon),
    moonGlyph: SIGN_GLYPHS[signFromLongitude(moonLon)],
    phase: ph.name, phaseEmoji: ph.emoji, aspect: best,
  };
}
