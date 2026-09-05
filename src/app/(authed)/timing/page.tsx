"use client";
import { ForecastTabs } from "@/components/companion/ForecastTabs";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { authedFetch } from "@/lib/api";
import { SkeletonLines } from "@/components/Skeleton";

type Aspect = { a: string; b: string; type: string; glyph: string; orb: number };
type Day = { date: string; score: number };
type Today = { score: number; supportive: Aspect | null; challenging: Aspect | null };
type Win = { date: string; score: number; reason: Aspect | null };

const INTENTIONS = [
  { key: "general", label: "Overall" },
  { key: "love", label: "Love" },
  { key: "career", label: "Work & money" },
  { key: "rest", label: "Rest & healing" },
  { key: "social", label: "Socialising" },
  { key: "growth", label: "Growth & risk" },
];

const TRANSIT_HINT: Record<string, string> = {
  Sun: "vitality & focus", Moon: "mood & needs", Mercury: "thinking & talking",
  Venus: "love & ease", Mars: "drive & assertion", Jupiter: "opportunity & luck", Saturn: "structure & limits",
};

function scoreColor(s: number): string {
  if (s >= 62) return "#7fd1a6";
  if (s >= 45) return "#d9c48a";
  return "#e0928f";
}
function fmtDay(iso: string) {
  return new Date(iso + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function EnergyCurve({ days, windowDates }: { days: Day[]; windowDates: Set<string> }) {
  const W = 700, H = 160, pad = 8;
  const n = days.length;
  const x = (i: number) => pad + (i / Math.max(1, n - 1)) * (W - 2 * pad);
  const y = (s: number) => pad + (1 - s / 100) * (H - 2 * pad);
  const line = days.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.score).toFixed(1)}`).join(" ");
  const area = `${line} L${x(n - 1).toFixed(1)},${(H - pad).toFixed(1)} L${x(0).toFixed(1)},${(H - pad).toFixed(1)} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Energy over the next 30 days">
      <defs>
        <linearGradient id="eg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c9a0f0" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#c9a0f0" stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1={pad} y1={y(50)} x2={W - pad} y2={y(50)} stroke="#ffffff" strokeOpacity="0.12" strokeDasharray="3 3" />
      <path d={area} fill="url(#eg)" />
      <path d={line} fill="none" stroke="#c9a0f0" strokeWidth="1.5" />
      {days.map((d, i) =>
        windowDates.has(d.date) ? (
          <circle key={d.date} cx={x(i)} cy={y(d.score)} r={3} fill="#7fd1a6" stroke="#0b0b10" strokeWidth="1" />
        ) : null,
      )}
      {/* today marker */}
      <circle cx={x(0)} cy={y(days[0]?.score ?? 50)} r={3} fill="#f4c77b" />
    </svg>
  );
}

export default function TimingPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [calendar, setCalendar] = useState<Day[]>([]);
  const [today, setToday] = useState<Today | null>(null);

  const [intention, setIntention] = useState("general");
  const [windows, setWindows] = useState<Win[]>([]);
  const [finding, setFinding] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await authedFetch("/api/companion/energy", { method: "GET" });
        const data = await res.json().catch(() => ({}));
        if (res.status === 400 && data.error === "onboarding_required") { window.location.href = "/onboarding"; return; }
        if (!res.ok) throw new Error(data.error || "Could not read your timing.");
        setCalendar(data.calendar ?? []);
        setToday(data.today ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not read your timing.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function find(next: string) {
    setIntention(next);
    setFinding(true);
    try {
      const res = await authedFetch("/api/companion/energy", { method: "POST", body: JSON.stringify({ intention: next, days: 30 }) });
      const data = await res.json().catch(() => ({}));
      if (res.ok) { setCalendar(data.calendar ?? []); setWindows(data.windows ?? []); }
    } finally {
      setFinding(false);
    }
  }

  const windowDates = useMemo(() => new Set(windows.map((w) => w.date)), [windows]);

  function calendarLink(w: Win) {
    const label = INTENTIONS.find((i) => i.key === intention)?.label ?? "this";
    const d = w.date.replace(/-/g, "");
    const next = new Date(w.date + "T12:00:00Z"); next.setUTCDate(next.getUTCDate() + 1);
    const end = next.toISOString().slice(0, 10).replace(/-/g, "");
    const text = encodeURIComponent(`NEFELI: strong day for ${label.toLowerCase()}`);
    const details = encodeURIComponent(w.reason ? `${w.reason.a} ${w.reason.type} your ${w.reason.b} — a supportive window.` : "A supportive window in your energy.");
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${d}/${end}&details=${details}`;
  }

  if (loading) {
    return <div className="mx-auto max-w-2xl space-y-4"><div className="skeleton h-7 w-40 rounded-md" /><div className="skeleton h-40 w-full rounded-2xl" /></div>;
  }
  if (error) {
    return <div className="mx-auto max-w-2xl rounded-2xl border border-red-900/50 bg-red-950/20 p-8 text-center text-sm text-neutral-300">{error}</div>;
  }

  return (
    <div className="animate-fade-up mx-auto max-w-2xl space-y-6">
      <ForecastTabs />
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-50">Timing</h1>
        <p className="mt-1 text-sm text-neutral-400">Your energy over the next 30 days, and the best windows for what matters.</p>
      </div>

      {/* Today */}
      {today && (
        <div className="card-glow rounded-2xl border border-white/5 p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-bold"
              style={{ background: `${scoreColor(today.score)}22`, color: scoreColor(today.score) }}>
              {today.score}
            </div>
            <div className="text-sm">
              <p className="font-semibold text-neutral-100">Today&rsquo;s energy</p>
              <p className="text-neutral-500">Overall support from the sky, 0&ndash;100.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {today.supportive && (
              <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.05] p-3">
                <p className="text-[11px] uppercase tracking-wide text-emerald-300/80">Lean in</p>
                <p className="mt-0.5 text-sm text-neutral-300">{today.supportive.a} {today.supportive.type} your {today.supportive.b}<span className="text-neutral-500"> — {TRANSIT_HINT[today.supportive.a] ?? "a lift"}</span></p>
              </div>
            )}
            {today.challenging && (
              <div className="rounded-xl border border-rose-500/15 bg-rose-500/[0.05] p-3">
                <p className="text-[11px] uppercase tracking-wide text-rose-300/80">Go easy</p>
                <p className="mt-0.5 text-sm text-neutral-300">{today.challenging.a} {today.challenging.type} your {today.challenging.b}<span className="text-neutral-500"> — {TRANSIT_HINT[today.challenging.a] ?? "some friction"}</span></p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Curve */}
      <div className="card-glow rounded-2xl border border-white/5 p-5">
        <div className="mb-2 flex items-center justify-between text-xs text-neutral-500">
          <span>Next 30 days</span>
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: "#f4c77b" }} /> today</span>
            {windows.length > 0 && <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: "#7fd1a6" }} /> best windows</span>}
          </span>
        </div>
        <EnergyCurve days={calendar} windowDates={windowDates} />
      </div>

      {/* Best timing finder */}
      <div className="card-glow rounded-2xl border border-white/5 p-5">
        <p className="text-sm font-semibold text-neutral-50">Find the best time for…</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {INTENTIONS.map((i) => (
            <button key={i.key} type="button" onClick={() => find(i.key)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${intention === i.key ? "border-accent/50 bg-accent/10 text-neutral-50" : "border-white/10 text-neutral-400 hover:text-neutral-200"}`}>
              {i.label}
            </button>
          ))}
        </div>

        {finding ? (
          <div className="mt-4"><SkeletonLines lines={3} /></div>
        ) : windows.length > 0 ? (
          <div className="mt-4 space-y-2">
            {windows.map((w) => (
              <div key={w.date} className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <div>
                  <p className="text-sm font-medium text-neutral-100">{fmtDay(w.date)}</p>
                  {w.reason && <p className="text-xs text-neutral-500">{w.reason.a} {w.reason.type} your {w.reason.b}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="tabular-nums text-sm" style={{ color: scoreColor(w.score) }}>{w.score}</span>
                  <a href={calendarLink(w)} target="_blank" rel="noopener noreferrer"
                    className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-neutral-100 transition-colors hover:bg-white/5">Add to calendar</a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-xs text-neutral-600">Pick an intention to see your strongest upcoming days.</p>
        )}
        <p className="mt-3 text-[11px] text-neutral-600">Energy is a warm heuristic from your transits — a feel for the sky&rsquo;s support, not a guarantee.</p>
      </div>

      <p className="text-center text-xs text-neutral-600">
        Looking for the month&rsquo;s story instead? <Link href="/monthly" className="text-neutral-400 underline-offset-4 hover:underline">Monthly</Link>
      </p>
    </div>
  );
}
