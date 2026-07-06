"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Card, SectionTitle } from "@/components/ui/primitives";
import { DailyTable } from "./DailyTable";
import { cn } from "@/lib/utils";
import type { MonthlyPayload } from "@/lib/monthly-generator";

export function MonthlyGuide({ guide }: { guide: MonthlyPayload }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="space-y-6">
      <Card strong>
        <p className="text-xs uppercase tracking-wider text-gold">
          {guide.monthName} {guide.year}
        </p>
        <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-cream/95">
          {guide.overview}
        </p>
      </Card>

      {guide.moonPhases.length > 0 && (
        <Card>
          <SectionTitle>Moon phases</SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            {guide.moonPhases.map((m) => (
              <div key={m.date} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <span className="text-2xl">{m.emoji}</span>
                <div>
                  <p className="text-sm font-medium text-cream">
                    {m.phase} in {m.sign}
                  </p>
                  <p className="text-xs text-cream-muted">{m.date}</p>
                  <p className="mt-1 text-xs text-cream-dim">{m.note}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {guide.majorTransits.length > 0 && (
        <div>
          <h2 className="heading mb-3 text-lg">Major transits</h2>
          <div className="space-y-2">
            {guide.majorTransits.map((t, i) => (
              <div key={i} className="glass overflow-hidden">
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <span className="flex items-center gap-3">
                    <span className="chip">{t.exactDate}</span>
                    <span className="text-sm font-medium text-cream">{t.label}</span>
                  </span>
                  <ChevronDown className={cn("h-4 w-4 text-cream-muted transition", open === i && "rotate-180")} />
                </button>
                {open === i && (
                  <div className="space-y-3 border-t border-white/10 px-4 py-4">
                    <p className="text-sm text-cream-muted">{t.base}</p>
                    <div className="rounded-xl border border-gold/15 bg-gold/[0.04] p-3">
                      <p className="mb-1 text-xs uppercase tracking-wider text-gold">✶ For you specifically</p>
                      <p className="text-sm text-cream/90">{t.forYou}</p>
                    </div>
                    <p className="text-xs text-cream-dim">Tip: {t.tip}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <Card>
        <SectionTitle>Day by day</SectionTitle>
        <DailyTable days={guide.days} />
      </Card>
    </div>
  );
}
