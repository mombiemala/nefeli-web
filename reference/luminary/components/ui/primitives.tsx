"use client";

import { cn } from "@/lib/utils";
import type { EnergyBadge } from "@/lib/types";

export function Card({
  className,
  strong,
  children,
}: {
  className?: string;
  strong?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn(strong ? "glass-strong" : "glass", "p-5", className)}>
      {children}
    </div>
  );
}

const ENERGY_STYLE: Record<EnergyBadge, { label: string; cls: string }> = {
  HIGH: { label: "Power Day", cls: "border-amber-400/40 bg-amber-400/10 text-amber-200" },
  MEDIUM: { label: "Navigate", cls: "border-sky-400/40 bg-sky-400/10 text-sky-200" },
  LOW: { label: "Move Gently", cls: "border-violet-400/40 bg-violet-400/10 text-violet-200" },
  REST: { label: "Rest", cls: "border-emerald-400/40 bg-emerald-400/10 text-emerald-200" },
};

export function EnergyPill({ level, className }: { level: EnergyBadge; className?: string }) {
  const s = ENERGY_STYLE[level];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
        s.cls,
        className,
      )}
    >
      ✦ {s.label}
    </span>
  );
}

export function Intensity({ level }: { level: number }) {
  return (
    <span className="inline-flex" aria-label={`Intensity ${level} of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i < level ? "text-gold" : "text-white/15"}>
          ★
        </span>
      ))}
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-5 w-5 animate-spin rounded-full border-2 border-gold/30 border-t-gold",
        className,
      )}
      role="status"
      aria-label="Loading"
    />
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-white/5", className)} />;
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="heading mb-3 text-lg text-cream/90">{children}</h2>
  );
}
