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
        <div className="text-center">
          <p className="text-neutral-400">Loading…</p>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50">
      {/* Top Nav */}
      <nav className="border-b border-neutral-900">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-sm font-semibold tracking-[0.25em] text-neutral-200">
              NEFELI
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="text-sm font-medium text-neutral-300 transition-colors hover:text-neutral-50"
              >
                Log in
              </Link>
              <Link
                href="/login"
                className="rounded-xl bg-neutral-50 px-4 py-2 text-sm font-medium text-neutral-950 transition-colors hover:bg-neutral-100"
              >
                Create account
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-neutral-50 sm:text-5xl lg:text-6xl">
              Astrology-backed style guidance that feels like you.
            </h1>
            <p className="mt-6 text-lg leading-8 text-neutral-400">
              NEFELI turns your chart + your goals into practical outfit and beauty direction you
              can save and reuse.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/login"
                className="rounded-xl bg-neutral-50 px-6 py-3 text-sm font-semibold text-neutral-950 transition-colors hover:bg-neutral-100"
              >
                Create account
              </Link>
              <Link
                href="/login"
                className="rounded-xl border border-neutral-700 bg-transparent px-6 py-3 text-sm font-medium text-neutral-100 transition-colors hover:border-neutral-600 hover:bg-neutral-900/50"
              >
                Log in
              </Link>
            </div>
          </div>
          <div className="lg:pl-8">
            {/* Product Preview Card */}
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-neutral-50">Today</h3>
                <span className="rounded-lg bg-neutral-800 px-2.5 py-1 text-xs font-medium text-neutral-300">
                  Work
                </span>
              </div>
              <div className="mb-4">
                <h4 className="text-base font-semibold text-neutral-50 mb-2">
                  Outfit direction
                </h4>
                <ul className="space-y-2 text-sm text-neutral-300">
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-50" />
                    <span>Choose one statement piece—bold jacket or structured blazer</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-50" />
                    <span>Keep the rest clean and minimal</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-50" />
                    <span>High-contrast combinations work well</span>
                  </li>
                </ul>
              </div>
              <div className="mt-4 flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-950/50 p-3">
                <span className="text-xs text-neutral-400">Saved to board</span>
                <span className="rounded-lg bg-neutral-800 px-2.5 py-1 text-xs font-medium text-neutral-300">
                  Work essentials
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust / Privacy Strip */}
      <section className="border-y border-neutral-900 bg-neutral-950/50">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="flex items-start gap-3">
              <span className="text-xl">🔒</span>
              <div>
                <p className="text-sm font-medium text-neutral-50">You control your data</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-xl">✏️</span>
              <div>
                <p className="text-sm font-medium text-neutral-50">Edit or delete anytime</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-xl">📋</span>
              <div>
                <p className="text-sm font-medium text-neutral-50">
                  Boards keep things organized
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-neutral-50 sm:text-4xl">
            How it works
          </h2>
          <p className="mt-4 text-lg text-neutral-400">
            Get personalized style guidance in three simple steps
          </p>
        </div>
        <div className="grid gap-8 sm:grid-cols-3">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-8">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-neutral-800 text-xl font-bold text-neutral-50">
              1
            </div>
            <h3 className="text-lg font-semibold text-neutral-50 mb-2">
              Create account + add birth details
            </h3>
            <p className="text-sm text-neutral-400">
              Sign up and provide your birth date, time, and location. This helps us calculate your
              astrological placements accurately.
            </p>
          </div>
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-8">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-neutral-800 text-xl font-bold text-neutral-50">
              2
            </div>
            <h3 className="text-lg font-semibold text-neutral-50 mb-2">
              Generate Big 4 placements
            </h3>
            <p className="text-sm text-neutral-400">
              We calculate your Sun, Moon, Rising, and Midheaven signs based on your birth
              information.
            </p>
          </div>
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-8">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-neutral-800 text-xl font-bold text-neutral-50">
              3
            </div>
            <h3 className="text-lg font-semibold text-neutral-50 mb-2">
              Get guidance + save to boards
            </h3>
            <p className="text-sm text-neutral-400">
              Receive personalized outfit and beauty recommendations based on your chart and goals.
              Save them to boards for later.
            </p>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-neutral-50 sm:text-4xl">
            Everything you need
          </h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6">
            <h3 className="text-base font-semibold text-neutral-50 mb-2">Big 4 at a glance</h3>
            <p className="text-sm text-neutral-400">
              See your Sun, Moon, Rising, and Midheaven placements in one place.
            </p>
          </div>
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6">
            <h3 className="text-base font-semibold text-neutral-50 mb-2">
              Goal-based guidance
            </h3>
            <p className="text-sm text-neutral-400">
              Get tailored recommendations for Work, Date, Everyday, or Staples.
            </p>
          </div>
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6">
            <h3 className="text-base font-semibold text-neutral-50 mb-2">Boards</h3>
            <p className="text-sm text-neutral-400">
              Vision boards for looks. Organize and save your favorite style guidance.
            </p>
          </div>
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6">
            <h3 className="text-base font-semibold text-neutral-50 mb-2">
              Practical outfit direction
            </h3>
            <p className="text-sm text-neutral-400">
              Specific, actionable recommendations for silhouettes, fabrics, and accessories.
            </p>
          </div>
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6">
            <h3 className="text-base font-semibold text-neutral-50 mb-2">
              Beauty finishing touches
            </h3>
            <p className="text-sm text-neutral-400">
              Hair, makeup, and accessory suggestions that complete your look.
            </p>
          </div>
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6">
            <h3 className="text-base font-semibold text-neutral-50 mb-2">Private by default</h3>
            <p className="text-sm text-neutral-400">
              Your data stays in your account. No sharing, no selling.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Band */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-12 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-neutral-50 sm:text-3xl">
            Ready to get started?
          </h2>
          <p className="mt-4 text-neutral-400">
            Create your account and start receiving personalized style guidance.
          </p>
          <div className="mt-8">
            <Link
              href="/login"
              className="inline-block rounded-xl bg-neutral-50 px-6 py-3 text-sm font-semibold text-neutral-950 transition-colors hover:bg-neutral-100"
            >
              Create account
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-900">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-neutral-400">
              © {new Date().getFullYear()} NEFELI
            </p>
            <div className="flex items-center gap-6">
              <Link
                href="/login"
                className="text-sm text-neutral-400 transition-colors hover:text-neutral-300"
              >
                Log in
              </Link>
              <Link
                href="/privacy"
                className="text-sm text-neutral-400 transition-colors hover:text-neutral-300"
              >
                Privacy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
