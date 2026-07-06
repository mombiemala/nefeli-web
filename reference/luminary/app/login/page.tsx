"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Spinner } from "@/components/ui/primitives";

function LoginInner() {
  const params = useSearchParams();
  const verify = params.get("verify");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const demo = process.env.NEXT_PUBLIC_DEMO !== "false"; // demo login shown by default

  async function magicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await signIn("email", { email, redirect: false, callbackUrl: "/dashboard" });
    setSent(true);
    setLoading(false);
  }

  async function demoLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await signIn("demo", { email, callbackUrl: "/dashboard" });
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5">
      <div className="glass-strong w-full max-w-md p-8 animate-fade-up">
        <Link href="/" className="mb-6 flex items-center gap-2">
          <span className="text-2xl">✶</span>
          <span className="heading text-xl text-gold">Luminary</span>
        </Link>
        <h1 className="heading text-2xl">Enter your sky</h1>
        <p className="subtle mt-1 text-sm">
          We'll send a magic link — no password to remember.
        </p>

        {(sent || verify) && (
          <div className="mt-4 rounded-xl border border-gold/25 bg-gold/5 p-3 text-sm text-gold-soft">
            ✦ Check your inbox for a sign-in link. (In demo/dev, the link is
            printed to the server console.)
          </div>
        )}

        <form onSubmit={magicLink} className="mt-6 space-y-3">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="input"
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? <Spinner className="h-4 w-4 border-night/40 border-t-night" /> : "Send magic link"}
          </button>
        </form>

        {demo && (
          <>
            <div className="my-5 flex items-center gap-3 text-xs text-cream-dim">
              <span className="h-px flex-1 bg-white/10" /> or <span className="h-px flex-1 bg-white/10" />
            </div>
            <button onClick={demoLogin} disabled={loading || !email} className="btn-ghost w-full">
              Continue in demo mode →
            </button>
            <p className="mt-2 text-center text-[11px] text-cream-dim">
              Demo mode signs you straight in and runs with zero API keys.
            </p>
          </>
        )}
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Spinner /></div>}>
      <LoginInner />
    </Suspense>
  );
}
