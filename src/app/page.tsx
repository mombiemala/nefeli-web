"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Wordmark } from "@/components/Wordmark";

const DIFFERENTIATORS: [string, string][] = [
  ["Reads your life, not your sign", "Every transit lands in what you’re actually living — your work, your loves, your healing."],
  ["Remembers what you share", "The grief you named, the job you’re chasing, the thing you’re making. It holds all of it."],
  ["Warm, never doom", "No fatalism, no cold horoscope. Honest and kind — here for the hard days too."],
];

export default function Home() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        window.location.href = "/app";
        return;
      }
      setChecking(false);
    })();
  }, []);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/10 border-t-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-neutral-50">
      <nav className="border-b border-white/5">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Wordmark href="/" />
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-neutral-300 transition-colors hover:text-neutral-50">
              Log in
            </Link>
            <Link href="/login?mode=signup" className="btn-brand rounded-full px-4 py-2 text-sm font-semibold">
              Begin
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 h-[460px] w-[820px] max-w-full -translate-x-1/2 rounded-full opacity-70 blur-3xl"
          style={{ background: "radial-gradient(closest-side, rgba(185,162,242,0.18), rgba(240,171,199,0.08), transparent)" }}
        />
        <div className="relative mx-auto max-w-3xl px-6 pb-16 pt-24 text-center">
          <p className="font-marcellus text-xs uppercase tracking-[0.32em] text-accent">
            Your personal astrology companion
          </p>
          <h1 className="mx-auto mt-6 max-w-[15ch] text-balance text-5xl leading-[1.04] text-neutral-50 sm:text-7xl">
            The sky, read through <em className="italic text-accent">your</em> life.
          </h1>
          <p className="mx-auto mt-7 max-w-xl text-pretty text-lg leading-8 text-neutral-300">
            Not another one-size-fits-all horoscope. NEFELI reads your whole chart through what’s
            actually happening for you — and remembers what you share.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link href="/login?mode=signup" className="btn-brand rounded-full px-7 py-3.5 text-sm font-semibold">
              Begin your chart
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-white/12 px-7 py-3.5 text-sm text-neutral-100 transition-colors hover:border-accent/50"
            >
              Log in
            </Link>
          </div>
          <p className="mt-5 text-sm text-neutral-500">Free to start · birth time optional · gentle, never doom-y</p>
        </div>
      </section>

      {/* What makes it different */}
      <section className="border-y border-white/5">
        <div className="mx-auto grid max-w-5xl gap-4 px-6 py-16 sm:grid-cols-3">
          {DIFFERENTIATORS.map(([title, body]) => (
            <div key={title} className="card-glow rounded-2xl border border-white/5 p-6">
              <span className="text-accent" aria-hidden>✦</span>
              <h3 className="font-display mt-3 text-2xl leading-tight text-neutral-50">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-neutral-300">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Everything, in one place */}
      <section className="mx-auto max-w-3xl px-6 py-20 text-center">
        <p className="font-marcellus text-xs uppercase tracking-[0.3em] text-accent/90">Everything, in one place</p>
        <h2 className="font-display mx-auto mt-4 max-w-[20ch] text-balance text-3xl leading-tight text-neutral-50 sm:text-4xl">
          Your chart, your timing, your people & places — all personal.
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-pretty leading-7 text-neutral-300">
          A daily reading tied to your real life. Your chart in plain language. The best days ahead.
          Your bonds and your household. A companion to talk it through — that grows with you.
        </p>
        <div className="mt-9">
          <Link href="/login?mode=signup" className="btn-brand inline-block rounded-full px-7 py-3.5 text-sm font-semibold">
            Meet NEFELI
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/5">
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
