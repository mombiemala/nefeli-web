"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Archive, Plus, Sparkles } from "lucide-react";
import { Card, SectionTitle, Spinner } from "@/components/ui/primitives";
import { fetchJSON } from "@/lib/client";
import { titleCase } from "@/lib/utils";

interface LifeEntry {
  id: string;
  category: string;
  title: string;
  description: string;
  isActive: boolean;
}
interface Declaration {
  id: string;
  declaration: string;
  contextNote: string | null;
  declaredAt: string;
  isActive: boolean;
}
interface Insight {
  id: string;
  insightType: string;
  title: string;
  content: string;
  createdAt: string;
}

const CATEGORIES = ["CAREER", "RELATIONSHIPS", "FAMILY", "CREATIVE", "HEALTH", "SPIRITUAL", "FINANCES", "OTHER"];

const CATEGORY_ICON: Record<string, string> = {
  CAREER: "💼", RELATIONSHIPS: "💞", FAMILY: "🏡", CREATIVE: "🎨",
  HEALTH: "🌿", SPIRITUAL: "🕯️", FINANCES: "🪙", OTHER: "✦",
};

export function ContextClient() {
  const [entries, setEntries] = useState<LifeEntry[]>([]);
  const [declarations, setDeclarations] = useState<Declaration[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  const [adding, setAdding] = useState(false);
  const [newCat, setNewCat] = useState("CAREER");
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDecl, setNewDecl] = useState("");

  async function reload() {
    const [c, d, i] = await Promise.all([
      fetchJSON<{ entries: LifeEntry[] }>("/api/user/context"),
      fetchJSON<{ declarations: Declaration[] }>("/api/user/declarations"),
      fetchJSON<{ insights: Insight[] }>("/api/user/insights"),
    ]);
    setEntries(c.entries);
    setDeclarations(d.declarations);
    setInsights(i.insights);
  }

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, []);

  async function addEntry() {
    if (!newTitle.trim() || !newDesc.trim()) return;
    await fetchJSON("/api/user/context", {
      method: "POST",
      body: JSON.stringify({ category: newCat, title: newTitle, description: newDesc }),
    });
    setNewTitle("");
    setNewDesc("");
    setAdding(false);
    await reload();
  }

  async function toggleEntry(e: LifeEntry) {
    await fetchJSON("/api/user/context", {
      method: "PATCH",
      body: JSON.stringify({ id: e.id, isActive: !e.isActive }),
    });
    await reload();
  }

  async function addDeclaration() {
    if (!newDecl.trim()) return;
    await fetchJSON("/api/user/declarations", {
      method: "POST",
      body: JSON.stringify({ declaration: newDecl }),
    });
    setNewDecl("");
    await reload();
  }

  async function toggleDeclaration(d: Declaration) {
    await fetchJSON("/api/user/declarations", {
      method: "PATCH",
      body: JSON.stringify({ id: d.id, isActive: !d.isActive }),
    });
    await reload();
  }

  if (loading) return <div className="flex h-40 items-center justify-center"><Spinner /></div>;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Life context */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <SectionTitle>Life context</SectionTitle>
          <button onClick={() => setAdding((a) => !a)} className="btn-ghost text-xs">
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>

        {adding && (
          <Card>
            <select value={newCat} onChange={(e) => setNewCat(e.target.value)} className="input mb-2">
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{CATEGORY_ICON[c]} {titleCase(c)}</option>
              ))}
            </select>
            <input className="input mb-2" placeholder="Title (e.g. Job search)" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
            <textarea className="input mb-3 resize-none" rows={3} placeholder="What's happening?" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
            <button onClick={addEntry} className="btn-primary w-full">Save</button>
          </Card>
        )}

        {entries.length === 0 && !adding && (
          <Card><p className="text-sm text-cream-muted">Nothing here yet. Add what's alive in your life.</p></Card>
        )}

        {entries.map((e) => (
          <Card key={e.id} className={e.isActive ? "" : "opacity-50"}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-cream-dim">{CATEGORY_ICON[e.category]} {titleCase(e.category)}</p>
                <h3 className="heading text-lg">{e.title}</h3>
              </div>
              <button onClick={() => toggleEntry(e)} title={e.isActive ? "Archive" : "Reactivate"} className="text-cream-dim hover:text-gold">
                <Archive className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-cream-muted">{e.description}</p>
            <Link
              href={`/chat?prompt=${encodeURIComponent(`How has my chart supported me around "${e.title}"?`)}&type=LIFE_CONTEXT`}
              className="mt-3 inline-flex items-center gap-1 text-xs text-gold hover:text-gold-soft"
            >
              <Sparkles className="h-3 w-3" /> How has my chart supported this?
            </Link>
          </Card>
        ))}
      </div>

      {/* Declarations + insights */}
      <div className="space-y-4">
        <SectionTitle>Declarations</SectionTitle>
        <Card>
          <div className="flex gap-2">
            <input className="input" placeholder='"I will allow myself to feel free."' value={newDecl} onChange={(e) => setNewDecl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addDeclaration()} />
            <button onClick={addDeclaration} className="btn-primary !px-3"><Plus className="h-4 w-4" /></button>
          </div>
          <ul className="mt-4 space-y-3">
            {declarations.map((d) => (
              <li key={d.id} className={`flex items-start justify-between gap-3 ${d.isActive ? "" : "opacity-50"}`}>
                <div>
                  <p className="text-sm text-cream">“{d.declaration}”</p>
                  <p className="text-[11px] text-cream-dim">Declared {new Date(d.declaredAt).toLocaleDateString()}</p>
                </div>
                <button onClick={() => toggleDeclaration(d)} className="text-[11px] text-cream-dim hover:text-gold">
                  {d.isActive ? "Release" : "Restore"}
                </button>
              </li>
            ))}
            {declarations.length === 0 && <li className="text-sm text-cream-muted">No declarations yet.</li>}
          </ul>
        </Card>

        <SectionTitle>Insights timeline</SectionTitle>
        <Card>
          {insights.length === 0 ? (
            <p className="text-sm text-cream-muted">
              Insights you save from conversations will gather here.
            </p>
          ) : (
            <ol className="relative space-y-4 border-l border-gold/20 pl-4">
              {insights.map((i) => (
                <li key={i.id} className="relative">
                  <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-gold" />
                  <p className="text-[11px] uppercase tracking-wider text-gold">{titleCase(i.insightType)}</p>
                  <p className="text-sm font-medium text-cream">{i.title}</p>
                  <p className="text-xs text-cream-muted">{i.content}</p>
                  <p className="mt-0.5 text-[11px] text-cream-dim">{new Date(i.createdAt).toLocaleDateString()}</p>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </div>
  );
}
