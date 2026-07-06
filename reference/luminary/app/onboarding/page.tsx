"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BirthChartSVG } from "@/components/chart/BirthChartSVG";
import { Spinner } from "@/components/ui/primitives";
import { fetchJSON } from "@/lib/client";
import type { NatalChart } from "@/lib/types";

const CATEGORIES: { key: string; label: string; placeholder: string }[] = [
  { key: "CAREER", label: "Career / Job", placeholder: "e.g. Job searching while figuring out what I actually want…" },
  { key: "RELATIONSHIPS", label: "Relationships / Marriage", placeholder: "e.g. Learning to trust again after…" },
  { key: "FAMILY", label: "Family Dynamics", placeholder: "e.g. Caregiving for my mother; old patterns resurfacing…" },
  { key: "CREATIVE", label: "Creative Practice", placeholder: "e.g. A painter trying to finish incomplete work…" },
  { key: "HEALTH", label: "Health & Healing", placeholder: "e.g. Rebuilding my energy, nervous system work…" },
  { key: "FINANCES", label: "Financial Situation", placeholder: "e.g. Stabilising after a hard year…" },
  { key: "SPIRITUAL", label: "Spiritual Journey", placeholder: "e.g. Returning to a practice I abandoned…" },
];

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [birthCity, setBirthCity] = useState("");
  const [birthCountry, setBirthCountry] = useState("");
  const [location, setLocation] = useState("");

  // Step 2
  const [contexts, setContexts] = useState<Record<string, string>>({});
  const [healing, setHealing] = useState("");
  const [declaration, setDeclaration] = useState("");

  // Step 3
  const [chart, setChart] = useState<NatalChart | null>(null);
  const [welcome, setWelcome] = useState<string | null>(null);

  async function submitStep1() {
    setError(null);
    if (!name || !birthDate || !birthCity) {
      setError("Please share your name, birth date and birth city.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetchJSON<{ chart: NatalChart }>("/api/user/profile", {
        method: "POST",
        body: JSON.stringify({
          name, birthDate, birthTime: timeUnknown ? undefined : birthTime,
          timeUnknown, birthCity, birthCountry, location,
        }),
      });
      setChart(res.chart);
      setStep(2);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function submitStep2() {
    setLoading(true);
    setError(null);
    try {
      const entries = Object.entries(contexts).filter(([, v]) => v.trim());
      for (const [category, description] of entries) {
        await fetchJSON("/api/user/context", {
          method: "POST",
          body: JSON.stringify({
            category,
            title: CATEGORIES.find((c) => c.key === category)?.label ?? category,
            description,
          }),
        });
      }
      if (healing.trim()) {
        await fetchJSON("/api/user/context", {
          method: "POST",
          body: JSON.stringify({ category: "HEALTH", title: "Healing focus", description: healing }),
        });
      }
      if (declaration.trim()) {
        await fetchJSON("/api/user/declarations", {
          method: "POST",
          body: JSON.stringify({ declaration }),
        });
      }
      // Generate the personalised welcome reading.
      const res = await fetchJSON<{ welcome: string }>("/api/user/onboarding");
      setWelcome(res.welcome);
      setStep(3);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function finish() {
    setLoading(true);
    await fetchJSON("/api/user/onboarding", { method: "POST" });
    router.push("/dashboard");
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <div className="mb-8 flex items-center justify-center gap-2">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-1.5 w-16 rounded-full ${s <= step ? "bg-gold" : "bg-white/10"}`}
          />
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {step === 1 && (
        <section className="glass-strong p-7 animate-fade-up">
          <h1 className="heading text-2xl">Let's find your sky</h1>
          <p className="subtle mt-1 text-sm">
            Your birth moment is the seed of everything Luminary knows.
          </p>
          <div className="mt-6 space-y-4">
            <div>
              <label className="label">Your name</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Birth date</label>
                <input type="date" className="input" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
              </div>
              <div>
                <label className="label">Birth time</label>
                <input
                  type="time"
                  className="input disabled:opacity-40"
                  value={birthTime}
                  disabled={timeUnknown}
                  onChange={(e) => setBirthTime(e.target.value)}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-cream-muted">
              <input type="checkbox" checked={timeUnknown} onChange={(e) => setTimeUnknown(e.target.checked)} className="accent-gold" />
              I don't know my exact birth time
            </label>
            {timeUnknown && (
              <p className="rounded-lg border border-white/10 bg-white/5 p-2.5 text-xs text-cream-dim">
                No problem — we'll use noon and note that house placements may shift.
                Your planets and signs are still accurate.
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Birth city</label>
                <input className="input" value={birthCity} onChange={(e) => setBirthCity(e.target.value)} placeholder="e.g. New York" />
              </div>
              <div>
                <label className="label">Birth country</label>
                <input className="input" value={birthCountry} onChange={(e) => setBirthCountry(e.target.value)} placeholder="e.g. United States" />
              </div>
            </div>
            <div>
              <label className="label">Where you live now (optional)</label>
              <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="For accurate local timing" />
            </div>
          </div>
          <button onClick={submitStep1} disabled={loading} className="btn-primary mt-6 w-full">
            {loading ? <Spinner className="h-4 w-4 border-night/40 border-t-night" /> : "Continue →"}
          </button>
        </section>
      )}

      {step === 2 && (
        <section className="glass-strong p-7 animate-fade-up">
          <h1 className="heading text-2xl">Tell Luminary what's happening in your life</h1>
          <p className="subtle mt-1 text-sm">
            Share as much or as little as you like. This is what makes every reading yours.
          </p>
          <div className="mt-6 space-y-4">
            {CATEGORIES.map((c) => (
              <div key={c.key}>
                <label className="label">{c.label}</label>
                <textarea
                  rows={2}
                  className="input resize-none"
                  placeholder={c.placeholder}
                  value={contexts[c.key] ?? ""}
                  onChange={(e) => setContexts((p) => ({ ...p, [c.key]: e.target.value }))}
                />
              </div>
            ))}
            <div className="rounded-xl border border-gold/15 bg-gold/[0.04] p-4">
              <label className="label text-gold">One thing you're working on healing right now</label>
              <textarea rows={2} className="input resize-none" value={healing} onChange={(e) => setHealing(e.target.value)} placeholder="e.g. Letting myself rest without guilt…" />
            </div>
            <div className="rounded-xl border border-gold/15 bg-gold/[0.04] p-4">
              <label className="label text-gold">A declaration or intention you're holding</label>
              <input className="input" value={declaration} onChange={(e) => setDeclaration(e.target.value)} placeholder='e.g. "I will allow myself to feel free."' />
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <button onClick={() => setStep(1)} className="btn-ghost">← Back</button>
            <button onClick={submitStep2} disabled={loading} className="btn-primary flex-1">
              {loading ? <Spinner className="h-4 w-4 border-night/40 border-t-night" /> : "Reveal my chart →"}
            </button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="animate-fade-up text-center">
          <h1 className="heading text-3xl">Welcome, {name.split(" ")[0]}</h1>
          <p className="subtle mt-1">Here is the sky you were born under.</p>
          {chart && (
            <div className="mt-6 animate-fade-up">
              <BirthChartSVG chart={chart} />
            </div>
          )}
          <div className="glass-strong mt-6 p-6 text-left">
            <p className="mb-3 text-xs uppercase tracking-wider text-gold">✶ Your first reading</p>
            {welcome ? (
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-cream/95">{welcome}</p>
            ) : (
              <div className="flex items-center gap-2 text-cream-dim"><Spinner className="h-4 w-4" /> Composing your reading…</div>
            )}
          </div>
          <button onClick={finish} disabled={loading} className="btn-primary mt-6 w-full">
            {loading ? <Spinner className="h-4 w-4 border-night/40 border-t-night" /> : "Enter Luminary ✦"}
          </button>
        </section>
      )}
    </main>
  );
}
