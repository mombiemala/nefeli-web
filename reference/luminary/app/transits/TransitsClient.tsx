"use client";

import { useEffect, useMemo, useState } from "react";
import { TransitCard } from "@/components/guidance/TransitCard";
import { Skeleton } from "@/components/ui/primitives";
import { fetchJSON } from "@/lib/client";
import { cn, toISODate } from "@/lib/utils";
import type { Transit } from "@/lib/types";

type Filter = "all" | "active" | "upcoming" | "intense";
type Sort = "date" | "intensity" | "house";

export function TransitsClient() {
  const [transits, setTransits] = useState<Transit[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("intensity");

  useEffect(() => {
    fetchJSON<{ transits: Transit[] }>("/api/chart/transit")
      .then((d) => setTransits(d.transits))
      .finally(() => setLoading(false));
  }, []);

  const today = toISODate(new Date());

  const shown = useMemo(() => {
    let list = [...transits];
    if (filter === "active") list = list.filter((t) => t.startDate <= today && t.endDate >= today);
    if (filter === "upcoming") list = list.filter((t) => t.startDate > today);
    if (filter === "intense") list = list.filter((t) => t.intensity >= 4);
    list.sort((a, b) => {
      if (sort === "date") return a.exactDate.localeCompare(b.exactDate);
      if (sort === "house") return a.house - b.house;
      return b.intensity - a.intensity;
    });
    return list;
  }, [transits, filter, sort, today]);

  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(["all", "active", "upcoming", "intense"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs capitalize transition",
                filter === f ? "border-gold/50 bg-gold/10 text-gold" : "border-white/10 text-cream-muted hover:text-cream",
              )}
            >
              {f === "intense" ? "High intensity" : f}
            </button>
          ))}
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          className="rounded-full border border-white/10 bg-night-800 px-3 py-1.5 text-xs text-cream-muted"
        >
          <option value="intensity">Sort: Intensity</option>
          <option value="date">Sort: Exact date</option>
          <option value="house">Sort: House</option>
        </select>
      </div>

      {shown.length === 0 ? (
        <div className="glass p-6 text-sm text-cream-muted">No transits match this filter right now.</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((t, i) => <TransitCard key={i} transit={t} />)}
        </div>
      )}
    </div>
  );
}
