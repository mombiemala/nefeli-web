"use client";

import { useEffect, useState } from "react";
import { authedFetch } from "@/lib/api";
import { CopyButton } from "@/components/CopyButton";
import { SkeletonLines } from "@/components/Skeleton";

const ESSENCE: Record<number, string> = {
  1: "leadership", 2: "harmony", 3: "expression", 4: "structure", 5: "freedom",
  6: "nurture", 7: "depth", 8: "mastery", 9: "compassion",
  11: "intuition", 22: "master builder", 33: "master teacher",
};

type Numbers = {
  lifePath: number; birthday: number;
  expression?: number; soulUrge?: number; personality?: number;
  reading?: string;
};

function Tile({ label, n }: { label: string; n: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center">
      <p className="text-[10px] uppercase tracking-[0.15em] text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-accent">{n}</p>
      <p className="text-[11px] text-neutral-400">{ESSENCE[n] ?? ""}</p>
    </div>
  );
}

export function NumbersCard() {
  const [nums, setNums] = useState<Numbers | null>(null);
  const [fullName, setFullName] = useState("");
  const [reading, setReading] = useState<string | null>(null);
  const [loadingReading, setLoadingReading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await authedFetch("/api/companion/numerology", { method: "GET" });
        const data = await res.json();
        if (res.ok) setNums({ lifePath: data.lifePath, birthday: data.birthday });
      } catch { /* non-fatal */ }
    })();
  }, []);

  async function deepen() {
    if (loadingReading) return;
    setLoadingReading(true);
    setReading(null);
    try {
      const res = await authedFetch("/api/companion/numerology", {
        method: "POST",
        body: JSON.stringify({ fullName: fullName.trim() }),
      });
      const data = await res.json();
      if (res.ok) { setNums(data); setReading(data.reading); }
    } finally {
      setLoadingReading(false);
    }
  }

  if (!nums) return null;

  return (
    <div className="card-glow rounded-2xl border border-white/5 p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-accent/80">Your numbers</p>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Tile label="Life Path" n={nums.lifePath} />
        <Tile label="Birthday" n={nums.birthday} />
        {nums.expression != null && <Tile label="Expression" n={nums.expression} />}
        {nums.soulUrge != null && <Tile label="Soul Urge" n={nums.soulUrge} />}
        {nums.personality != null && <Tile label="Personality" n={nums.personality} />}
      </div>

      <div className="mt-4">
        <p className="text-sm text-neutral-400">
          Add your full birth name for your Expression, Soul Urge &amp; Personality numbers and a reading.
        </p>
        <div className="mt-2 flex gap-2">
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Full birth name"
            className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-neutral-50 placeholder:text-neutral-600 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/40"
          />
          <button
            type="button"
            onClick={deepen}
            disabled={!fullName.trim() || loadingReading}
            className="rounded-lg bg-neutral-50 px-4 py-2 text-sm font-semibold text-neutral-950 transition-colors hover:bg-white disabled:opacity-50"
          >
            {loadingReading ? "…" : "Read"}
          </button>
        </div>
      </div>

      {loadingReading && <div className="mt-4"><SkeletonLines lines={3} /></div>}
      {reading && (
        <>
          <div className="mt-4 space-y-3 text-[15px] leading-7 text-neutral-200">
            {reading.split(/\n\n+/).filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
          </div>
          <div className="mt-3 flex justify-end">
            <CopyButton text={reading} label="Copy" />
          </div>
        </>
      )}
    </div>
  );
}
