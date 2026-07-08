"use client";

import { useEffect, useState } from "react";
import { authedFetch } from "@/lib/api";
import { CopyButton } from "@/components/CopyButton";
import { Skeleton, SkeletonLines } from "@/components/Skeleton";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

type MajorTransit = { label: string; glyph: string; intensity: number; house: number; exactDate: string; meaning: string; forYou: string | null };
type MoonPhase = { moonSign: string; nextNewMoon: string | null; nextFullMoon: string | null };
type Guide = { month: number; year: number; overview: string; moon_phases: MoonPhase[]; major_transits: MajorTransit[] };

function fmt(d: string | null) {
  return d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—";
}

export default function MonthlyPage() {
  const [loading, setLoading] = useState(true);
  const [guide, setGuide] = useState<Guide | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await authedFetch("/api/companion/monthly", { method: "POST", body: "{}" });
        if (res.status === 400) {
          const d = await res.json().catch(() => ({}));
          if (d.error === "onboarding_required") { window.location.href = "/onboarding"; return; }
        }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not load your month.");
        setGuide(data.guide);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load your month.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Skeleton className="h-7 w-48" />
        <div className="card-glow rounded-2xl border border-white/5 p-5">
          <SkeletonLines lines={4} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="card-glow rounded-2xl border border-white/5 p-5"><SkeletonLines lines={2} /></div>
          <div className="card-glow rounded-2xl border border-white/5 p-5"><SkeletonLines lines={2} /></div>
        </div>
      </div>
    );
  }
  if (error || !guide) {
    return <div className="mx-auto max-w-2xl rounded-2xl border border-red-900/50 bg-red-950/20 p-8 text-center text-sm text-neutral-300">{error || "No guide yet."}</div>;
  }

  const moon = guide.moon_phases[0];

  return (
    <div className="animate-fade-up mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-50">{MONTHS[guide.month - 1]} {guide.year}</h1>
        <p className="mt-1 text-sm text-neutral-400">Your month, read through your chart and your life.</p>
      </div>

      <div className="space-y-4 text-[15px] leading-7 text-neutral-200">
        {guide.overview.split(/\n\n+/).filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
      </div>
      <div className="flex justify-end">
        <CopyButton text={`${MONTHS[guide.month - 1]} ${guide.year}\n\n${guide.overview}`} label="Copy overview" />
      </div>

      {moon && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-neutral-300">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Lunations</p>
          <p className="mt-2">🌑 New Moon {fmt(moon.nextNewMoon)} · 🌕 Full Moon {fmt(moon.nextFullMoon)}</p>
        </div>
      )}

      {guide.major_transits.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-neutral-500">Major transits this month</h2>
          <div className="space-y-3">
            {guide.major_transits.map((t, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-neutral-50">{t.glyph} {t.label}</p>
                  <span className="text-xs text-neutral-500">exact {fmt(t.exactDate)}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-neutral-300">{t.meaning}</p>
                {t.forYou && (
                  <div className="mt-3 rounded-lg border border-white/10 bg-black/30 p-3">
                    <p className="text-xs font-medium text-neutral-400">For you</p>
                    <p className="mt-1 text-sm leading-6 text-neutral-200">{t.forYou}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
