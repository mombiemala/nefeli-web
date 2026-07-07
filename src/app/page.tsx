"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

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
      <div className="flex min-h-screen items-center justify-center bg-neutral-950">
        <p className="text-neutral-400">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50">
      <nav className="border-b border-neutral-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-sm font-semibold tracking-[0.25em] text-neutral-200">
            NEFELI
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-neutral-300 transition-colors hover:text-neutral-50">
              Log in
            </Link>
            <Link
              href="/login?mode=signup"
              className="rounded-xl bg-neutral-50 px-4 py-2 text-sm font-medium text-neutral-950 transition-colors hover:bg-neutral-100"
            >
              Create account
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-neutral-50 sm:text-5xl">
          An astrology companion that’s actually kind — and remembers you.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-neutral-400">
          NEFELI reads the sky through <em>your</em> life — your healing, your work, your
          relationships, your creative practice. It remembers what you tell it, and meets you where
          you are, day after day.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Link
            href="/login?mode=signup"
            className="rounded-xl bg-neutral-50 px-6 py-3 text-sm font-semibold text-neutral-950 transition-colors hover:bg-neutral-100"
          >
            Begin
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-neutral-700 px-6 py-3 text-sm font-medium text-neutral-100 transition-colors hover:border-neutral-600 hover:bg-neutral-900/50"
          >
            Log in
          </Link>
        </div>
      </section>

      {/* How it feels */}
      <section className="border-y border-neutral-900 bg-neutral-950/50">
        <div className="mx-auto grid max-w-5xl gap-8 px-6 py-16 sm:grid-cols-3">
          {[
            ["Reads your life, not just your sign", "Your chart is the language; your actual life is the subject. Every transit lands in what you’re really living."],
            ["Remembers what you share", "The grief you named last month, the job search, the thing you’re creating — it holds all of it and connects the dots."],
            ["Warm, never doom", "No fatalism, no toxic positivity, no cold horoscope. Honest, caring, and here for the hard days too."],
          ].map(([title, body]) => (
            <div key={title}>
              <h3 className="text-base font-semibold text-neutral-50">{title}</h3>
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
        <p className="mx-auto mt-4 max-w-xl text-neutral-400">
          Each day: the energy you’re carrying, guidance for it, and a gentle check-in. You share a
          line about how you’re arriving — NEFELI reflects it back through your chart, and remembers.
        </p>
        <div className="mt-8">
          <Link
            href="/login?mode=signup"
            className="inline-block rounded-xl bg-neutral-50 px-6 py-3 text-sm font-semibold text-neutral-950 transition-colors hover:bg-neutral-100"
          >
            Create your account
          </Link>
        </div>
      </section>

      <footer className="border-t border-neutral-900">
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
