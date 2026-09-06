"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { authedFetch } from "@/lib/api";
import { CopyButton } from "@/components/CopyButton";
import { SkeletonLines } from "@/components/Skeleton";

type Today = { transiting: string; natal: string; type: string; hint: string };
type Member = {
  id: string; name: string; relationship: string | null; isSelf: boolean; age: number | null;
  sunSign: string; moonSign: string; risingSign: string | null; today: Today | null;
};
type Pair = { aId: string; bId: string; aName: string; bName: string; score: number };

function scoreColor(s: number): string {
  if (s >= 62) return "#7fd1a6";
  if (s >= 45) return "#d9c48a";
  return "#e0928f";
}

export default function HouseholdPage() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [matrix, setMatrix] = useState<Pair[]>([]);

  const [reading, setReading] = useState<string | null>(null);
  const [readingLoading, setReadingLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await authedFetch(`/api/companion/household?id=${id}`, { method: "GET" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Could not load this household.");
        setName(data.name); setMembers(data.members ?? []); setMatrix(data.matrix ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load this household.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function readToday() {
    if (readingLoading) return;
    setReadingLoading(true); setReading(null);
    try {
      const res = await authedFetch(`/api/companion/household?id=${id}`, { method: "POST", body: "{}" });
      const data = await res.json().catch(() => ({}));
      setReading(res.ok ? data.reading : "I couldn't read the household just now.");
    } catch {
      setReading("I couldn't read the household just now.");
    } finally {
      setReadingLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="skeleton h-7 w-40 rounded-md" />
        <div className="skeleton h-24 w-full rounded-2xl" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Link href="/people" className="text-xs text-neutral-500 hover:text-neutral-300">← People</Link>
        <div className="rounded-2xl border border-red-900/50 bg-red-950/20 p-8 text-center text-sm text-neutral-300">{error}</div>
      </div>
    );
  }

  return (
    <div className="animate-fade-up mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/people" className="text-xs text-neutral-500 hover:text-neutral-300">← People</Link>
        <h1 className="mt-1 text-3xl font-medium tracking-tight text-neutral-50">{name}</h1>
        <p className="mt-1 text-sm text-neutral-400">{members.length} {members.length === 1 ? "member" : "members"} · the weather at home today</p>
      </div>

      {/* Household today */}
      <div className="card-glow rounded-2xl border border-white/5 p-5">
        <div className="flex items-center justify-between">
          <p className="font-marcellus text-xs uppercase tracking-[0.2em] text-accent/80">Household today</p>
          {!reading && !readingLoading && (
            <button type="button" onClick={readToday}
              className="rounded-lg border border-white/10 px-4 py-1.5 text-sm text-neutral-100 transition-colors hover:bg-white/5">Read</button>
          )}
        </div>
        {readingLoading && <div className="mt-4"><SkeletonLines lines={4} /></div>}
        {reading && (
          <>
            <div className="mt-4 space-y-3 text-[15px] leading-7 text-neutral-200">
              {reading.split(/\n\n+/).filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
            </div>
            <div className="mt-3 flex justify-end"><CopyButton text={`${name} — today\n\n${reading}`} label="Copy" /></div>
          </>
        )}
      </div>

      {/* Members */}
      <div className="space-y-2">
        <h2 className="font-marcellus text-xs uppercase tracking-[0.2em] text-neutral-500">Everyone today</h2>
        {members.map((m) => (
          <div key={m.id} className="card-glow rounded-2xl border border-white/5 p-4">
            <p className="text-sm font-semibold text-neutral-50">
              {m.name}
              <span className="font-normal text-neutral-500">
                {m.isSelf ? " · you" : m.relationship ? ` · ${m.relationship}` : ""}{m.age != null ? ` · ${m.age}` : ""}
              </span>
            </p>
            <p className="mt-0.5 text-xs text-neutral-500">
              Sun {m.sunSign} · Moon {m.moonSign}{m.risingSign ? ` · Rising ${m.risingSign}` : ""}
            </p>
            {m.today && (
              <p className="mt-2 text-sm text-neutral-300">
                <span className="text-neutral-100">{m.today.transiting}</span> {m.today.type} their {m.today.natal}
                <span className="text-neutral-500"> — {m.today.hint}</span>
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Compatibility grid */}
      {matrix.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-marcellus text-xs uppercase tracking-[0.2em] text-neutral-500">Between each pair</h2>
          <div className="card-glow space-y-3 rounded-2xl border border-white/5 p-5">
            {matrix.map((p, i) => (
              <div key={i}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-300">{p.aName} <span className="text-neutral-600">&amp;</span> {p.bName}</span>
                  <span className="tabular-nums text-neutral-400">{p.score}</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                  <div className="h-full rounded-full" style={{ width: `${p.score}%`, background: scoreColor(p.score) }} />
                </div>
              </div>
            ))}
            <p className="pt-1 text-[11px] text-neutral-600">Resonance is a warm heuristic from your cross-aspects — a feel for the ease between two charts, not a verdict.</p>
          </div>
        </div>
      )}
    </div>
  );
}
