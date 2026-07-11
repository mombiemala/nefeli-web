"use client";

import { useState } from "react";
import { authedFetch } from "@/lib/api";
import { CopyButton } from "@/components/CopyButton";
import { SkeletonLines } from "@/components/Skeleton";

type SolarReturn = {
  year: number;
  returnAt: string;
  overview: string;
  risingSign: string;
  sunSign: string;
  moonSign: string;
  sunHouse: number | null;
};

// A collapsible "year ahead" card — the solar-return reading is a heavier
// generation, so it's revealed on demand rather than on every Monthly visit.
export function SolarYearCard() {
  const [sr, setSr] = useState<SolarReturn | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reveal() {
    if (loading || sr) return;
    setLoading(true);
    setError(null);
    try {
      const res = await authedFetch("/api/companion/solar-return", { method: "POST", body: "{}" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not read your year.");
      setSr(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read your year.");
    } finally {
      setLoading(false);
    }
  }

  const returnDate = sr
    ? new Date(sr.returnAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null;

  return (
    <div className="card-glow rounded-2xl border border-white/5 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-accent/80">Your solar year</p>
          {sr && <p className="mt-1 text-sm text-neutral-400">The year that began {returnDate}</p>}
        </div>
        {!sr && !loading && (
          <button type="button" onClick={reveal}
            className="shrink-0 rounded-lg border border-white/10 px-4 py-2 text-sm text-neutral-100 transition-colors hover:bg-white/5">
            Reveal
          </button>
        )}
      </div>

      {loading && <div className="mt-4"><SkeletonLines lines={4} /></div>}
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      {sr && (
        <div className="mt-4">
          <div className="mb-3 flex flex-wrap gap-1.5 text-xs">
            <span className="rounded-full border border-white/10 px-2.5 py-1 text-neutral-300">Rising {sr.risingSign}</span>
            {sr.sunHouse && <span className="rounded-full border border-white/10 px-2.5 py-1 text-neutral-300">Sun · house {sr.sunHouse}</span>}
            <span className="rounded-full border border-white/10 px-2.5 py-1 text-neutral-300">Moon {sr.moonSign}</span>
          </div>
          <div className="space-y-3 text-[15px] leading-7 text-neutral-200">
            {sr.overview.split(/\n\n+/).filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
          </div>
          <div className="mt-3 flex justify-end">
            <CopyButton text={`My solar year (${returnDate})\n\n${sr.overview}`} label="Copy" />
          </div>
        </div>
      )}
    </div>
  );
}
