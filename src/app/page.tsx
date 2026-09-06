"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Wordmark } from "@/components/Wordmark";

const SURFACES: { title: string; body: string; icon: React.ReactNode }[] = [
  {
    title: "Today",
    body: "A daily reading tied to what’s actually going on for you — never a generic sun-sign horoscope.",
    icon: <><circle cx="12" cy="12" r="4" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2 2M17.1 17.1l2 2M19.1 4.9l-2 2M6.9 17.1l-2 2" strokeLinecap="round" /></>,
  },
  {
    title: "Your chart, decoded",
    body: "Sun, Moon, Rising and the whole map — explained like a wise friend would, not a textbook.",
    icon: <><circle cx="12" cy="12" r="9" /><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4" /></>,
  },
  {
    title: "Timing",
    body: "See the energy of the days ahead and find your best windows — for love, work, or rest.",
    icon: <><path d="M3 15c3-6 5-6 6 0s3 6 6 0 3-4 6 0" strokeLinecap="round" /><path d="M3 20h18" opacity=".5" /></>,
  },
  {
    title: "People & home",
    body: "Read your bond with a partner or friend — or the whole weather of your household, kids included.",
    icon: <><circle cx="8" cy="9" r="3" /><circle cx="16" cy="9" r="3" /><path d="M3 20c0-3 2.2-5 5-5s5 2 5 5M13 20c.4-2.2 2-3.6 4-3.6" strokeLinecap="round" /></>,
  },
  {
    title: "Your places",
    body: "Where on Earth your stars line up — so you know where you’re likely to feel most yourself.",
    icon: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></>,
  },
  {
    title: "Companion chat",
    body: "Talk it through any time. NEFELI remembers what you share and grows with you, day after day.",
    icon: <><path d="M4 5h16v11H9l-4 3.5V16H4z" strokeLinejoin="round" /><path d="M12 8.5l.9 1.8 1.9.3-1.4 1.4.3 1.9-1.7-.9-1.7.9.3-1.9L9 10.6l1.9-.3z" fill="currentColor" stroke="none" /></>,
  },
];

const STEPS: [string, string, string][] = [
  ["i.", "Share your birth moment", "Date, time, and place. That’s your map — computed precisely, in seconds."],
  ["ii.", "Tell it what’s alive for you", "Your healing, your work, your loves. NEFELI listens, and holds it."],
  ["iii.", "Return each day", "It reads the sky through you — and reaches out gently when something shifts."],
];

function Starfield() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const cv = canvas;
    const c2d = ctx;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const colors = ["#7c6bb0", "#b9a2f2", "#ecd08a"];
    let stars: { x: number; y: number; r: number; a: number; tw: number; ph: number; c: string }[] = [];
    let raf = 0, W = 0, H = 0;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    function init() {
      W = cv.width = innerWidth * dpr;
      H = cv.height = Math.min(innerHeight, 900) * dpr;
      cv.style.width = innerWidth + "px";
      cv.style.height = Math.min(innerHeight, 900) + "px";
      const n = Math.min(140, Math.floor((innerWidth * 900) / 11000));
      stars = Array.from({ length: n }, () => ({
        x: Math.random() * W, y: Math.random() * H, r: (Math.random() * 1.3 + 0.35) * dpr,
        a: Math.random() * 0.5 + 0.2, tw: Math.random() * 0.02 + 0.004, ph: Math.random() * 6.28,
        c: colors[Math.random() < 0.12 ? 2 : Math.random() < 0.4 ? 1 : 0],
      }));
      if (reduce) draw(0);
    }
    function draw(t: number) {
      c2d.clearRect(0, 0, W, H);
      for (const s of stars) {
        const a = reduce ? s.a : s.a + Math.sin(t * s.tw + s.ph) * 0.28;
        c2d.globalAlpha = Math.max(0.05, Math.min(0.85, a));
        c2d.beginPath();
        c2d.arc(s.x, s.y, s.r, 0, 6.2832);
        c2d.fillStyle = s.c;
        c2d.fill();
      }
      c2d.globalAlpha = 1;
    }
    function loop() { raf = requestAnimationFrame((ts) => { draw(ts * 0.06); loop(); }); }
    init();
    if (!reduce) loop();
    addEventListener("resize", init);
    return () => { cancelAnimationFrame(raf); removeEventListener("resize", init); };
  }, []);
  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10" />;
}

export default function Home() {
  // The landing renders immediately for everyone — logged-out visitors (and
  // crawlers) see the hero on first paint. We only bounce an already-signed-in
  // user to the app, in the background, using the locally-cached session so the
  // redirect is near-instant with no spinner gate.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) window.location.href = "/app";
    });
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden text-neutral-50">
      <Starfield />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[560px] w-[900px] max-w-full -translate-x-1/2 rounded-full opacity-70 blur-3xl"
        style={{ background: "radial-gradient(closest-side, rgba(185,162,242,0.20), rgba(240,171,199,0.09), transparent)" }}
      />

      <nav className="relative">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <Wordmark href="/" />
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-neutral-300 transition-colors hover:text-neutral-50">Log in</Link>
            <Link href="/login?mode=signup" className="btn-brand rounded-full px-4 py-2 text-sm font-semibold">Begin</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="relative mx-auto max-w-3xl px-6 pb-14 pt-20 text-center">
        <p className="font-marcellus text-xs uppercase tracking-[0.32em] text-accent">Your personal astrology companion</p>
        <h1 className="mx-auto mt-6 max-w-[15ch] text-balance text-5xl leading-[1.04] text-neutral-50 sm:text-7xl">
          The sky, read through <em className="italic text-accent">your</em> life.
        </h1>
        <p className="mx-auto mt-7 max-w-xl text-pretty text-lg leading-8 text-neutral-300">
          Not another one-size-fits-all horoscope. NEFELI reads your whole chart through what’s actually
          happening for you — and remembers what you share.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link href="/login?mode=signup" className="btn-brand rounded-full px-7 py-3.5 text-sm font-semibold">Begin your chart</Link>
          <Link href="/login" className="rounded-full border border-white/12 px-7 py-3.5 text-sm text-neutral-100 transition-colors hover:border-accent/50">Log in</Link>
        </div>
        <p className="mt-5 text-sm text-neutral-500">Free to start · birth time optional · gentle, never doom-y</p>
      </header>

      {/* Six surfaces */}
      <section className="relative border-y border-white/5 bg-[#171226]/40">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <div className="mx-auto max-w-xl text-center">
            <p className="font-marcellus text-xs uppercase tracking-[0.3em] text-accent/90">Everything, in one place</p>
            <h2 className="font-display mt-4 text-balance text-3xl leading-tight text-neutral-50 sm:text-4xl">
              Six ways NEFELI reads the sky for <em className="italic text-accent">you</em> — not for everyone.
            </h2>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SURFACES.map((s) => (
              <article key={s.title} className="card-glow rounded-2xl border border-white/5 p-6">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className="text-accent">{s.icon}</svg>
                <h3 className="font-display mt-4 text-2xl leading-tight text-neutral-50">{s.title}</h3>
                <p className="mt-2 text-sm leading-6 text-neutral-300">{s.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="relative mx-auto max-w-5xl px-6 py-20">
        <div className="max-w-xl">
          <p className="font-marcellus text-xs uppercase tracking-[0.3em] text-accent/90">How it works</p>
          <h2 className="font-display mt-4 text-3xl leading-tight text-neutral-50 sm:text-4xl">Three quiet steps, then it’s yours.</h2>
        </div>
        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          {STEPS.map(([no, title, body]) => (
            <div key={no}>
              <div className="font-display text-3xl italic text-accent">{no}</div>
              <h3 className="mt-2 text-lg font-medium text-neutral-50">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-neutral-400">{body}</p>
              <div className="mt-4 h-px bg-gradient-to-r from-accent/60 to-transparent" />
            </div>
          ))}
        </div>
      </section>

      {/* Differentiator */}
      <section className="relative border-y border-white/5 bg-[#171226]/40">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <p className="font-display text-balance text-3xl leading-snug text-neutral-100 sm:text-4xl">
            Most apps hand everyone the same horoscope. NEFELI reads <em className="italic text-accent">your</em> chart
            through <em className="italic text-accent">your</em> life — and remembers.
          </p>
        </div>
      </section>

      {/* Closing */}
      <section className="relative mx-auto max-w-3xl px-6 py-24 text-center">
        <p className="font-marcellus text-xs uppercase tracking-[0.3em] text-accent/90">Your chart is waiting</p>
        <h2 className="font-display mt-4 text-4xl leading-tight text-neutral-50 sm:text-5xl">Meet the sky that knows you.</h2>
        <p className="mx-auto mt-5 max-w-md text-neutral-300">Free to start. No pressure, no doom — just a companion that pays attention.</p>
        <div className="mt-9">
          <Link href="/login?mode=signup" className="btn-brand inline-block rounded-full px-8 py-4 text-sm font-semibold">Begin your chart</Link>
        </div>
      </section>

      <footer className="relative border-t border-white/5">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <p className="text-sm text-neutral-500">© {new Date().getFullYear()} NEFELI</p>
          <div className="flex items-center gap-6">
            <Link href="/login" className="text-sm text-neutral-400 transition-colors hover:text-neutral-200">Log in</Link>
            <Link href="/privacy" className="text-sm text-neutral-400 transition-colors hover:text-neutral-200">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
