"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

const NAV_ITEMS: { href: string; label: string }[] = [
  { href: "/app", label: "Today" },
  { href: "/ask", label: "Ask" },
  { href: "/profile", label: "Profile" },
  { href: "/boards", label: "Boards" },
  { href: "/capsule/saved", label: "Saved capsules" },
];

export default function AuthedLayout({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
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

  // Close the mobile menu whenever the route changes.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-950 text-neutral-50">
        <div className="flex items-center gap-3 text-neutral-400">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-700 border-t-neutral-200" />
          <span className="text-sm">Loading…</span>
        </div>
      </main>
    );
  }

  const linkClass = (href: string, block = false) => {
    const active = pathname === href;
    return [
      "rounded-xl px-3 py-2 text-sm transition",
      block ? "block" : "",
      active
        ? "bg-neutral-50 text-neutral-950"
        : "text-neutral-200 hover:bg-neutral-900 hover:text-neutral-50",
    ].join(" ");
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50">
      <header className="border-b border-neutral-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/app" className="text-sm font-semibold tracking-[0.25em] text-neutral-200">
            NEFELI
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-2 md:flex">
            {NAV_ITEMS.map((item) => (
              <Link key={item.href} href={item.href} className={linkClass(item.href)}>
                {item.label}
              </Link>
            ))}
            <button
              type="button"
              onClick={logout}
              className="rounded-xl border border-neutral-800 bg-transparent px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-900 hover:text-neutral-50"
            >
              Log out
            </button>
          </nav>

          {/* Mobile menu toggle */}
          <button
            type="button"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-800 text-neutral-200 hover:bg-neutral-900 md:hidden"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              {menuOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
        </div>

        {/* Mobile nav drawer */}
        {menuOpen && (
          <nav className="border-t border-neutral-900 px-6 py-3 md:hidden">
            <div className="mx-auto flex max-w-5xl flex-col gap-1">
              {NAV_ITEMS.map((item) => (
                <Link key={item.href} href={item.href} className={linkClass(item.href, true)}>
                  {item.label}
                </Link>
              ))}
              <button
                type="button"
                onClick={logout}
                className="mt-1 rounded-xl border border-neutral-800 bg-transparent px-3 py-2 text-left text-sm text-neutral-200 hover:bg-neutral-900 hover:text-neutral-50"
              >
                Log out
              </button>
            </div>
          </nav>
        )}
      </header>

      <main className="px-6 py-10">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
