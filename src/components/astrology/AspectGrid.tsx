"use client";

import { ASPECT_GLYPHS, PLANET_GLYPHS } from "@/lib/astrology/constants";
import type { Aspect } from "@/lib/astrology/types";

const ASPECT_COLOR: Record<string, string> = {
  conjunction: "text-accent",
  opposition: "text-red-300",
  trine: "text-sky-300",
  square: "text-orange-300",
  sextile: "text-emerald-300",
};

const PLANETS = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];

export function AspectGrid({ aspects }: { aspects: Aspect[] }) {
  const present = PLANETS.filter((p) => aspects.some((a) => a.a === p || a.b === p));

  function findAspect(a: string, b: string): Aspect | undefined {
    return aspects.find(
      (asp) => (asp.a === a && asp.b === b) || (asp.a === b && asp.b === a),
    );
  }

  if (present.length === 0) {
    return <p className="text-sm text-neutral-500">No major aspects to display.</p>;
  }

  const legendTypes = ["conjunction", "trine", "square", "opposition", "sextile"] as const;
  const usedTypes = legendTypes.filter((t) => aspects.some((a) => a.type === t));

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="border-collapse text-center text-sm">
          <tbody>
            {present.map((row, ri) => (
              <tr key={row}>
                <th className="px-2 py-1 text-right text-accent" title={row}>
                  {PLANET_GLYPHS[row]}
                </th>
                {present.map((col, ci) => {
                  if (ci >= present.length - ri) return <td key={col} />;
                  const asp = findAspect(row, col);
                  return (
                    <td key={col} className="h-8 w-8 border border-white/5">
                      {asp ? (
                        <span
                          className={ASPECT_COLOR[asp.type]}
                          title={`${row} ${asp.type} ${col} (orb ${asp.orb}°)`}
                        >
                          {ASPECT_GLYPHS[asp.type]}
                        </span>
                      ) : null}
                    </td>
                  );
                })}
                <td className="px-2 text-accent" title={row}>
                  {PLANET_GLYPHS[row]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend — otherwise the glyphs are unreadable to non-astrologers. */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-neutral-400">
        {usedTypes.map((t) => (
          <span key={t} className="inline-flex items-center gap-1.5">
            <span className={ASPECT_COLOR[t]}>{ASPECT_GLYPHS[t]}</span>
            <span className="capitalize">{t}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
