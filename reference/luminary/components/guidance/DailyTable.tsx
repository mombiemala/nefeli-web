"use client";

import type { MonthlyDay } from "@/lib/monthly-generator";

const ENERGY_DOT: Record<string, string> = {
  "Power Day": "bg-amber-400",
  "Navigate": "bg-sky-400",
  "Move Gently": "bg-violet-400",
  "Rest": "bg-emerald-400",
};

export function DailyTable({ days }: { days: MonthlyDay[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-cream-dim">
            <th className="py-2 pr-3">Day</th>
            <th className="py-2 pr-3">Moon</th>
            <th className="py-2 pr-3">Energy</th>
            <th className="py-2 pr-3">Key transit</th>
            <th className="py-2 pr-3">Advice</th>
          </tr>
        </thead>
        <tbody>
          {days.map((d) => (
            <tr key={d.date} className="border-b border-white/5 align-top hover:bg-white/[0.02]">
              <td className="py-2.5 pr-3 font-medium text-cream">{d.day}</td>
              <td className="py-2.5 pr-3 text-cream-muted">
                {d.moonEmoji} {d.moonSign}
              </td>
              <td className="py-2.5 pr-3">
                <span className="inline-flex items-center gap-1.5 text-xs text-cream-muted">
                  <span className={`h-2 w-2 rounded-full ${ENERGY_DOT[d.energy] ?? "bg-white/30"}`} />
                  {d.energy}
                </span>
              </td>
              <td className="py-2.5 pr-3 text-xs text-cream-muted">{d.keyTransit}</td>
              <td className="py-2.5 pr-3 text-xs text-cream/90">{d.advice}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
