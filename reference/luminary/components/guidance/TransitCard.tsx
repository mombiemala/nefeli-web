"use client";

import Link from "next/link";
import { Intensity } from "@/components/ui/primitives";
import { PLANET_GLYPHS, ASPECT_GLYPHS } from "@/lib/astrology-constants";
import { ordinal } from "@/lib/chart-utils";
import type { Transit } from "@/lib/types";

export function TransitCard({ transit }: { transit: Transit }) {
  const explore = `/chat?prompt=${encodeURIComponent(
    `Tell me more about transiting ${transit.transitingPlanet} ${transit.aspect} my natal ${transit.natalPlanet} — what does it mean for me right now?`,
  )}&type=TRANSIT_DEEP_DIVE`;

  return (
    <div className="glass flex flex-col gap-2 p-4 transition hover:border-gold/25">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-lg text-gold">
          <span title={transit.transitingPlanet}>{PLANET_GLYPHS[transit.transitingPlanet] ?? "•"}</span>
          <span className="text-cream-muted">{ASPECT_GLYPHS[transit.aspect] ?? transit.glyph}</span>
          <span title={transit.natalPlanet}>{PLANET_GLYPHS[transit.natalPlanet] ?? "•"}</span>
        </div>
        <Intensity level={transit.intensity} />
      </div>

      <div className="text-sm text-cream">
        <span className="font-medium">{transit.transitingPlanet}</span>{" "}
        <span className="text-cream-muted">{transit.aspect}</span>{" "}
        <span className="font-medium">natal {transit.natalPlanet}</span>
      </div>

      <p className="text-xs leading-relaxed text-cream-muted">{transit.meaning}</p>

      <div className="mt-1 flex items-center justify-between text-[11px] text-cream-dim">
        <span>
          Exact {transit.exactDate} · {ordinal(transit.house)} house
        </span>
        <Link href={explore} className="text-gold hover:text-gold-soft">
          Explore →
        </Link>
      </div>
    </div>
  );
}
