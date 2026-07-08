"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Wordmark } from "@/components/Wordmark";

const FEATURES: [string, string][] = [
  ["Reads your life, not just your sign", "Your chart is the language; your actual life is the subject. Every transit lands in what you’re really living."],
  ["Remembers what you share", "The grief you named last month, the job search, the thing you’re creating — it holds all of it and connects the dots."],
  ["Warm, never doom", "No fatalism, no toxic positivity, no cold horoscope. Honest, caring, and here for the hard days too."],
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
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-800 border-t-neutral-300" />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-neutral-50">
      <nav className="border-b border-white/5">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Wordmark href="/" />
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-neutral-300 transition-colors hover:text-neutral-50">
              Log in
            </Link>
            <Link
              href="/login?mode=signup"
              className="rounded-xl bg-neutral-50 px-4 py-2 text-sm font-medium text-neutral-950 transition-colors hover:bg-white"
            >
              Create account
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* A soft aura behind the headline. */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[720px] max-w-full -translate-x-1/2 rounded-full opacity-60 blur-3xl"
          style={{ background: "radial-gradient(closest-side, rgba(244,199,123,0.10), transparent)" }}
        />
        <div className="relative mx-auto max-w-3xl px-6 pb-20 pt-24 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.35em] text-accent/80">
            Astrology that knows you
          </p>
          <h1 className="mt-5 text-balance text-4xl font-bold leading-[1.1] tracking-tight text-neutral-50 sm:text-6xl">
            An astrology companion that’s actually kind — and{" "}
            <span className="text-accent">remembers you</span>.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-8 text-neutral-400">
            NEFELI reads the sky through <em>your</em> life — your healing, your work, your
            relationships, your creative practice. It remembers what you tell it, and meets you where
            you are, day after day.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link
              href="/login?mode=signup"
              className="rounded-xl bg-neutral-50 px-6 py-3 text-sm font-semibold text-neutral-950 shadow-lg shadow-black/40 transition-colors hover:bg-white"
            >
              Begin
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-white/10 px-6 py-3 text-sm font-medium text-neutral-100 transition-colors hover:border-white/20 hover:bg-white/5"
            >
              Log in
            </Link>
          </div>
        </div>
      </section>

      {/* How it feels */}
      <section className="border-y border-white/5">
        <div className="mx-auto grid max-w-5xl gap-4 px-6 py-16 sm:grid-cols-3">
          {FEATURES.map(([title, body], i) => (
            <div
              key={title}
              className="card-glow rounded-2xl border border-white/5 p-6 transition-colors hover:border-white/10"
            >
              <span className="text-xs font-mono text-accent/70">0{i + 1}</span>
              <h3 className="mt-3 text-base font-semibold text-neutral-50">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-neutral-400">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Daily ritual */}
      <section className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-neutral-50 sm:text-3xl">
          A 60-second ritual that gets to know you
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-pretty text-neutral-400">
          Each day: the energy you’re carrying, guidance for it, and a gentle check-in. You share a
          line about how you’re arriving — NEFELI reflects it back through your chart, and remembers.
        </p>
        <div className="mt-8">
          <Link
            href="/login?mode=signup"
            className="inline-block rounded-xl bg-neutral-50 px-6 py-3 text-sm font-semibold text-neutral-950 shadow-lg shadow-black/40 transition-colors hover:bg-white"
          >
            Create your account
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/5">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <p className="text-sm text-neutral-500">© {new Date().getFullYear()} NEFELI</p>
          <div className="flex items-center gap-6">
            <Link href="/login" className="text-sm text-neutral-400 transition-colors hover:text-neutral-300">Log in</Link>
            <Link href="/privacy" className="text-sm text-neutral-400 transition-colors hover:text-neutral-300">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
