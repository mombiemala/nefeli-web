import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind-aware className merge helper. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Return true when the app is running without external API keys. */
export function isDemoMode(): boolean {
  if (process.env.LUMINARY_DEMO_MODE === "true") return true;
  // Auto-enable demo mode if the core keys are missing.
  return !process.env.ANTHROPIC_API_KEY || !process.env.RAPIDAPI_KEY;
}

/** Format a Date as an ISO date (YYYY-MM-DD) with no time component. */
export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/(^|[\s_/-])([a-z])/g, (_, p, c) => p + c.toUpperCase());
}

/** Small deterministic hash → used to make demo data feel personalised. */
export function seededPick<T>(seed: string, items: T[]): T {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return items[Math.abs(h) % items.length];
}
