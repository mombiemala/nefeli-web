"use client";

import { useMemo } from "react";
import { SIGNS, SIGN_GLYPHS } from "@/lib/astrology-constants";
import type { NatalChart, PlanetPosition } from "@/lib/types";

const SIZE = 480;
const C = SIZE / 2;
const R_OUTER = 228;
const R_ZODIAC = 200;
const R_HOUSE = 150;
const R_PLANET = 176;
const R_ASPECT = 132;

const ASPECT_COLOR: Record<string, string> = {
  conjunction: "#C9A84C",
  opposition: "#E06C75",
  trine: "#7FB4E0",
  square: "#E5A05A",
  sextile: "#8FCf9B",
};

// Chart wheel is drawn counter-clockwise with 0° Aries at the left (9 o'clock),
// the conventional orientation when the Ascendant anchors the left horizon.
function polar(absDeg: number, radius: number, ascOffset: number) {
  const a = ((180 + absDeg - ascOffset) * Math.PI) / 180;
  return { x: C + radius * Math.cos(a), y: C - radius * Math.sin(a) };
}

export function BirthChartSVG({
  chart,
  onSelectPlanet,
  selected,
}: {
  chart: NatalChart;
  onSelectPlanet?: (p: PlanetPosition) => void;
  selected?: string;
}) {
  const ascOffset = useMemo(() => {
    const asc = chart.planets.find((p) => p.name === "Ascendant");
    return asc ? asc.absoluteDegree : 0;
  }, [chart]);

  const drawablePlanets = chart.planets.filter(
    (p) => p.name !== "Ascendant" && p.name !== "Midheaven",
  );

  // Spread overlapping glyphs so they don't collide.
  const placed = spread(drawablePlanets, ascOffset);

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="mx-auto h-auto w-full max-w-[480px] select-none"
      role="img"
      aria-label="Birth chart wheel"
    >
      <defs>
        <radialGradient id="wheelGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1A0B2E" />
          <stop offset="100%" stopColor="#0D1117" />
        </radialGradient>
      </defs>

      <circle cx={C} cy={C} r={R_OUTER} fill="url(#wheelGlow)" stroke="#C9A84C" strokeOpacity="0.35" />
      <circle cx={C} cy={C} r={R_ZODIAC} fill="none" stroke="#C9A84C" strokeOpacity="0.25" />
      <circle cx={C} cy={C} r={R_HOUSE} fill="none" stroke="#F5E6C0" strokeOpacity="0.1" />
      <circle cx={C} cy={C} r={R_ASPECT} fill="none" stroke="#F5E6C0" strokeOpacity="0.08" />

      {/* Zodiac sign segments */}
      {SIGNS.map((sign, i) => {
        const start = polar(i * 30, R_ZODIAC, ascOffset);
        const mid = polar(i * 30 + 15, (R_ZODIAC + R_OUTER) / 2, ascOffset);
        return (
          <g key={sign}>
            <line
              x1={polar(i * 30, R_HOUSE, ascOffset).x}
              y1={polar(i * 30, R_HOUSE, ascOffset).y}
              x2={start.x}
              y2={start.y}
              stroke="#C9A84C"
              strokeOpacity="0.15"
            />
            <text
              x={mid.x}
              y={mid.y}
              fill="#C9A84C"
              fontSize="16"
              textAnchor="middle"
              dominantBaseline="central"
            >
              {SIGN_GLYPHS[sign]}
            </text>
          </g>
        );
      })}

      {/* House cusps */}
      {chart.houses.map((h) => {
        const outer = polar(h.absoluteDegree, R_HOUSE, ascOffset);
        const num = polar(h.absoluteDegree + 15, R_HOUSE - 16, ascOffset);
        const emphasize = h.house === 1 || h.house === 10;
        return (
          <g key={h.house}>
            <line
              x1={C}
              y1={C}
              x2={outer.x}
              y2={outer.y}
              stroke={emphasize ? "#C9A84C" : "#F5E6C0"}
              strokeOpacity={emphasize ? 0.4 : 0.12}
              strokeWidth={emphasize ? 1.2 : 0.75}
            />
            <text
              x={num.x}
              y={num.y}
              fill="#8B8371"
              fontSize="10"
              textAnchor="middle"
              dominantBaseline="central"
            >
              {h.house}
            </text>
          </g>
        );
      })}

      {/* Aspect lines */}
      {chart.aspects.map((a, i) => {
        const pa = drawablePlanets.find((p) => p.name === a.a);
        const pb = drawablePlanets.find((p) => p.name === a.b);
        if (!pa || !pb) return null;
        const p1 = polar(pa.absoluteDegree, R_ASPECT, ascOffset);
        const p2 = polar(pb.absoluteDegree, R_ASPECT, ascOffset);
        return (
          <line
            key={i}
            x1={p1.x}
            y1={p1.y}
            x2={p2.x}
            y2={p2.y}
            stroke={ASPECT_COLOR[a.type] ?? "#C9A84C"}
            strokeOpacity={0.35}
            strokeWidth={a.orb < 2 ? 1.2 : 0.6}
          />
        );
      })}

      {/* Planets */}
      {placed.map(({ planet, angle }) => {
        const pos = polar(angle, R_PLANET, ascOffset);
        const tick = polar(planet.absoluteDegree, R_HOUSE, ascOffset);
        const tickOut = polar(planet.absoluteDegree, R_HOUSE + 8, ascOffset);
        const active = selected === planet.name;
        return (
          <g
            key={planet.name}
            className={onSelectPlanet ? "cursor-pointer" : ""}
            onClick={() => onSelectPlanet?.(planet)}
          >
            <line
              x1={tick.x}
              y1={tick.y}
              x2={tickOut.x}
              y2={tickOut.y}
              stroke="#C9A84C"
              strokeOpacity="0.5"
            />
            <circle
              cx={pos.x}
              cy={pos.y}
              r={13}
              fill={active ? "#C9A84C" : "#1A0B2E"}
              stroke="#C9A84C"
              strokeOpacity={active ? 1 : 0.5}
            />
            <text
              x={pos.x}
              y={pos.y}
              fill={active ? "#0D1117" : "#F5E6C0"}
              fontSize="13"
              textAnchor="middle"
              dominantBaseline="central"
            >
              {planet.glyph}
            </text>
            {planet.retrograde && (
              <text
                x={pos.x + 11}
                y={pos.y + 11}
                fill="#E06C75"
                fontSize="8"
                textAnchor="middle"
              >
                ℞
              </text>
            )}
          </g>
        );
      })}

      {/* AC / MC markers */}
      <text
        x={polar(ascOffset, R_OUTER - 8, ascOffset).x - 12}
        y={polar(ascOffset, R_OUTER - 8, ascOffset).y}
        fill="#C9A84C"
        fontSize="11"
        fontWeight="bold"
      >
        AC
      </text>
    </svg>
  );
}

/** Nudge apart planets closer than ~8° so their glyphs don't overlap. */
function spread(planets: PlanetPosition[], _ascOffset: number) {
  const sorted = [...planets].sort((a, b) => a.absoluteDegree - b.absoluteDegree);
  const minGap = 9;
  const angles = sorted.map((p) => p.absoluteDegree);
  for (let iter = 0; iter < 40; iter++) {
    let moved = false;
    for (let i = 0; i < angles.length; i++) {
      const j = (i + 1) % angles.length;
      let gap = angles[j] - angles[i];
      if (j === 0) gap += 360;
      if (gap < minGap) {
        const push = (minGap - gap) / 2;
        angles[i] -= push;
        angles[j] += push;
        moved = true;
      }
    }
    if (!moved) break;
  }
  return sorted.map((planet, i) => ({ planet, angle: angles[i] }));
}
