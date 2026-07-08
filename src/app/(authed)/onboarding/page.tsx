"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { authedFetch } from "@/lib/api";
import LocationAutocomplete from "@/components/LocationAutocomplete";

const CATEGORIES: Array<[string, string]> = [
  ["career", "Career & work"],
  ["relationships", "Relationships"],
  ["family", "Family"],
  ["creative", "Creative practice"],
  ["health", "Health & healing"],
  ["spiritual", "Spiritual life"],
  ["finances", "Money"],
];

const TOTAL_STEPS = 4;

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [welcome, setWelcome] = useState<string | null>(null);

  // Step 1
  const [name, setName] = useState("");
  // Step 2
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [birthPlace, setBirthPlace] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [tz, setTz] = useState<string | null>(null);
  // Step 3
  const [contexts, setContexts] = useState<Record<string, string>>({});
  const [healingFocus, setHealingFocus] = useState("");
  // Step 4
  const [declaration, setDeclaration] = useState("");

  async function handleLocationSelect(item: { label: string; lat: number; lng: number }) {
    setBirthPlace(item.label);
    setLat(item.lat);
    setLng(item.lng);
    try {
      const res = await fetch("/api/geo/timezone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: item.lat, lng: item.lng }),
      });
      const data = await res.json();
      setTz(data.tz ?? null);
    } catch {
      setTz(null);
    }
  }

  function next() {
    setError(null);
    if (step === 1) {
      if (!name.trim()) return setError("Tell me what to call you.");
    } else if (step === 2) {
      if (!birthDate) return setError("Your birth date is needed for your chart.");
      if (lat === null || lng === null || !tz)
        return setError("Please pick your birth place from the list so I can read your chart.");
    }
    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  }
  function back() {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
  }

  async function finish() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return setError("Please log in again.");

    setSaving(true);
    setError(null);

    const lifeContexts = [
      ...CATEGORIES
        .filter(([key]) => contexts[key]?.trim())
        .map(([key]) => ({ category: key, description: contexts[key].trim() })),
      ...(healingFocus.trim()
        ? [{ category: "health", title: "Healing focus", description: healingFocus.trim() }]
        : []),
    ];

    try {
      const res = await authedFetch("/api/companion/onboarding", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          birthDate,
          birthTime: timeUnknown ? null : (birthTime || null),
          timeUnknown,
          birthCity: birthPlace.trim(),
          birthCountry: "",
          latitude: lat,
          longitude: lng,
          timezone: tz,
          lifeContexts,
          declaration: declaration.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        setSaving(false);
        return;
      }
      setWelcome(data.welcome || "");
    } catch (e) {
      setError("Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  // ── Welcome reading (the Day-0 moment) ──
  if (welcome !== null) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8">
          <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">Your welcome</p>
          <div className="mt-4 space-y-4 text-[15px] leading-7 text-neutral-200">
            {welcome.split(/\n\n+/).filter(Boolean).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <a
            href="/app"
            className="mt-8 inline-block rounded-lg bg-neutral-50 px-6 py-2.5 text-sm font-semibold text-neutral-950 transition-colors hover:bg-white"
          >
            Enter NEFELI
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-50">Let’s begin</h1>
        <p className="mt-2 text-sm text-neutral-400">
          A few things so I can read the sky through your actual life — not a generic horoscope.
        </p>
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-2">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full ${s <= step ? "bg-neutral-50" : "bg-neutral-800"}`} />
          ))}
        </div>
        <p className="mt-2 text-xs text-neutral-500">Step {step} of {TOTAL_STEPS}</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8">
        {step === 1 && (
          <>
            <h2 className="text-xl font-semibold text-neutral-50">What should I call you?</h2>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="mt-6 block w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-neutral-50 placeholder:text-neutral-500 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/40"
            />
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-xl font-semibold text-neutral-50">Your birth details</h2>
            <p className="mt-2 text-sm text-neutral-400">These place the planets exactly where they were for you.</p>
            <div className="mt-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-neutral-200">Birth date</label>
                <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)}
                  className="mt-2 block w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-neutral-50 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/40" />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-200">Birth time</label>
                <input type="time" value={birthTime} disabled={timeUnknown}
                  onChange={(e) => setBirthTime(e.target.value)}
                  className="mt-2 block w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-neutral-50 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/40 disabled:opacity-40" />
                <label className="mt-2 flex items-center gap-2 text-xs text-neutral-400">
                  <input type="checkbox" checked={timeUnknown} onChange={(e) => setTimeUnknown(e.target.checked)} />
                  I don’t know my birth time
                </label>
              </div>
              <div>
                <LocationAutocomplete
                  label="Birth place"
                  value={birthPlace}
                  onChangeValue={(v, origin) => {
                    setBirthPlace(v);
                    if (origin === "typing") { setLat(null); setLng(null); setTz(null); }
                  }}
                  onSelect={handleLocationSelect}
                  placeholder="City, State / Country"
                  helpText="Pick from the list so I can place your rising sign and houses."
                />
                {tz && <p className="mt-2 text-xs text-neutral-400">Timezone: {tz}</p>}
              </div>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="text-xl font-semibold text-neutral-50">What’s alive for you right now?</h2>
            <p className="mt-2 text-sm text-neutral-400">
              Share whatever’s present in any of these. I’ll remember it and read your transits through it.
            </p>
            <div className="mt-6 space-y-4">
              {CATEGORIES.map(([key, label]) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-neutral-400">{label}</label>
                  <textarea
                    rows={2}
                    value={contexts[key] ?? ""}
                    onChange={(e) => setContexts((c) => ({ ...c, [key]: e.target.value }))}
                    placeholder="Optional — a sentence or two"
                    className="mt-1 block w-full resize-none rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-neutral-50 placeholder:text-neutral-600 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/40"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-neutral-400">A healing focus (optional)</label>
                <textarea
                  rows={2}
                  value={healingFocus}
                  onChange={(e) => setHealingFocus(e.target.value)}
                  placeholder="What are you tending to or working through?"
                  className="mt-1 block w-full resize-none rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-neutral-50 placeholder:text-neutral-600 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/40"
                />
              </div>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h2 className="text-xl font-semibold text-neutral-50">Is there something you’re claiming?</h2>
            <p className="mt-2 text-sm text-neutral-400">
              An intention, a boundary, a truth you’re stepping into. Optional — I’ll hold it with you.
            </p>
            <textarea
              rows={4}
              value={declaration}
              onChange={(e) => setDeclaration(e.target.value)}
              placeholder="“I’m done shrinking to keep the peace.”"
              className="mt-6 block w-full resize-none rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-neutral-50 placeholder:text-neutral-600 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/40"
            />
          </>
        )}

        {error && (
          <div className="mt-6 rounded-lg border border-red-800/50 bg-red-950/20 p-3 text-sm text-red-200">{error}</div>
        )}

        <div className="mt-8 flex justify-between">
          <button type="button" onClick={back} disabled={step === 1}
            className="rounded-lg border border-white/10 bg-transparent px-6 py-2.5 text-sm font-semibold text-neutral-50 transition-colors hover:border-white/15 hover:bg-white/[0.03] disabled:opacity-40">
            Back
          </button>
          {step < TOTAL_STEPS ? (
            <button type="button" onClick={next}
              className="rounded-lg bg-neutral-50 px-6 py-2.5 text-sm font-semibold text-neutral-950 transition-colors hover:bg-white">
              Continue
            </button>
          ) : (
            <button type="button" onClick={finish} disabled={saving}
              className="rounded-lg bg-neutral-50 px-6 py-2.5 text-sm font-semibold text-neutral-950 transition-colors hover:bg-white disabled:opacity-50">
              {saving ? "Reading your chart…" : "Meet NEFELI"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
