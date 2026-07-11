"use client";

import { useMemo, useRef } from "react";
import type { AstroMap, PlanetLine } from "@/lib/astrology/astrocartography";

const W = 720;
const H = 360;

// A handful of world cities as orientation dots (schematic map, no coastlines).
const REF_CITIES: [string, number, number][] = [
  ["New York", 40.7, -74.0], ["Los Angeles", 34.0, -118.2], ["Mexico City", 19.4, -99.1],
  ["Lima", -12.0, -77.0], ["Santiago", -33.4, -70.6], ["São Paulo", -23.5, -46.6],
  ["Buenos Aires", -34.6, -58.4], ["London", 51.5, -0.1], ["Paris", 48.9, 2.3],
  ["Madrid", 40.4, -3.7], ["Rome", 41.9, 12.5], ["Berlin", 52.5, 13.4],
  ["Moscow", 55.8, 37.6], ["Cairo", 30.0, 31.2], ["Lagos", 6.5, 3.4],
  ["Nairobi", -1.3, 36.8], ["Johannesburg", -26.2, 28.0], ["Istanbul", 41.0, 28.9],
  ["Dubai", 25.2, 55.3], ["Mumbai", 19.0, 72.9], ["Delhi", 28.6, 77.2],
  ["Bangkok", 13.7, 100.5], ["Singapore", 1.3, 103.8], ["Beijing", 39.9, 116.4],
  ["Tokyo", 35.7, 139.7], ["Sydney", -33.9, 151.2], ["Auckland", -36.8, 174.8],
  ["Honolulu", 21.3, -157.9], ["Reykjavík", 64.1, -21.9],
];

const projX = (lon: number) => ((lon + 180) / 360) * W;
const projY = (lat: number) => ((90 - lat) / 180) * H;

/** Split a curve at the antimeridian so it doesn't draw a wrap-around streak. */
function segments(line: PlanetLine): string[] {
  const paths: string[] = [];
  let cur: string[] = [];
  let prevLon: number | null = null;
  for (const p of line.points) {
    if (prevLon !== null && Math.abs(p.lon - prevLon) > 180) {
      if (cur.length > 1) paths.push(cur.join(" "));
      cur = [];
    }
    cur.push(`${cur.length ? "L" : "M"}${projX(p.lon).toFixed(1)},${projY(p.lat).toFixed(1)}`);
    prevLon = p.lon;
  }
  if (cur.length > 1) paths.push(cur.join(" "));
  return paths;
}

export function WorldMap({
  map,
  birthplace,
  selected,
  highlightPlanet,
  onPick,
}: {
  map: AstroMap;
  birthplace?: { lat: number; lon: number };
  selected?: { lat: number; lon: number } | null;
  highlightPlanet?: string | null;
  onPick?: (lat: number, lon: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  const graticule = useMemo(() => {
    const lines: { x1: number; y1: number; x2: number; y2: number; strong?: boolean }[] = [];
    for (let lon = -180; lon <= 180; lon += 30) {
      lines.push({ x1: projX(lon), y1: 0, x2: projX(lon), y2: H, strong: lon === 0 });
    }
    for (let lat = -60; lat <= 60; lat += 30) {
      lines.push({ x1: 0, y1: projY(lat), x2: W, y2: projY(lat), strong: lat === 0 });
    }
    return lines;
  }, []);

  function handleClick(e: React.MouseEvent<SVGSVGElement>) {
    if (!onPick || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const y = ((e.clientY - rect.top) / rect.height) * H;
    const lon = (x / W) * 360 - 180;
    const lat = 90 - (y / H) * 180;
    onPick(Math.round(lat * 100) / 100, Math.round(lon * 100) / 100);
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full select-none rounded-xl"
      style={{ background: "radial-gradient(120% 100% at 50% 0%, #10111a, #08080b)", cursor: onPick ? "crosshair" : "default" }}
      role="img"
      aria-label="Astrocartography world map"
      onClick={handleClick}
    >
      {/* Graticule */}
      {graticule.map((g, i) => (
        <line key={i} x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2}
          stroke="#ffffff" strokeOpacity={g.strong ? 0.16 : 0.06} strokeWidth={g.strong ? 1 : 0.5} />
      ))}

      {/* Reference cities */}
      {REF_CITIES.map(([name, lat, lon]) => (
        <g key={name}>
          <circle cx={projX(lon)} cy={projY(lat)} r={1.4} fill="#ffffff" fillOpacity={0.4} />
          <text x={projX(lon) + 3} y={projY(lat) + 2.5} fill="#ffffff" fillOpacity={0.32} fontSize={5.5}>{name}</text>
        </g>
      ))}

      {/* Planetary lines */}
      {map.lines.map((line, i) => {
        const dim = highlightPlanet && line.planet !== highlightPlanet;
        const op = dim ? 0.08 : line.angle === "MC" || line.angle === "IC" ? 0.75 : 0.6;
        return segments(line).map((d, j) => (
          <path key={`${i}-${j}`} d={d} fill="none" stroke={line.color}
            strokeOpacity={op} strokeWidth={dim ? 0.6 : 1}
            strokeDasharray={line.angle === "IC" || line.angle === "DSC" ? "3 2.5" : undefined} />
        ));
      })}

      {/* Birthplace */}
      {birthplace && (
        <g>
          <circle cx={projX(birthplace.lon)} cy={projY(birthplace.lat)} r={3.5} fill="none" stroke="#f4c77b" strokeWidth={1.2} />
          <circle cx={projX(birthplace.lon)} cy={projY(birthplace.lat)} r={1} fill="#f4c77b" />
        </g>
      )}

      {/* Selected location */}
      {selected && (
        <g>
          <circle cx={projX(selected.lon)} cy={projY(selected.lat)} r={4} fill="#ffffff" fillOpacity={0.15} />
          <circle cx={projX(selected.lon)} cy={projY(selected.lat)} r={2} fill="#ffffff" />
        </g>
      )}
    </svg>
  );
}
