"use client";

import { useEffect, useState } from "react";
import { DailyCard } from "@/components/guidance/DailyCard";
import { Skeleton } from "@/components/ui/primitives";
import { fetchJSON } from "@/lib/client";
import type { DailyGuidancePayload } from "@/lib/types";

export function DashboardClient() {
  const [guidance, setGuidance] = useState<DailyGuidancePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJSON<{ guidance: DailyGuidancePayload | null }>("/api/ai/daily-guidance")
      .then((d) => setGuidance(d.guidance))
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-64 w-full" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="glass p-6 text-sm text-red-200">Couldn't load today's guidance: {error}</div>;
  }

  if (!guidance) {
    return <div className="glass p-6 text-sm text-cream-muted">No guidance yet. Complete your profile to begin.</div>;
  }

  return <DailyCard guidance={guidance} />;
}
