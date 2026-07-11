"use client";

import { useEffect, useState } from "react";
import { authedFetch } from "@/lib/api";
import LocationAutocomplete from "@/components/LocationAutocomplete";
import { CopyButton } from "@/components/CopyButton";
import { SkeletonLines } from "@/components/Skeleton";

type Person = {
  id: string; name: string; relationship: string | null; birthDate: string;
  timeUnknown: boolean; sunSign: string | null; moonSign: string | null; risingSign: string | null;
};
type SynAspect = { a: string; b: string; type: string; glyph: string; orb: number };

export default function PeoplePage() {
  const [people, setPeople] = useState<Person[]>([]);
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

  async function load() {
    setError(null);
    try {
      const res = await authedFetch("/api/companion/people", { method: "GET" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load your people.");
      setPeople(data.people ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load your people.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

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
          <h1 className="text-2xl font-bold tracking-tight text-neutral-50">People</h1>
          <p className="mt-1 text-sm text-neutral-400">The connections you want to understand. I read your charts together.</p>
        </div>
        <button type="button" onClick={() => setShowAdd((v) => !v)}
          className="shrink-0 rounded-lg bg-neutral-50 px-4 py-2 text-sm font-semibold text-neutral-950 transition-colors hover:bg-white">
          {showAdd ? "Close" : "Add someone"}
        </button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

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
              className="rounded-lg bg-neutral-50 px-5 py-2 text-sm font-semibold text-neutral-950 transition-colors hover:bg-white disabled:opacity-50">
              {adding ? "Reading their chart…" : "Add"}
            </button>
          </div>
        </div>
      )}

      {people.length === 0 && !showAdd ? (
        <p className="text-sm text-neutral-600">No one yet. Add someone to see how your charts move together.</p>
      ) : (
        <div className="space-y-3">
          {people.map((p) => (
            <div key={p.id} className="card-glow rounded-2xl border border-white/5 p-4 transition-colors hover:border-white/10">
              <div className="flex items-center justify-between gap-3">
                <button type="button" onClick={() => selectPerson(p.id)} className="flex-1 text-left">
                  <p className="text-sm font-semibold text-neutral-50">
                    {p.name}{p.relationship ? <span className="font-normal text-neutral-400"> · {p.relationship}</span> : null}
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {p.sunSign ? `Sun ${p.sunSign}` : ""}{p.moonSign ? ` · Moon ${p.moonSign}` : ""}{p.risingSign && !p.timeUnknown ? ` · Rising ${p.risingSign}` : ""}
                  </p>
                </button>
                <button type="button" onClick={() => removePerson(p.id)} className="text-xs text-neutral-600 hover:text-neutral-300">remove</button>
              </div>

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
                          <div className="mt-3 flex justify-end">
                            <CopyButton text={`${p.name}${p.relationship ? ` (${p.relationship})` : ""}\n\n${reading}`} label="Copy reading" />
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
