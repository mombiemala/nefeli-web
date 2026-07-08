"use client";

import { useEffect, useState } from "react";
import { authedFetch } from "@/lib/api";
import type { Transit } from "@/lib/astrology/types";
import { CopyButton } from "@/components/CopyButton";

type Guidance = {
  date: string;
  moon_sign: string;
  moon_phase: string;
  guidance: string;
  prompt: string;
  energy_level: "high" | "medium" | "low" | "rest";
};

const ENERGY: Record<string, { label: string; className: string }> = {
  high: { label: "Power Day", className: "bg-amber-950/40 text-amber-300 border-amber-900/50" },
  medium: { label: "Navigate", className: "bg-neutral-800 text-neutral-200 border-neutral-700" },
  low: { label: "Move Gently", className: "bg-sky-950/40 text-sky-300 border-sky-900/50" },
  rest: { label: "Rest", className: "bg-violet-950/40 text-violet-300 border-violet-900/50" },
};

type Nudge = { id: string; title: string; body: string };

export default function TodayPage() {
  const [loading, setLoading] = useState(true);
  const [guidance, setGuidance] = useState<Guidance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [horizon, setHorizon] = useState<Transit | null>(null);
  const [nudge, setNudge] = useState<Nudge | null>(null);

  // Check-in
  const [reflection, setReflection] = useState("");
  const [checkinResponse, setCheckinResponse] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await authedFetch("/api/companion/today", { method: "POST", body: "{}" });
        if (res.status === 400) {
          const d = await res.json().catch(() => ({}));
          if (d.error === "onboarding_required") { window.location.href = "/onboarding"; return; }
        }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not load today.");
        setGuidance(data.guidance);

        // A gentle heads-up: the soonest intense transit still on the horizon.
        try {
          const tRes = await authedFetch("/api/companion/transits", { method: "GET" });
          const tData = await tRes.json();
          if (tRes.ok) {
            const now = Date.now();
            const upcoming = (tData.transits ?? [])
              .filter((t: Transit) => +new Date(t.startDate) > now && t.intensity >= 4)
              .sort((a: Transit, b: Transit) => +new Date(a.startDate) - +new Date(b.startDate));
            setHorizon(upcoming[0] ?? null);
          }
        } catch { /* non-fatal */ }

        // A proactive nudge left by the daily cron, if there's an unread one.
        try {
          const nRes = await authedFetch("/api/companion/notifications", { method: "GET" });
          const nData = await nRes.json();
          if (nRes.ok) {
            const unread = (nData.notifications ?? []).find(
              (n: { read_at: string | null }) => !n.read_at,
            );
            if (unread) setNudge({ id: unread.id, title: unread.title, body: unread.body });
          }
        } catch { /* non-fatal */ }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load today.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function dismissNudge() {
    const n = nudge;
    if (!n) return;
    setNudge(null);
    try {
      await authedFetch("/api/companion/notifications", {
        method: "PATCH",
        body: JSON.stringify({ id: n.id }),
      });
    } catch { /* best-effort */ }
  }

  async function submitCheckin() {
    const text = reflection.trim();
    if (!text || submitting) return;
    setSubmitting(true);
    try {
      const res = await authedFetch("/api/companion/checkin", {
        method: "POST",
        body: JSON.stringify({ reflection: text }),
      });
      const data = await res.json();
      if (res.ok) {
        setCheckinResponse(data.response);
        setReflection("");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center gap-3 text-neutral-400">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-700 border-t-neutral-200" />
          <span className="text-sm">Reading the sky…</span>
        </div>
      </div>
    );
  }

  if (error || !guidance) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-red-900/50 bg-red-950/20 p-8 text-center">
          <p className="text-sm text-neutral-300">{error || "Nothing to show yet."}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg border border-neutral-800 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-900"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const energy = ENERGY[guidance.energy_level] ?? ENERGY.medium;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {nudge && (
        <div className="rounded-2xl border border-amber-900/50 bg-amber-950/20 p-4">
          <div className="flex items-start justify-between gap-4">
            <p className="text-xs uppercase tracking-[0.2em] text-amber-300/80">{nudge.title}</p>
            <button
              type="button"
              onClick={dismissNudge}
              aria-label="Dismiss"
              className="-mt-1 text-neutral-500 hover:text-neutral-300"
            >
              ✕
            </button>
          </div>
          <p className="mt-2 text-sm leading-6 text-neutral-200">{nudge.body}</p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-50">Today</h1>
        <span className={`rounded-full border px-3 py-1 text-xs font-medium ${energy.className}`}>
          {energy.label}
        </span>
      </div>

      <p className="text-sm text-neutral-400">
        {guidance.moon_phase} in {guidance.moon_sign}
      </p>

      <div className="space-y-4 text-[15px] leading-7 text-neutral-200">
        {guidance.guidance.split(/\n\n+/).filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
      </div>
      <div className="flex justify-end">
        <CopyButton text={guidance.guidance} label="Copy today’s reading" />
      </div>

      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Sit with this</p>
        <p className="mt-2 text-[15px] leading-7 text-neutral-100">{guidance.prompt}</p>
      </div>

      {horizon && (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/20 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">On the horizon</p>
          <p className="mt-2 text-sm leading-6 text-neutral-300">
            {horizon.glyph} {horizon.transitingPlanet} {horizon.aspect} {horizon.natalPlanet} is
            forming around {new Date(horizon.exactDate).toLocaleDateString("en-US", { month: "long", day: "numeric" })}.
            Nothing to brace for — just a window to move a little more gently with yourself.
          </p>
        </div>
      )}

      {/* The 60-second check-in */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5">
        <p className="text-sm font-semibold text-neutral-50">How are you arriving today?</p>
        {checkinResponse ? (
          <div className="mt-3 space-y-3">
            <div className="space-y-3 text-[15px] leading-7 text-neutral-200">
              {checkinResponse.split(/\n\n+/).filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
            </div>
            <button
              type="button"
              onClick={() => setCheckinResponse(null)}
              className="text-xs text-neutral-500 underline-offset-4 hover:text-neutral-300 hover:underline"
            >
              Share more
            </button>
          </div>
        ) : (
          <>
            <textarea
              rows={2}
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              placeholder="A line about where you are — tired, hopeful, bracing for something…"
              className="mt-3 block w-full resize-none rounded-lg border border-neutral-800 bg-neutral-950/50 px-3 py-2.5 text-sm text-neutral-50 placeholder:text-neutral-600 focus:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-700"
            />
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={submitCheckin}
                disabled={submitting || !reflection.trim()}
                className="rounded-lg bg-neutral-50 px-5 py-2 text-sm font-semibold text-neutral-950 transition-colors hover:bg-neutral-100 disabled:opacity-50"
              >
                {submitting ? "…" : "Share"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
