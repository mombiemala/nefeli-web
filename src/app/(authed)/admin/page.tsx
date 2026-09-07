"use client";

import { useEffect, useState } from "react";
import { authedFetch } from "@/lib/api";

type Ret = { rate: number | null; eligible: number; returned: number };
type Stats = {
  generatedAt: string;
  windowDays: number;
  accounts: number;
  funnel: { landing_view: number; cta_begin: number; signups: number; onboarded: number };
  activationRate: number;
  active: { dau: number; wau: number; mau: number };
  retention: { d1: Ret; d7: Ret; d30: Ret };
  surfaces: { name: string; count: number }[];
  pulse: { day: string; count: number }[];
};

const pct = (n: number | null) => (n === null ? "—" : `${Math.round(n * 100)}%`);
const SURFACE_LABEL: Record<string, string> = {
  daily_viewed: "Today", chart_viewed: "Chart", forecast_viewed: "Forecast",
  chat_sent: "Chat", person_added: "Added a person", reading_shared: "Shared a reading",
  connection_logged: "Logged a connection",
};

// Retention health — semantic, not the accent hue.
function health(rate: number | null): { color: string; label: string } {
  if (rate === null) return { color: "text-neutral-500", label: "no cohort yet" };
  if (rate >= 0.4) return { color: "text-emerald-400", label: "healthy" };
  if (rate >= 0.2) return { color: "text-amber-400", label: "watch" };
  return { color: "text-rose-400", label: "low" };
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card-glow rounded-2xl border border-white/5 p-4">
      <p className="font-marcellus text-xs uppercase tracking-[0.2em] text-neutral-500">{label}</p>
      <p className="mt-2 font-display text-3xl leading-none text-neutral-50" style={{ fontVariantNumeric: "tabular-nums" }}>{value}</p>
      {sub && <p className="mt-1.5 text-xs text-neutral-500">{sub}</p>}
    </div>
  );
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await authedFetch("/api/admin/stats", { method: "GET" });
        const data = await res.json().catch(() => ({}));
        if (res.status === 403) { setForbidden(data.hint || "Not authorized."); return; }
        if (!res.ok) throw new Error(data.error || "Could not load stats.");
        setStats(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load stats.");
      }
    })();
  }, []);

  if (forbidden) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="card-glow rounded-2xl border border-white/5 p-6">
          <h1 className="text-3xl font-medium tracking-tight text-neutral-50">Insights</h1>
          <p className="mt-3 text-sm leading-6 text-neutral-300">{forbidden}</p>
        </div>
      </div>
    );
  }
  if (error) {
    return <div className="mx-auto max-w-2xl rounded-2xl border border-red-900/50 bg-red-950/20 p-8 text-center text-sm text-neutral-300">{error}</div>;
  }
  if (!stats) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-3 text-neutral-400">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-700 border-t-neutral-200" />
          <span className="text-sm">Reading the numbers…</span>
        </div>
      </div>
    );
  }

  const f = stats.funnel;
  const funnelSteps = [
    { label: "Landing views", value: f.landing_view },
    { label: "Tapped “Begin”", value: f.cta_begin },
    { label: "Accounts", value: f.signups },
    { label: "Activated (onboarded)", value: f.onboarded },
  ];
  const funnelMax = Math.max(1, ...funnelSteps.map((s) => s.value));
  const surfaceMax = Math.max(1, ...stats.surfaces.map((s) => s.count));
  const pulseMax = Math.max(1, ...stats.pulse.map((p) => p.count));

  return (
    <div className="animate-fade-up mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-medium tracking-tight text-neutral-50">Insights</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Owner-only · first-party events · UTC · updated {new Date(stats.generatedAt).toLocaleString()}
        </p>
      </div>

      {/* Headline tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Accounts" value={String(stats.accounts)} />
        <Tile label="Activation" value={pct(stats.activationRate)} sub={`${stats.funnel.onboarded} onboarded`} />
        <Tile label="Active · 7d" value={String(stats.active.wau)} sub={`${stats.active.dau} today`} />
        <Tile label="Active · 30d" value={String(stats.active.mau)} />
      </div>

      {/* Funnel */}
      <section>
        <h2 className="mb-3 font-marcellus text-xs uppercase tracking-[0.2em] text-neutral-500">Activation funnel</h2>
        <div className="card-glow space-y-3 rounded-2xl border border-white/5 p-5">
          {funnelSteps.map((s, i) => {
            const prev = i > 0 ? funnelSteps[i - 1].value : null;
            const conv = prev && prev > 0 ? Math.round((s.value / prev) * 100) : null;
            return (
              <div key={s.label}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-neutral-300">{s.label}</span>
                  <span className="text-neutral-100" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {s.value}{conv !== null && <span className="ml-2 text-xs text-neutral-500">{conv}%</span>}
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/[0.05]">
                  <div className="h-full rounded-full bg-accent/70" style={{ width: `${(s.value / funnelMax) * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Retention */}
      <section>
        <h2 className="mb-1 font-marcellus text-xs uppercase tracking-[0.2em] text-neutral-500">Retention</h2>
        <p className="mb-3 text-xs text-neutral-500">Share of onboarded users who came back within N days.</p>
        <div className="grid grid-cols-3 gap-3">
          {([["Within 1 day", stats.retention.d1], ["Within 7 days", stats.retention.d7], ["Within 30 days", stats.retention.d30]] as const).map(([label, r]) => {
            const h = health(r.rate);
            return (
              <div key={label} className="card-glow rounded-2xl border border-white/5 p-4">
                <p className="text-xs text-neutral-500">{label}</p>
                <p className={`mt-2 font-display text-3xl leading-none ${h.color}`} style={{ fontVariantNumeric: "tabular-nums" }}>{pct(r.rate)}</p>
                <p className="mt-1.5 text-xs text-neutral-500">{r.rate === null ? h.label : `${r.returned} of ${r.eligible} · ${h.label}`}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Return surface */}
      <section>
        <h2 className="mb-1 font-marcellus text-xs uppercase tracking-[0.2em] text-neutral-500">What pulls people back</h2>
        <p className="mb-3 text-xs text-neutral-500">Engagement by surface, last 7 days.</p>
        <div className="card-glow space-y-2.5 rounded-2xl border border-white/5 p-5">
          {stats.surfaces.map((s) => (
            <div key={s.name} className="flex items-center gap-3">
              <span className="w-40 shrink-0 text-sm text-neutral-300">{SURFACE_LABEL[s.name] ?? s.name}</span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
                <div className="h-full rounded-full bg-accent/70" style={{ width: `${(s.count / surfaceMax) * 100}%` }} />
              </div>
              <span className="w-8 shrink-0 text-right text-sm text-neutral-200" style={{ fontVariantNumeric: "tabular-nums" }}>{s.count}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Activity pulse */}
      <section>
        <h2 className="mb-1 font-marcellus text-xs uppercase tracking-[0.2em] text-neutral-500">Activity pulse</h2>
        <p className="mb-3 text-xs text-neutral-500">Engagement events per day, last 14 days.</p>
        <div className="card-glow rounded-2xl border border-white/5 p-5">
          <div className="flex h-24 items-end gap-1.5">
            {stats.pulse.map((p, i) => (
              <div
                key={p.day}
                title={`${p.day}: ${p.count}`}
                className="flex-1 rounded-t bg-accent/70"
                style={{ height: `${Math.max(3, (p.count / pulseMax) * 100)}%`, opacity: i === stats.pulse.length - 1 ? 1 : 0.7 }}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-neutral-600">
            <span>{stats.pulse[0]?.day.slice(5)}</span>
            <span>{stats.pulse[stats.pulse.length - 1]?.day.slice(5)}</span>
          </div>
        </div>
      </section>

      <p className="text-center text-xs text-neutral-600">Numbers reflect the last {stats.windowDays} days of events.</p>
    </div>
  );
}
