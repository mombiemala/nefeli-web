"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Sub-navigation for the Forecast group — the three time horizons of the sky.
const TABS = [
  { href: "/transits", label: "Now" },
  { href: "/timing", label: "Days ahead" },
  { href: "/monthly", label: "This month" },
];

export function ForecastTabs() {
  const pathname = usePathname();
  return (
    <div>
      <p className="font-marcellus text-xs uppercase tracking-[0.3em] text-accent/80">Forecast</p>
      <div className="mt-3 inline-flex gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1">
        {TABS.map((t) => {
          const active = pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`rounded-full px-4 py-1.5 text-sm transition ${
                active ? "bg-accent/15 text-accent" : "text-neutral-400 hover:text-neutral-100"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
