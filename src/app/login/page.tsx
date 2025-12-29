"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") === "signup" ? "signup" : "login";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/onboarding`,
        },
      });

      if (error) {
        setStatus({ type: "error", message: error.message });
        setLoading(false);
      } else {
        setEmailSent(true);
        setLoading(false);
      }
    } else {
      // Login mode
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setStatus({ type: "error", message: error.message });
        setLoading(false);
      } else {
        // Check if user needs to verify email
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user && !user.email_confirmed_at) {
          setStatus({
            type: "error",
            message:
              "Please verify your email before logging in. Check your inbox for the verification link.",
          });
          setLoading(false);
        } else {
          // Check if user profile is complete
          const { data: profile } = await supabase
            .from("profiles")
            .select("birth_date, style_intent")
            .eq("user_id", user!.id)
            .maybeSingle();

          const profileComplete = !!profile?.birth_date && !!profile?.style_intent;

          if (profileComplete) {
            window.location.href = "/app";
          } else {
            window.location.href = "/onboarding";
          }
        }
      }
    }
  }

  // Signup success state - "Check your email"
  if (mode === "signup" && emailSent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-sm">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-8 shadow-xl">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-950/20">
                <svg
                  className="h-6 w-6 text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                  />
                </svg>
              </div>
              <h2 className="mt-4 text-2xl font-bold tracking-tight text-neutral-50">
                Check your email
              </h2>
              <p className="mt-2 text-sm text-neutral-400">
                We've sent a verification link to <span className="font-medium text-neutral-300">{email}</span>
              </p>
              <p className="mt-4 text-sm text-neutral-400">
                Click the link in that email to verify your account, then you can log in and complete onboarding.
              </p>
            </div>

            <div className="mt-8">
              <button
                type="button"
                onClick={() => {
                  setEmailSent(false);
                  setEmail("");
                  setPassword("");
                  setStatus(null);
                }}
                className="w-full rounded-lg border border-neutral-800 bg-transparent px-4 py-2.5 text-sm font-semibold text-neutral-50 transition-colors hover:border-neutral-700 hover:bg-neutral-900/50 focus:outline-none focus:ring-2 focus:ring-neutral-800 focus:ring-offset-2 focus:ring-offset-neutral-900"
              >
                Back to sign up
              </button>
            </div>

            <div className="mt-6 border-t border-neutral-800 pt-6">
              <p className="text-xs text-neutral-500">
                We'll never sell your data. You can delete your account anytime.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Login Simple pattern - centered auth card
  if (mode === "login") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-sm">
          {/* Auth Card */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-8 shadow-xl">
            <div className="text-center">
              <h2 className="text-2xl font-bold tracking-tight text-neutral-50">
                Log in
              </h2>
            </div>

            <form onSubmit={onSubmit} className="mt-8 space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-neutral-200">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="mt-2 block w-full rounded-lg border border-neutral-800 bg-neutral-950/50 px-3 py-2.5 text-sm text-neutral-50 placeholder:text-neutral-500 focus:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-700"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-neutral-200">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="mt-2 block w-full rounded-lg border border-neutral-800 bg-neutral-950/50 px-3 py-2.5 text-sm text-neutral-50 placeholder:text-neutral-500 focus:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-700"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-neutral-50 px-4 py-2.5 text-sm font-semibold text-neutral-950 transition-colors hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-50 focus:ring-offset-2 focus:ring-offset-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Logging in…" : "Log in"}
                </button>
              </div>
            </form>

            <div className="mt-6 text-center">
              <p className="text-xs text-neutral-400">
                Don't have an account?{" "}
                <Link
                  href="/login?mode=signup"
                  className="font-medium text-neutral-300 underline-offset-4 hover:text-neutral-50 hover:underline"
                >
                  Create one
                </Link>
              </p>
            </div>

            <div className="mt-6">
              <p className="text-xs text-neutral-500">
                You'll verify your email when creating an account.
              </p>
            </div>

            <div className="mt-6 border-t border-neutral-800 pt-6">
              <p className="text-xs text-neutral-500">
                We'll never sell your data. You can delete your account anytime.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Signup mode - Simple Sign Up pattern
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-sm">
        {/* Auth Card */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-8 shadow-xl">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-neutral-50">
              Create account
            </h2>
          </div>

          <form onSubmit={onSubmit} className="mt-8 space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-neutral-200">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="mt-2 block w-full rounded-lg border border-neutral-800 bg-neutral-950/50 px-3 py-2.5 text-sm text-neutral-50 placeholder:text-neutral-500 focus:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-700"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-neutral-200">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                className="mt-2 block w-full rounded-lg border border-neutral-800 bg-neutral-950/50 px-3 py-2.5 text-sm text-neutral-50 placeholder:text-neutral-500 focus:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-700"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="mt-2 text-xs text-neutral-500">
                Must be at least 6 characters long.
              </p>
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

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-neutral-50 px-4 py-2.5 text-sm font-semibold text-neutral-950 transition-colors hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-50 focus:ring-offset-2 focus:ring-offset-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Creating account…" : "Create account"}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <p className="text-xs text-neutral-500">
              You'll verify your email when creating an account.
            </p>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-neutral-400">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-neutral-300 underline-offset-4 hover:text-neutral-50 hover:underline"
              >
                Log in
              </Link>
            </p>
          </div>

          <div className="mt-6 border-t border-neutral-800 pt-6">
            <p className="text-xs text-neutral-500">
              We'll never sell your data. You can delete your account anytime.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

