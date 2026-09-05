"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authedFetch } from "@/lib/api";

type Person = { id: string; name: string };
type Household = { id: string; name: string; includeSelf: boolean; memberCount: number };

export function HouseholdsSection({ people }: { people: Person[] }) {
  const [households, setHouseholds] = useState<Household[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [includeSelf, setIncludeSelf] = useState(true);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const res = await authedFetch("/api/companion/households", { method: "GET" });
      const data = await res.json();
      if (res.ok) setHouseholds(data.households ?? []);
    } catch { /* non-fatal */ }
  }
  useEffect(() => { load(); }, []);

  function toggle(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const canSave = name.trim() && (picked.size > 0 || includeSelf) && !saving;

  async function create() {
    if (!canSave) return;
    setSaving(true);
    try {
      const res = await authedFetch("/api/companion/households", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), includeSelf, memberPersonIds: [...picked] }),
      });
      if (res.ok) {
        setName(""); setPicked(new Set()); setIncludeSelf(true); setShowForm(false);
        await load();
      }
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    await authedFetch(`/api/companion/households?id=${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-neutral-50">Households</h2>
          <p className="text-xs text-neutral-500">Group people together for daily group weather &amp; compatibility.</p>
        </div>
        <button type="button" onClick={() => setShowForm((v) => !v)}
          className="shrink-0 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-neutral-100 transition-colors hover:bg-white/5">
          {showForm ? "Close" : "New household"}
        </button>
      </div>

      {showForm && (
        <div className="card-glow space-y-3 rounded-2xl border border-white/5 p-4">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Household name (e.g. Home, The Riveras)"
            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-neutral-50 placeholder:text-neutral-600 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/40" />
          <label className="flex items-center gap-2 text-sm text-neutral-300">
            <input type="checkbox" checked={includeSelf} onChange={(e) => setIncludeSelf(e.target.checked)} /> Include me
          </label>
          {people.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {people.map((p) => (
                <button key={p.id} type="button" onClick={() => toggle(p.id)}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${picked.has(p.id) ? "border-accent/50 bg-accent/10 text-neutral-50" : "border-white/10 text-neutral-400 hover:text-neutral-200"}`}>
                  {p.name}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-neutral-600">Add people above first, then group them here.</p>
          )}
          <div className="flex justify-end">
            <button type="button" onClick={create} disabled={!canSave}
              className="rounded-lg btn-brand px-5 py-2 text-sm font-semibold disabled:opacity-50">
              {saving ? "Creating…" : "Create"}
            </button>
          </div>
        </div>
      )}

      {households.length > 0 && (
        <div className="space-y-2">
          {households.map((h) => (
            <div key={h.id} className="card-glow flex items-center justify-between rounded-2xl border border-white/5 p-4">
              <Link href={`/household/${h.id}`} className="flex-1">
                <p className="text-sm font-semibold text-neutral-50">{h.name}</p>
                <p className="text-xs text-neutral-500">{h.memberCount} {h.memberCount === 1 ? "member" : "members"}</p>
              </Link>
              <div className="flex items-center gap-3">
                <Link href={`/household/${h.id}`} className="text-xs text-accent hover:underline">Open</Link>
                <button type="button" onClick={() => remove(h.id)} className="text-xs text-neutral-600 hover:text-neutral-300">remove</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
