"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  // "checking" until we know whether a recovery/auth session is present.
  const [ready, setReady] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  useEffect(() => {
    // Opening the emailed link establishes a temporary recovery session
    // (supabase-js parses the token from the URL and fires PASSWORD_RECOVERY).
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });

    supabase.auth.getSession().then(({ data }) => {
      setReady((prev) => (prev === true ? prev : !!data.session));
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);

    if (password.length < 6) {
      setStatus({ type: "error", message: "Password must be at least 6 characters." });
      return;
    }
    if (password !== confirm) {
      setStatus({ type: "error", message: "Passwords don't match." });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setStatus({ type: "error", message: error.message });
    } else {
      setDone(true);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-8 shadow-xl">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-neutral-50">Set a new password</h2>
          </div>

          {done ? (
            <div className="mt-8 text-center">
              <p className="text-sm text-neutral-300">Your password has been updated.</p>
              <Link
                href="/app"
                className="mt-6 inline-block w-full rounded-lg bg-neutral-50 px-4 py-2.5 text-sm font-semibold text-neutral-950 transition-colors hover:bg-neutral-100"
              >
                Continue to NEFELI
              </Link>
            </div>
          ) : ready === false ? (
            <div className="mt-8 text-center">
              <p className="text-sm text-neutral-400">
                This page needs a valid reset link. Open the “reset your password” email and tap the
                link, or request a new one from the login page.
              </p>
              <Link
                href="/login"
                className="mt-6 inline-block text-sm font-medium text-neutral-300 underline-offset-4 hover:text-neutral-50 hover:underline"
              >
                Back to log in
              </Link>
            </div>
          ) : ready === null ? (
            <p className="mt-8 text-center text-sm text-neutral-400">Loading…</p>
          ) : (
            <form onSubmit={onSubmit} className="mt-8 space-y-6">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-neutral-200">
                  New password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  className="mt-2 block w-full rounded-lg border border-neutral-800 bg-neutral-950/50 px-3 py-2.5 text-sm text-neutral-50 placeholder:text-neutral-500 focus:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-700"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="confirm" className="block text-sm font-medium text-neutral-200">
                  Confirm password
                </label>
                <input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  className="mt-2 block w-full rounded-lg border border-neutral-800 bg-neutral-950/50 px-3 py-2.5 text-sm text-neutral-50 placeholder:text-neutral-500 focus:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-700"
                  placeholder="••••••••"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>

              {status && (
                <div
                  className={`rounded-lg border p-3 text-sm ${
                    status.type === "success"
                      ? "border-green-800/50 bg-green-950/20 text-green-200"
                      : "border-red-800/50 bg-red-950/20 text-red-200"
                  }`}
                >
                  {status.message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-neutral-50 px-4 py-2.5 text-sm font-semibold text-neutral-950 transition-colors hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-50 focus:ring-offset-2 focus:ring-offset-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Updating…" : "Update password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
