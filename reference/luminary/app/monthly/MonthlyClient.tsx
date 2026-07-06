"use client";

import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { MonthlyGuide } from "@/components/guidance/MonthlyGuide";
import { Skeleton, Spinner } from "@/components/ui/primitives";
import { fetchJSON } from "@/lib/client";
import type { MonthlyPayload } from "@/lib/monthly-generator";

export function MonthlyClient() {
  const now = new Date();
  const [month, setMonth] = useState(now.getUTCMonth() + 1);
  const [year, setYear] = useState(now.getUTCFullYear());
  const [guide, setGuide] = useState<MonthlyPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setGuide(null);
    try {
      const d = await fetchJSON<{ guide: MonthlyPayload | null }>(
        `/api/ai/monthly-guide?month=${month}&year=${year}`,
      );
      setGuide(d.guide);
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    void load();
  }, [load]);

  function shift(delta: number) {
    let m = month + delta;
    let y = year;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    setMonth(m);
    setYear(y);
  }

  async function regenerate() {
    setRegenerating(true);
    try {
      const d = await fetchJSON<{ guide: MonthlyPayload }>("/api/ai/monthly-guide", {
        method: "POST",
        body: JSON.stringify({ month, year }),
      });
      setGuide(d.guide);
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => shift(-1)} className="btn-ghost h-9 w-9 !px-0"><ChevronLeft className="h-4 w-4" /></button>
          <button onClick={() => shift(1)} className="btn-ghost h-9 w-9 !px-0"><ChevronRight className="h-4 w-4" /></button>
        </div>
        <button onClick={regenerate} disabled={regenerating || loading} className="btn-ghost text-xs">
          {regenerating ? <Spinner className="h-4 w-4" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Regenerate
        </button>
      </div>

      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}
      {!loading && guide && <MonthlyGuide guide={guide} />}
      {!loading && !guide && (
        <div className="glass p-6 text-sm text-cream-muted">Couldn't build this month's guide.</div>
      )}
    </div>
  );
}
