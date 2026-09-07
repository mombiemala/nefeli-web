"use client";

import { useEffect, useState } from "react";
import { authedFetch } from "@/lib/api";
import { track } from "@/lib/analytics";
import LocationAutocomplete from "@/components/LocationAutocomplete";
import { CopyButton } from "@/components/CopyButton";
import { ShareButton } from "@/components/ShareCard";
import { SkeletonLines } from "@/components/Skeleton";
import { HouseholdsSection } from "@/components/companion/HouseholdsSection";

type Person = {
  id: string; name: string; relationship: string | null; birthDate: string;
  timeUnknown: boolean; sunSign: string | null; moonSign: string | null; risingSign: string | null;
};
type SynAspect = { a: string; b: string; type: string; glyph: string; orb: number };
type Connection = {
  personId: string; name: string; relationship: string | null;
  quality: "warm" | "tender" | "quiet"; headline: string; window: string;
  daysSince: number | null; overdue: boolean; surface: boolean; recency: string;
  justLogged?: boolean;
};

/** Whole years old from a birth date, or null if unparseable. */
function ageOf(iso: string): number | null {
  const b = new Date(iso);
  if (Number.isNaN(b.getTime())) return null;
  const now = new Date();
  let a = now.getUTCFullYear() - b.getUTCFullYear();
  const m = now.getUTCMonth() - b.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < b.getUTCDate())) a--;
  return a >= 0 && a < 130 ? a : null;
}

export default function PeoplePage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add form
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [place, setPlace] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [tz, setTz] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  // Synastry
  const [selected, setSelected] = useState<string | null>(null);
  const [aspects, setAspects] = useState<SynAspect[]>([]);
  const [reading, setReading] = useState<string | null>(null);
  const [synLoading, setSynLoading] = useState(false);

  // Parenting insight (per child)
  const [childReadings, setChildReadings] = useState<Record<string, string>>({});
  const [childLoading, setChildLoading] = useState<Record<string, boolean>>({});

  async function load() {
    setError(null);
    try {
      const res = await authedFetch("/api/companion/people", { method: "GET" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load your people.");
      setPeople(data.people ?? []);

      // Relationship "reach out" signals — the week's warm/tender windows plus
      // how long since you last connected. Non-fatal if it fails.
      try {
        const cRes = await authedFetch("/api/companion/connections", { method: "GET" });
        const cData = await cRes.json();
        if (cRes.ok) setConnections(cData.connections ?? []);
      } catch { /* non-fatal */ }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load your people.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function logConnected(personId: string) {
    setConnections((cs) =>
      cs.map((c) =>
        c.personId === personId
          ? { ...c, daysSince: 0, overdue: false, recency: "Connected today", justLogged: true }
          : c,
      ),
    );
    track("connection_logged");
    try {
      await authedFetch("/api/companion/connections", {
        method: "POST",
        body: JSON.stringify({ personId }),
      });
    } catch { /* optimistic — best-effort */ }
  }

  async function handleLocationSelect(item: { label: string; lat: number; lng: number }) {
    setPlace(item.label); setLat(item.lat); setLng(item.lng);
    try {
      const res = await fetch("/api/geo/timezone", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: item.lat, lng: item.lng }),
      });
      const data = await res.json();
      setTz(data.tz ?? null);
    } catch { setTz(null); }
  }

  async function addPerson() {
    if (!name.trim() || !birthDate || lat == null || lng == null || !tz || adding) return;
    setAdding(true);
    try {
      const res = await authedFetch("/api/companion/people", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(), relationship: relationship.trim() || null,
          birthDate, birthTime: timeUnknown ? null : (birthTime || null), timeUnknown,
          birthCity: place, latitude: lat, longitude: lng, timezone: tz,
        }),
      });
      if (res.ok) {
        track("person_added", { relationship: relationship.trim() || null, timeUnknown });
        setName(""); setRelationship(""); setBirthDate(""); setBirthTime("");
        setTimeUnknown(false); setPlace(""); setLat(null); setLng(null); setTz(null);
        setShowAdd(false);
        await load();
      }
    } finally {
      setAdding(false);
    }
  }

  async function selectPerson(id: string) {
    if (selected === id) { setSelected(null); return; }
    setSelected(id); setReading(null); setAspects([]); setSynLoading(true);
    try {
      const res = await authedFetch("/api/companion/synastry", {
        method: "POST", body: JSON.stringify({ personId: id }),
      });
      const data = await res.json();
      if (res.ok) { setReading(data.reading); setAspects(data.aspects ?? []); }
      else setReading("I couldn't read that connection just now.");
    } catch {
      setReading("I couldn't read that connection just now.");
    } finally {
      setSynLoading(false);
    }
  }

  async function loadChildReading(personId: string) {
    if (childLoading[personId]) return;
    setChildLoading((s) => ({ ...s, [personId]: true }));
    setChildReadings((s) => ({ ...s, [personId]: s[personId] ?? "" })); // mark opened
    track("child_read");
    try {
      const res = await authedFetch("/api/companion/child", {
        method: "POST",
        body: JSON.stringify({ personId }),
      });
      const data = await res.json().catch(() => ({}));
      setChildReadings((s) => ({ ...s, [personId]: res.ok ? data.reading : "I couldn't read that just now." }));
    } catch {
      setChildReadings((s) => ({ ...s, [personId]: "I couldn't read that just now." }));
    } finally {
      setChildLoading((s) => ({ ...s, [personId]: false }));
    }
  }

  async function removePerson(id: string) {
    await authedFetch(`/api/companion/people?id=${id}`, { method: "DELETE" });
    if (selected === id) setSelected(null);
    await load();
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="skeleton h-7 w-40 rounded-md" />
        <div className="skeleton h-24 w-full rounded-xl" />
      </div>
    );
  }

  const canAdd = name.trim() && birthDate && lat != null && lng != null && tz;

  return (
    <div className="animate-fade-up mx-auto max-w-2xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-medium tracking-tight text-neutral-50">People</h1>
          <p className="mt-1 text-sm text-neutral-400">The connections you want to understand. I read your charts together.</p>
        </div>
        <button type="button" onClick={() => setShowAdd((v) => !v)}
          className="shrink-0 rounded-lg btn-brand px-4 py-2 text-sm font-semibold">
          {showAdd ? "Close" : "Add someone"}
        </button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {connections.filter((c) => c.surface).length > 0 && (
        <div className="space-y-3">
          <p className="font-marcellus text-xs uppercase tracking-[0.2em] text-neutral-500">Reach out</p>
          {connections.filter((c) => c.surface).slice(0, 4).map((c) => (
            <div
              key={c.personId}
              className={`card-glow rounded-2xl border border-white/5 p-4 ${
                c.quality === "warm" ? "border-l-2 border-l-accent/70"
                : c.quality === "tender" ? "border-l-2 border-l-[color:var(--gold)]/70"
                : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-neutral-50">
                    {c.name}{c.relationship ? <span className="font-normal text-neutral-400"> · {c.relationship}</span> : null}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-neutral-200">
                    {c.headline} <span className="text-neutral-400">{c.window}</span>.
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-500">{c.recency}</p>
                </div>
                {c.justLogged ? (
                  <span className="shrink-0 text-xs text-accent">Noted ✓</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => logConnected(c.personId)}
                    className="shrink-0 rounded-full border border-white/12 px-3 py-1.5 text-xs text-neutral-100 transition-colors hover:border-accent/50"
                  >
                    We connected
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="card-glow space-y-4 rounded-2xl border border-white/5 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Their name"
              className="rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-neutral-50 placeholder:text-neutral-600 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/40" />
            <input value={relationship} onChange={(e) => setRelationship(e.target.value)} placeholder="Relationship (partner, friend…)"
              className="rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-neutral-50 placeholder:text-neutral-600 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/40" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-neutral-400">Birth date</label>
              <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-neutral-50 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/40" />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-400">Birth time</label>
              <input type="time" value={birthTime} disabled={timeUnknown} onChange={(e) => setBirthTime(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-neutral-50 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/40 disabled:opacity-40" />
              <label className="mt-1 flex items-center gap-2 text-xs text-neutral-400">
                <input type="checkbox" checked={timeUnknown} onChange={(e) => setTimeUnknown(e.target.checked)} /> Unknown
              </label>
            </div>
          </div>
          <LocationAutocomplete label="Birth place" value={place}
            onChangeValue={(v, origin) => { setPlace(v); if (origin === "typing") { setLat(null); setLng(null); setTz(null); } }}
            onSelect={handleLocationSelect} placeholder="City, State / Country" />
          <div className="flex justify-end">
            <button type="button" onClick={addPerson} disabled={!canAdd || adding}
              className="rounded-lg btn-brand px-5 py-2 text-sm font-semibold disabled:opacity-50">
              {adding ? "Reading their chart…" : "Add"}
            </button>
          </div>
        </div>
      )}

      {people.length === 0 && !showAdd ? (
        <p className="text-sm text-neutral-600">No one yet. Add someone to see how your charts move together.</p>
      ) : (
        <div className="space-y-3">
          {people.map((p) => {
            const age = ageOf(p.birthDate);
            const isChild = age !== null && age < 18;
            return (
            <div key={p.id} className="card-glow rounded-2xl border border-white/5 p-4 transition-colors hover:border-white/10">
              <div className="flex items-center justify-between gap-3">
                <button type="button" onClick={() => selectPerson(p.id)} className="flex-1 text-left">
                  <p className="text-sm font-semibold text-neutral-50">
                    {p.name}{p.relationship ? <span className="font-normal text-neutral-400"> · {p.relationship}</span> : null}
                    {isChild ? <span className="ml-2 align-middle text-xs text-accent/80">🌱 {age}</span> : null}
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {p.sunSign ? `Sun ${p.sunSign}` : ""}{p.moonSign ? ` · Moon ${p.moonSign}` : ""}{p.risingSign && !p.timeUnknown ? ` · Rising ${p.risingSign}` : ""}
                  </p>
                </button>
                <div className="flex shrink-0 items-center gap-3">
                  {isChild && !(p.id in childReadings) && (
                    <button type="button" onClick={() => loadChildReading(p.id)}
                      className="rounded-full border border-white/12 px-3 py-1.5 text-xs text-neutral-100 transition-colors hover:border-accent/50">
                      Parenting insight
                    </button>
                  )}
                  <button type="button" onClick={() => removePerson(p.id)} className="text-xs text-neutral-600 hover:text-neutral-300">remove</button>
                </div>
              </div>

              {p.id in childReadings && (
                <div className="mt-4 border-t border-white/5 pt-4">
                  <p className="font-marcellus text-xs uppercase tracking-[0.2em] text-accent/80">Parenting insight</p>
                  {childLoading[p.id] && !childReadings[p.id] ? (
                    <div className="mt-3"><SkeletonLines lines={4} /></div>
                  ) : (
                    <>
                      <div className="mt-3 space-y-3 text-[15px] leading-7 text-neutral-200">
                        {childReadings[p.id].split(/\n\n+/).filter(Boolean).map((para, i) => <p key={i}>{para}</p>)}
                      </div>
                      <div className="mt-3 flex items-center justify-end gap-4">
                        <CopyButton text={`${p.name} — parenting insight\n\n${childReadings[p.id]}`} label="Copy" />
                        <ShareButton surface="child" eyebrow="Parenting insight" title={p.name} body={childReadings[p.id]} />
                      </div>
                    </>
                  )}
                </div>
              )}

              {selected === p.id && (
                <div className="mt-4 border-t border-white/5 pt-4">
                  {synLoading ? (
                    <SkeletonLines lines={4} />
                  ) : (
                    <>
                      {aspects.length > 0 && (
                        <div className="mb-3 flex flex-wrap gap-1.5">
                          {aspects.map((a, i) => (
                            <span key={i} className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-neutral-300">
                              {a.a} <span className="text-accent">{a.glyph}</span> {a.b} <span className="text-neutral-500">· {a.orb}°</span>
                            </span>
                          ))}
                        </div>
                      )}
                      {reading && (
                        <>
                          <div className="space-y-3 text-[15px] leading-7 text-neutral-200">
                            {reading.split(/\n\n+/).filter(Boolean).map((para, i) => <p key={i}>{para}</p>)}
                          </div>
                          <div className="mt-3 flex items-center justify-end gap-4">
                            <CopyButton text={`${p.name}${p.relationship ? ` (${p.relationship})` : ""}\n\n${reading}`} label="Copy reading" />
                            <ShareButton
                              surface="synastry"
                              eyebrow={p.relationship ? `You & ${p.relationship}` : "Between you"}
                              title={`You & ${p.name}`}
                              body={reading}
                            />
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}

      <div className="border-t border-white/5 pt-6">
        <HouseholdsSection people={people.map((p) => ({ id: p.id, name: p.name }))} />
      </div>
    </div>
  );
}
