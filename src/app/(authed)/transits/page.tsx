"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { authedFetch } from "@/lib/api";
import type { Transit } from "@/lib/astrology/types";

type Filter = "all" | "active" | "upcoming" | "intense";
type Sort = "intensity" | "date" | "house";

export default function TransitsPage() {
  const [loading, setLoading] = useState(true);
  const [transits, setTransits] = useState<Transit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("intensity");

  useEffect(() => {
    (async () => {
      try {
        const res = await authedFetch("/api/companion/transits", { method: "GET" });
        if (res.status === 400) { window.location.href = "/onboarding"; return; }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not load transits.");
        setTransits(data.transits ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load transits.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const shown = useMemo(() => {
    const now = Date.now();
    let list = [...transits];
    if (filter === "active") list = list.filter((t) => +new Date(t.startDate) <= now && now <= +new Date(t.endDate));
    else if (filter === "upcoming") list = list.filter((t) => +new Date(t.startDate) > now);
    else if (filter === "intense") list = list.filter((t) => t.intensity >= 4);

    list.sort((a, b) => {
      if (sort === "intensity") return b.intensity - a.intensity;
      if (sort === "date") return +new Date(a.exactDate) - +new Date(b.exactDate);
      return a.house - b.house;
    });
    return list;
  }, [transits, filter, sort]);

  if (loading) return <div className="mx-auto max-w-2xl text-sm text-neutral-400">Reading the sky against your chart…</div>;
  if (error) {
    return <div className="mx-auto max-w-2xl rounded-2xl border border-red-900/50 bg-red-950/20 p-8 text-center text-sm text-neutral-300">{error}</div>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-50">Transits</h1>
        <p className="mt-1 text-sm text-neutral-400">What the sky is activating in your chart right now.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        {(["all", "active", "upcoming", "intense"] as Filter[]).map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 font-medium transition-colors ${
              filter === f ? "bg-neutral-50 text-neutral-950" : "border border-white/15 text-neutral-300 hover:bg-white/[0.04]"
            }`}>
            {f[0].toUpperCase() + f.slice(1)}
          </button>
        ))}
        <span className="ml-auto text-neutral-500">Sort</span>
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}
          className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-neutral-200 focus:outline-none">
          <option value="intensity">Intensity</option>
          <option value="date">Date</option>
          <option value="house">House</option>
        </select>
      </div>

      {shown.length === 0 ? (
        <p className="text-sm text-neutral-500">Nothing in this view.</p>
      ) : (
        <div className="space-y-3">
          {shown.map((t, i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-neutral-50">
                  {t.glyph} {t.transitingPlanet} {t.aspect} {t.natalPlanet}
                </p>
                <span className="flex gap-0.5" title={`Intensity ${t.intensity}/5`}>
                  {Array.from({ length: 5 }, (_, k) => (
                    <span key={k} className={`h-1.5 w-1.5 rounded-full ${k < t.intensity ? "bg-neutral-200" : "bg-neutral-700"}`} />
                  ))}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-neutral-300">{t.meaning}</p>
              <div className="mt-2 flex items-center justify-between text-xs text-neutral-500">
                <span>{t.house} house · exact {new Date(t.exactDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                <Link href="/ask" className="text-neutral-400 underline-offset-4 hover:text-neutral-200 hover:underline">
                  Explore in chat →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
