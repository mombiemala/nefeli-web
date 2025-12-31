"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function AuthedLayout({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        window.location.href = "/login";
        return;
      }
      setLoading(false);
    })();
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-neutral-950 text-neutral-50 px-6 py-10">
        <div className="mx-auto max-w-5xl">Loading…</div>
      </main>
    );
  }

  const navLink = (href: string, label: string) => {
    const active = pathname === href;
    return (
      <Link
        href={href}
        className={[
          "rounded-xl px-3 py-2 text-sm transition",
          active
            ? "bg-neutral-50 text-neutral-950"
            : "text-neutral-200 hover:bg-neutral-900 hover:text-neutral-50",
        ].join(" ")}
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50">
      <header className="border-b border-neutral-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/app" className="text-sm font-semibold tracking-[0.25em] text-neutral-200">
            NEFELI
          </Link>

          <nav className="flex items-center gap-2">
            {navLink("/app", "Today")}
            {navLink("/ask", "Ask")}
            {navLink("/profile", "Profile")}
            {navLink("/boards", "Boards")}
            {navLink("/capsule/saved", "Saved capsules")}
            <button
              type="button"
              onClick={logout}
              className="rounded-xl border border-neutral-800 bg-transparent px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-900 hover:text-neutral-50"
            >
              Log out
            </button>
          </nav>
        </div>
      </header>

      <main className="px-6 py-10">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
