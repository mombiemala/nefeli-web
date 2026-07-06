"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Sparkles, Sun, MessageCircle, CalendarDays, Orbit, HeartHandshake,
  Settings, LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Today", icon: Sun },
  { href: "/chart", label: "Chart", icon: Sparkles },
  { href: "/chat", label: "Luminary", icon: MessageCircle },
  { href: "/monthly", label: "Month", icon: CalendarDays },
  { href: "/transits", label: "Transits", icon: Orbit },
  { href: "/context", label: "Life", icon: HeartHandshake },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-white/10 bg-night-800/50 px-4 py-6 backdrop-blur-lg md:flex">
        <Link href="/dashboard" className="mb-8 flex items-center gap-2 px-2">
          <span className="text-2xl">✶</span>
          <span className="heading text-xl text-gold">Luminary</span>
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                  active
                    ? "bg-gold/10 text-gold"
                    : "text-cream-muted hover:bg-white/5 hover:text-cream",
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto flex flex-col gap-1 border-t border-white/10 pt-4">
          <Link
            href="/settings"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-cream-muted hover:bg-white/5 hover:text-cream"
          >
            <Settings className="h-[18px] w-[18px]" /> Settings
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-cream-muted hover:bg-white/5 hover:text-cream"
          >
            <LogOut className="h-[18px] w-[18px]" /> Sign out
          </button>
        </div>
      </aside>

      {/* Mobile bottom bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-white/10 bg-night-800/80 px-2 py-2 backdrop-blur-lg md:hidden">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-lg px-2 py-1 text-[10px]",
                active ? "text-gold" : "text-cream-dim",
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
