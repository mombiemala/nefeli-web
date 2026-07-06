"use client";

import { useEffect, useMemo, useState } from "react";
import { BirthChartSVG } from "@/components/chart/BirthChartSVG";
import { PlanetDetail } from "@/components/chart/PlanetDetail";
import { AspectGrid } from "@/components/chart/AspectGrid";
import { Card, Skeleton, SectionTitle } from "@/components/ui/primitives";
import { fetchJSON } from "@/lib/client";
import { bigThree, elementBalance, formatDegree, ordinal } from "@/lib/chart-utils";
import { PLANET_ORDER } from "@/lib/astrology-constants";
import type { NatalChart, PlanetPosition } from "@/lib/types";

export function ChartClient() {
  const [chart, setChart] = useState<NatalChart | null>(null);
  const [profile, setProfile] = useState<{ name: string; timeUnknown: boolean } | null>(null);
  const [selected, setSelected] = useState<PlanetPosition | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJSON<{ chart: NatalChart; profile: { name: string; timeUnknown: boolean } }>("/api/chart/generate")
      .then((d) => {
        setChart(d.chart);
        setProfile(d.profile);
      })
      .finally(() => setLoading(false));
  }, []);

  const orderedPlanets = useMemo(() => {
    if (!chart) return [];
    return [...chart.planets].sort(
      (a, b) => PLANET_ORDER.indexOf(a.name) - PLANET_ORDER.indexOf(b.name),
    );
  }, [chart]);

  if (loading) return <Skeleton className="h-[520px] w-full" />;
  if (!chart) return <Card>No chart available.</Card>;

  const three = bigThree(chart);
  const { elements, modality } = elementBalance(chart);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-6">
        <Card strong>
          <BirthChartSVG chart={chart} onSelectPlanet={setSelected} selected={selected?.name} />
          {profile?.timeUnknown && (
            <p className="mt-3 text-center text-xs text-cream-dim">
              Birth time unknown — house placements are approximate (noon used).
            </p>
          )}
        </Card>

        <Card>
          <SectionTitle>Aspects</SectionTitle>
          <AspectGrid aspects={chart.aspects} />
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <SectionTitle>Your big three</SectionTitle>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: "Sun", sign: three.sun },
              { label: "Moon", sign: three.moon },
              { label: "Rising", sign: three.rising },
            ].map((b) => (
              <div key={b.label} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-[11px] uppercase tracking-wider text-cream-dim">{b.label}</p>
                <p className="heading text-lg text-gold">{b.sign}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle>Placements</SectionTitle>
          <div className="divide-y divide-white/5">
            {orderedPlanets.map((p) => (
              <button
                key={p.name}
                onClick={() => setSelected(p)}
                className="flex w-full items-center justify-between py-2.5 text-left transition hover:text-gold"
              >
                <span className="flex items-center gap-2.5">
                  <span className="w-6 text-lg text-gold">{p.glyph}</span>
                  <span className="text-sm text-cream">{p.name}</span>
                  {p.retrograde && <span className="text-[10px] text-red-300">℞</span>}
                </span>
                <span className="text-right text-xs text-cream-muted">
                  {formatDegree(p)}
                  {p.name !== "Ascendant" && p.name !== "Midheaven" && (
                    <span className="ml-1 text-cream-dim">· {ordinal(p.house)}h</span>
                  )}
                </span>
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle>Elemental balance</SectionTitle>
          <div className="space-y-2 text-sm">
            {Object.entries(elements).map(([el, n]) => (
              <div key={el} className="flex items-center gap-3">
                <span className="w-14 text-cream-muted">{el}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
                  <div className="h-full rounded-full bg-gold/60" style={{ width: `${(n / 12) * 100}%` }} />
                </div>
                <span className="w-5 text-right text-cream-dim">{n}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2 text-[11px]">
            {Object.entries(modality).map(([m, n]) => (
              <span key={m} className="chip">{m} {n}</span>
            ))}
          </div>
        </Card>
      </div>

      <PlanetDetail planet={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
