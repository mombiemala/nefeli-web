"use client";

import { useEffect, useState } from "react";
import { authedFetch } from "@/lib/api";
import { BirthChartSVG } from "@/components/astrology/BirthChartSVG";
import { AspectGrid } from "@/components/astrology/AspectGrid";
import { bigThree, elementBalance } from "@/lib/astrology/chart-utils";
import type { NatalChart, PlanetPosition } from "@/lib/astrology/types";
import { CopyButton } from "@/components/CopyButton";
import { Skeleton, SkeletonLines } from "@/components/Skeleton";
import { NumbersCard } from "@/components/astrology/NumbersCard";

export default function ChartPage() {
  const [loading, setLoading] = useState(true);
  const [chart, setChart] = useState<NatalChart | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<PlanetPosition | null>(null);
  const [reading, setReading] = useState<string | null>(null);
  const [readingLoading, setReadingLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await authedFetch("/api/companion/chart", { method: "GET" });
        if (res.status === 400) { window.location.href = "/onboarding"; return; }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not load your chart.");
        setChart(data.chart);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load your chart.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function selectPlanet(p: PlanetPosition) {
    setSelected(p);
    setReading(null);
    setReadingLoading(true);
    try {
      const res = await authedFetch("/api/companion/placement", {
        method: "POST",
        body: JSON.stringify({ planet: p.name, sign: p.sign, house: p.house }),
      });
      const data = await res.json();
      if (res.ok) setReading(data.reading);
      else setReading("I couldn't read that placement just now.");
    } catch {
      setReading("I couldn't read that placement just now.");
    } finally {
      setReadingLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Skeleton className="h-7 w-40" />
        <div className="flex gap-2">
          <Skeleton className="h-7 w-24 rounded-full" />
          <Skeleton className="h-7 w-24 rounded-full" />
          <Skeleton className="h-7 w-24 rounded-full" />
        </div>
        <div className="card-glow rounded-2xl border border-white/5 p-4">
          <Skeleton className="mx-auto aspect-square w-full max-w-sm rounded-full" />
        </div>
        <div className="card-glow rounded-2xl border border-white/5 p-5">
          <SkeletonLines lines={3} />
        </div>
      </div>
    );
  }
  if (error || !chart) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-red-900/50 bg-red-950/20 p-8 text-center text-sm text-neutral-300">
        {error || "No chart yet."}
      </div>
    );
  }

  const three = bigThree(chart);
  const { elements } = elementBalance(chart);

  return (
    <div className="animate-fade-up mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-50">Your chart</h1>
        <p className="mt-1 text-sm text-neutral-400">Tap any placement for a reading of how it lives in your life.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {[["Sun", three.sun], ["Moon", three.moon], ["Rising", three.rising]].map(([k, v]) => (
          <span key={k} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-neutral-200">
            {k} <span className="text-neutral-400">{v}</span>
          </span>
        ))}
        {chart.timeUnknown && (
          <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-neutral-500">
            birth time unknown — rising &amp; houses estimated
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-neutral-400">
        {Object.entries(elements).map(([el, n]) => (
          <span key={el}>{el}: <span className="text-neutral-200">{n}</span></span>
        ))}
      </div>

      <div className="card-glow rounded-2xl border border-white/5 p-4">
        <BirthChartSVG chart={chart} onSelectPlanet={selectPlanet} selected={selected?.name} />
      </div>

      {selected && (
        <div className="card-glow rounded-2xl border border-white/5 p-5">
          <p className="text-sm font-semibold text-neutral-50">
            {selected.name} in {selected.sign}
            {!chart.timeUnknown && selected.house ? ` · ${selected.house} house` : ""}
            {selected.retrograde ? " ℞" : ""}
          </p>
          {readingLoading ? (
            <p className="mt-3 text-sm text-neutral-500">Reading…</p>
          ) : (
            <>
              <div className="mt-3 space-y-3 text-[15px] leading-7 text-neutral-200">
                {(reading ?? "").split(/\n\n+/).filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
              </div>
              {reading && (
                <div className="mt-3 flex justify-end">
                  <CopyButton text={`${selected.name} in ${selected.sign}\n\n${reading}`} label="Copy reading" />
                </div>
              )}
            </>
          )}
        </div>
      )}

      <div>
        <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-neutral-500">Aspects</h2>
        <AspectGrid aspects={chart.aspects} />
      </div>

      <NumbersCard />
    </div>
  );
}
