"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { authedFetch } from "@/lib/api";

const NAV_ITEMS: { href: string; label: string }[] = [
  { href: "/app", label: "Today" },
  { href: "/ask", label: "Chat" },
  { href: "/chart", label: "Chart" },
  { href: "/transits", label: "Transits" },
  { href: "/map", label: "Places" },
  { href: "/monthly", label: "Monthly" },
  { href: "/memory", label: "Memory" },
  { href: "/profile", label: "Profile" },
];

export default function AuthedLayout({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [unread, setUnread] = useState(0);
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

  // Poll the unread-nudge count so the badge stays live as nudges arrive and
  // as the user dismisses them on the Today page. Re-checks on every route
  // change (cheap) and on a slow interval.
  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    const refresh = async () => {
      try {
        const res = await authedFetch("/api/companion/notifications", { method: "GET" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setUnread(data.unread ?? 0);
      } catch { /* non-fatal */ }
    };
    refresh();
    const id = setInterval(refresh, 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [loading, pathname]);

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
      <main className="flex min-h-screen items-center justify-center text-neutral-50">
        <div className="flex items-center gap-3 text-neutral-400">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-800 border-t-neutral-200" />
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
        : "text-neutral-200 hover:bg-white/5 hover:text-neutral-50",
    ].join(" ");
  };

  return (
    <div className="min-h-screen text-neutral-50">
      <header className="sticky top-0 z-20 border-b border-white/5 bg-[#08080b]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/app" className="inline-flex items-center gap-2" aria-label="NEFELI home">
            <span className="text-accent animate-twinkle" aria-hidden>✦</span>
            <span className="text-sm font-semibold tracking-[0.25em] text-neutral-200">NEFELI</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-2 md:flex">
            {NAV_ITEMS.map((item) => (
              <Link key={item.href} href={item.href} className={linkClass(item.href)}>
                {item.label}
                {item.href === "/app" && unread > 0 && (
                  <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-semibold text-neutral-950">
                    {unread}
                  </span>
                )}
              </Link>
            ))}
            <button
              type="button"
              onClick={logout}
              className="rounded-xl border border-white/10 bg-transparent px-3 py-2 text-sm text-neutral-200 hover:bg-white/5 hover:text-neutral-50"
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
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-neutral-200 hover:bg-white/5 md:hidden"
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
          <nav className="border-t border-white/5 px-6 py-3 md:hidden">
            <div className="mx-auto flex max-w-5xl flex-col gap-1">
              {NAV_ITEMS.map((item) => (
                <Link key={item.href} href={item.href} className={linkClass(item.href, true)}>
                  {item.label}
                  {item.href === "/app" && unread > 0 && (
                    <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-semibold text-neutral-950">
                      {unread}
                    </span>
                  )}
                </Link>
              ))}
              <button
                type="button"
                onClick={logout}
                className="mt-1 rounded-xl border border-white/10 bg-transparent px-3 py-2 text-left text-sm text-neutral-200 hover:bg-white/5 hover:text-neutral-50"
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
