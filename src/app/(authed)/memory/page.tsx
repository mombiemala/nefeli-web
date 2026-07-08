"use client";

import { useEffect, useState } from "react";
import { authedFetch } from "@/lib/api";
import { SkeletonLines } from "@/components/Skeleton";

type Insight = { id: string; insight_type: string; title: string; content: string; created_at: string };
type LifeContext = { id: string; category: string; title: string; description: string };
type Declaration = { id: string; declaration: string; context_note: string | null; declared_at: string };
type Nudge = { id: string; title: string; body: string; read_at: string | null; created_at: string };

const CATEGORIES: Array<[string, string]> = [
  ["career", "Career & work"], ["relationships", "Relationships"], ["family", "Family"],
  ["creative", "Creative practice"], ["health", "Health & healing"], ["spiritual", "Spiritual life"],
  ["finances", "Money"], ["other", "Life"],
];
const CATEGORY_LABEL = Object.fromEntries(CATEGORIES);

export default function MemoryPage() {
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [contexts, setContexts] = useState<LifeContext[]>([]);
  const [declarations, setDeclarations] = useState<Declaration[]>([]);
  const [nudges, setNudges] = useState<Nudge[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [ctxCategory, setCtxCategory] = useState("other");
  const [ctxText, setCtxText] = useState("");
  const [newDecl, setNewDecl] = useState("");
  const [busy, setBusy] = useState(false);
  const [patterning, setPatterning] = useState(false);

  async function load() {
    setError(null);
    try {
      const [res, nRes] = await Promise.all([
        authedFetch("/api/companion/memory", { method: "GET" }),
        authedFetch("/api/companion/notifications", { method: "GET" }),
      ]);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load your memory.");
      setInsights(data.insights ?? []);
      setContexts(data.lifeContexts ?? []);
      setDeclarations(data.declarations ?? []);
      try {
        const nData = await nRes.json();
        if (nRes.ok) setNudges(nData.notifications ?? []);
      } catch { /* nudges are non-fatal */ }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load your memory.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function addContext() {
    if (!ctxText.trim() || busy) return;
    setBusy(true);
    await authedFetch("/api/companion/memory", {
      method: "POST",
      body: JSON.stringify({ kind: "life_context", category: ctxCategory, description: ctxText.trim() }),
    });
    setCtxText("");
    await load();
    setBusy(false);
  }
  async function addDeclaration() {
    if (!newDecl.trim() || busy) return;
    setBusy(true);
    await authedFetch("/api/companion/memory", {
      method: "POST",
      body: JSON.stringify({ kind: "declaration", declaration: newDecl.trim() }),
    });
    setNewDecl("");
    await load();
    setBusy(false);
  }
  async function archive(kind: string, id: string) {
    await authedFetch("/api/companion/memory", { method: "PATCH", body: JSON.stringify({ kind, id }) });
    await load();
  }
  async function noticePattern() {
    if (patterning) return;
    setPatterning(true);
    await authedFetch("/api/companion/patterns", { method: "POST", body: "{}" });
    await load();
    setPatterning(false);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="skeleton h-7 w-56 rounded-md" />
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><SkeletonLines lines={2} /></div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><SkeletonLines lines={2} /></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-red-900/50 bg-red-950/20 p-8 text-center">
          <p className="text-sm text-neutral-300">{error}</p>
          <button type="button" onClick={() => { setLoading(true); load(); }}
            className="mt-4 rounded-lg border border-white/10 px-4 py-2 text-sm text-neutral-200 hover:bg-white/5">
            Try again
          </button>
        </div>
      </div>
    );
  }

  const patterns = insights.filter((i) => i.insight_type === "pattern");
  const remembered = insights.filter((i) => i.insight_type !== "pattern");

  return (
    <div className="animate-fade-up mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-50">What I remember</h1>
        <p className="mt-1 text-sm text-neutral-400">Everything you’ve shared. I read the sky through all of it — and you can tend it here.</p>
      </div>

      {/* Patterns */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs uppercase tracking-[0.2em] text-neutral-500">Patterns I’m noticing</h2>
          <button type="button" onClick={noticePattern} disabled={patterning}
            className="text-xs font-medium text-neutral-300 underline-offset-4 hover:text-neutral-50 hover:underline disabled:opacity-50">
            {patterning ? "Noticing…" : "Notice a pattern"}
          </button>
        </div>
        {patterns.length === 0 ? (
          <p className="text-sm text-neutral-600">
            As we spend time together, I’ll start to see the through-lines. Tap “Notice a pattern.”
          </p>
        ) : (
          <div className="space-y-2">
            {patterns.map((p) => (
              <div key={p.id} className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-white/20 hover:bg-white/[0.05]">
                <div>
                  <p className="text-sm font-semibold text-neutral-100">{p.title}</p>
                  <p className="mt-1 text-sm leading-6 text-neutral-300">{p.content}</p>
                </div>
                <button type="button" onClick={() => archive("insight", p.id)} className="text-xs text-neutral-600 hover:text-neutral-300">forget</button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Nudges from the daily cron */}
      {nudges.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-neutral-500">Nudges from the sky</h2>
          <div className="space-y-2">
            {nudges.map((n) => (
              <div key={n.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-white/20 hover:bg-white/[0.05]">
                <div className="flex items-center gap-2">
                  {!n.read_at && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-label="unread" />}
                  <p className="text-sm font-semibold text-neutral-100">{n.title}</p>
                  <span className="ml-auto shrink-0 text-xs text-neutral-600">
                    {new Date(n.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>
                <p className="mt-1.5 text-sm leading-6 text-neutral-300">{n.body}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Declarations */}
      <section>
        <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-neutral-500">You’re claiming</h2>
        <div className="space-y-2">
          {declarations.map((d) => (
            <div key={d.id} className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-white/20 hover:bg-white/[0.05]">
              <p className="text-[15px] leading-7 text-neutral-100">“{d.declaration}”</p>
              <button type="button" onClick={() => archive("declaration", d.id)} className="text-xs text-neutral-600 hover:text-neutral-300">archive</button>
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input value={newDecl} onChange={(e) => setNewDecl(e.target.value)} placeholder="Something you’re claiming…"
            className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-neutral-50 placeholder:text-neutral-600 focus:border-accent/50 focus:outline-none" />
          <button type="button" onClick={addDeclaration} disabled={busy || !newDecl.trim()}
            className="rounded-lg bg-neutral-50 px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-white disabled:opacity-50">Add</button>
        </div>
      </section>

      {/* Life context */}
      <section>
        <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-neutral-500">What’s alive in your life</h2>
        <div className="space-y-2">
          {contexts.map((c) => (
            <div key={c.id} className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-white/20 hover:bg-white/[0.05]">
              <div>
                <p className="text-xs font-medium text-neutral-400">{CATEGORY_LABEL[c.category] ?? "Life"}</p>
                <p className="mt-1 text-sm leading-6 text-neutral-200">{c.description}</p>
              </div>
              <button type="button" onClick={() => archive("life_context", c.id)} className="text-xs text-neutral-600 hover:text-neutral-300">archive</button>
            </div>
          ))}
        </div>
        <div className="mt-2 space-y-2">
          <div className="flex gap-2">
            <select value={ctxCategory} onChange={(e) => setCtxCategory(e.target.value)}
              className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-2 text-sm text-neutral-200 focus:outline-none">
              {CATEGORIES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
            <input value={ctxText} onChange={(e) => setCtxText(e.target.value)} placeholder="What’s present for you…"
              className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-neutral-50 placeholder:text-neutral-600 focus:border-accent/50 focus:outline-none" />
            <button type="button" onClick={addContext} disabled={busy || !ctxText.trim()}
              className="rounded-lg bg-neutral-50 px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-white disabled:opacity-50">Add</button>
          </div>
        </div>
      </section>

      {/* Insights */}
      {remembered.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-neutral-500">Things you asked me to remember</h2>
          <div className="space-y-2">
            {remembered.map((i) => (
              <div key={i.id} className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-white/20 hover:bg-white/[0.05]">
                <div>
                  <p className="text-sm leading-6 text-neutral-200">{i.content}</p>
                  <p className="mt-1 text-xs text-neutral-600">{new Date(i.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                </div>
                <button type="button" onClick={() => archive("insight", i.id)} className="text-xs text-neutral-600 hover:text-neutral-300">forget</button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
