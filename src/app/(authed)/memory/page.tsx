"use client";

import { useEffect, useState } from "react";
import { authedFetch } from "@/lib/api";

type Insight = { id: string; insight_type: string; title: string; content: string; created_at: string };
type LifeContext = { id: string; category: string; title: string; description: string };
type Declaration = { id: string; declaration: string; context_note: string | null; declared_at: string };

const CATEGORY_LABEL: Record<string, string> = {
  career: "Career & work", relationships: "Relationships", family: "Family",
  creative: "Creative practice", health: "Health & healing", spiritual: "Spiritual life",
  finances: "Money", other: "Life",
};

export default function MemoryPage() {
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [contexts, setContexts] = useState<LifeContext[]>([]);
  const [declarations, setDeclarations] = useState<Declaration[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await authedFetch("/api/companion/memory", { method: "GET" });
        const data = await res.json();
        if (res.ok) {
          setInsights(data.insights ?? []);
          setContexts(data.lifeContexts ?? []);
          setDeclarations(data.declarations ?? []);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl text-sm text-neutral-400">Gathering what I remember…</div>
    );
  }

  const empty = !insights.length && !contexts.length && !declarations.length;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-50">What I remember</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Everything you’ve shared lives here. I read the sky through all of it.
        </p>
      </div>

      {empty && (
        <p className="text-sm text-neutral-500">
          Nothing yet. Talk with me or check in on Today, and what matters will start to gather here.
        </p>
      )}

      {declarations.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-neutral-500">You’re claiming</h2>
          <div className="space-y-2">
            {declarations.map((d) => (
              <div key={d.id} className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
                <p className="text-[15px] leading-7 text-neutral-100">“{d.declaration}”</p>
                {d.context_note && <p className="mt-1 text-xs text-neutral-500">{d.context_note}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {contexts.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-neutral-500">What’s alive in your life</h2>
          <div className="space-y-2">
            {contexts.map((c) => (
              <div key={c.id} className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
                <p className="text-xs font-medium text-neutral-400">{CATEGORY_LABEL[c.category] ?? "Life"}</p>
                <p className="mt-1 text-sm leading-6 text-neutral-200">{c.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {insights.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-neutral-500">Things you asked me to remember</h2>
          <div className="space-y-2">
            {insights.map((i) => (
              <div key={i.id} className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
                <p className="text-sm leading-6 text-neutral-200">{i.content}</p>
                <p className="mt-1 text-xs text-neutral-600">
                  {new Date(i.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
