"use client";

import Link from "next/link";
import { Card, EnergyPill } from "@/components/ui/primitives";
import { TransitCard } from "./TransitCard";
import type { DailyGuidancePayload } from "@/lib/types";

export function DailyCard({ guidance }: { guidance: DailyGuidancePayload }) {
  const dateLabel = new Date(guidance.date + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-5">
      <Card strong className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-6 -top-6 text-8xl opacity-10">
          {guidance.moonEmoji}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-cream-dim">{dateLabel}</p>
            <h2 className="heading mt-0.5 text-2xl">
              Moon in {guidance.moonSign} {guidance.moonEmoji}
            </h2>
            <p className="subtle text-sm">{guidance.moonPhase}</p>
          </div>
          <EnergyPill level={guidance.energyLevel} />
        </div>

        <p className="mt-4 text-[15px] leading-relaxed text-cream/95">{guidance.guidance}</p>

        <div className="mt-4 rounded-xl border border-gold/15 bg-gold/5 p-3">
          <p className="text-xs uppercase tracking-wider text-gold">Today's prompt</p>
          <p className="mt-1 text-sm text-cream">{guidance.prompt}</p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/chat?prompt=Tell%20me%20about%20today.&type=DAILY_GUIDANCE" className="btn-primary">
            What's on your mind today?
          </Link>
          <Link href="/transits" className="btn-ghost">
            See all transits
          </Link>
        </div>
      </Card>

      {guidance.keyTransits.length > 0 && (
        <div>
          <h3 className="heading mb-3 text-lg">Today's key transits</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {guidance.keyTransits.map((t, i) => (
              <TransitCard key={i} transit={t} />
            ))}
          </div>
        </div>
      )}

      {guidance.upcoming.length > 0 && (
        <Card>
          <h3 className="heading mb-3 text-lg">Next 7 days</h3>
          <ul className="space-y-2">
            {guidance.upcoming.map((u, i) => (
              <li key={i} className="flex items-center justify-between text-sm">
                <span className="text-cream-muted">{u.label}</span>
                <span className="chip">{u.date}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
