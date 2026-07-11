"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authedFetch } from "@/lib/api";
import { WorldMap } from "@/components/astrology/WorldMap";
import { PLANET_LINE_COLOR, type AstroMap, type NearbyLine } from "@/lib/astrology/astrocartography";
import LocationAutocomplete from "@/components/LocationAutocomplete";
import { CopyButton } from "@/components/CopyButton";
import { SkeletonLines } from "@/components/Skeleton";

const ANGLES: [string, string, boolean][] = [
  ["MC", "Career, visibility, public role", false],
  ["IC", "Home, roots, belonging", true],
  ["ASC", "Identity, vitality, how you're seen", false],
  ["DSC", "Relationships, partnership", true],
];

type Selected = { lat: number; lon: number; label: string };

export default function MapPage() {
  const [loading, setLoading] = useState(true);
  const [map, setMap] = useState<AstroMap | null>(null);
  const [birthplace, setBirthplace] = useState<{ lat: number; lon: number } | undefined>();
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [highlight, setHighlight] = useState<string | null>(null);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [placeQuery, setPlaceQuery] = useState("");
  const [reading, setReading] = useState<string | null>(null);
  const [nearby, setNearby] = useState<NearbyLine[]>([]);
  const [readingLoading, setReadingLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await authedFetch("/api/companion/astrocartography", { method: "GET" });
        const data = await res.json().catch(() => ({}));
        if (res.status === 400 && data.error === "onboarding_required") {
          window.location.href = "/onboarding"; return;
        }
        if (!res.ok) throw new Error(data.error || "Could not load your map.");
        setMap({ lines: data.lines ?? [], timeUnknown: data.timeUnknown });
        setBirthplace(data.birthplace);
        setTimeUnknown(Boolean(data.timeUnknown));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load your map.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function readPlace(lat: number, lon: number, label: string) {
    setSelected({ lat, lon, label });
    setReading(null);
    setNearby([]);
    setReadingLoading(true);
    try {
      const res = await authedFetch("/api/companion/astrocartography", {
        method: "POST",
        body: JSON.stringify({ lat, lon, label }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setReading(data.reading);
        setNearby(data.nearby ?? []);
      } else {
        setReading("I couldn't read that place just now.");
      }
    } catch {
      setReading("I couldn't read that place just now.");
    } finally {
      setReadingLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="skeleton h-7 w-40 rounded-md" />
        <div className="skeleton aspect-[2/1] w-full rounded-xl" />
      </div>
    );
  }

  if (error || !map) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl border border-red-900/50 bg-red-950/20 p-8 text-center">
          <p className="text-sm text-neutral-300">{error || "No map yet."}</p>
        </div>
      </div>
    );
  }

  if (timeUnknown) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-50">Your places</h1>
        <div className="card-glow rounded-2xl border border-white/5 p-6">
          <p className="text-sm leading-6 text-neutral-300">
            Astrocartography lines depend on your exact birth <em>time</em> — the angles rotate through
            the whole map over a single day. Add your birth time and your lines will appear here.
          </p>
          <Link href="/profile" className="mt-4 inline-block rounded-lg bg-neutral-50 px-5 py-2 text-sm font-semibold text-neutral-950 transition-colors hover:bg-white">
            Add birth time
          </Link>
        </div>
      </div>
    );
  }

  const planets = Object.keys(PLANET_LINE_COLOR);

  return (
    <div className="animate-fade-up mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-50">Your places</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Where each planet shaped the sky at your birth. Tap the map or search a city to see what a place activates for you.
        </p>
      </div>

      <div className="card-glow rounded-2xl border border-white/5 p-3">
        <WorldMap map={map} birthplace={birthplace} selected={selected} highlightPlanet={highlight} onPick={(lat, lon) => readPlace(lat, lon, `${lat.toFixed(1)}°, ${lon.toFixed(1)}°`)} />
      </div>

      {/* Planet filter */}
      <div className="flex flex-wrap gap-1.5">
        <button type="button" onClick={() => setHighlight(null)}
          className={`rounded-full border px-3 py-1 text-xs transition-colors ${highlight === null ? "border-white/30 text-neutral-100" : "border-white/10 text-neutral-400 hover:text-neutral-200"}`}>
          All
        </button>
        {planets.map((p) => (
          <button key={p} type="button" onClick={() => setHighlight(highlight === p ? null : p)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${highlight === p ? "border-white/30 text-neutral-100" : "border-white/10 text-neutral-400 hover:text-neutral-200"}`}>
            <span className="h-2 w-2 rounded-full" style={{ background: PLANET_LINE_COLOR[p] }} />
            {p}
          </button>
        ))}
      </div>

      {/* Angle legend */}
      <div className="grid grid-cols-2 gap-2 text-xs text-neutral-400 sm:grid-cols-4">
        {ANGLES.map(([k, meaning, dashed]) => (
          <div key={k} className="flex items-start gap-2">
            <svg width="20" height="8" className="mt-1 shrink-0"><line x1="0" y1="4" x2="20" y2="4" stroke="#f4c77b" strokeWidth="1.5" strokeDasharray={dashed ? "3 2.5" : undefined} /></svg>
            <span><span className="text-neutral-200">{k}</span> — {meaning}</span>
          </div>
        ))}
      </div>

      {/* Location lookup */}
      <div className="card-glow rounded-2xl border border-white/5 p-5">
        <p className="text-sm font-semibold text-neutral-50">What does a place hold for you?</p>
        <div className="mt-3">
          <LocationAutocomplete
            label=""
            value={placeQuery}
            onChangeValue={(v) => setPlaceQuery(v)}
            onSelect={(item) => { setPlaceQuery(item.label); readPlace(item.lat, item.lng, item.label); }}
            placeholder="Search any city…"
          />
        </div>

        {selected && (
          <div className="mt-5">
            <p className="text-xs uppercase tracking-[0.2em] text-accent/80">{selected.label}</p>
            {readingLoading ? (
              <div className="mt-3"><SkeletonLines lines={3} /></div>
            ) : (
              <>
                {nearby.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {nearby.map((n, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1 text-xs text-neutral-300">
                        <span className="h-2 w-2 rounded-full" style={{ background: PLANET_LINE_COLOR[n.planet] }} />
                        {n.planet} {n.angle} <span className="text-neutral-500">· {n.orbDeg}°</span>
                      </span>
                    ))}
                  </div>
                )}
                {reading && (
                  <>
                    <div className="mt-3 space-y-3 text-[15px] leading-7 text-neutral-200">
                      {reading.split(/\n\n+/).filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
                    </div>
                    <div className="mt-3 flex justify-end">
                      <CopyButton text={`${selected.label}\n\n${reading}`} label="Copy reading" />
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
