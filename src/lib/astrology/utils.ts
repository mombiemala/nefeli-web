// Small dependency-free helpers used across the astrology kit.
// (Deliberately self-contained so the kit drops into any Next.js app.)

/** Demo mode is forced by env flag regardless of keys. */
function forcedDemo(): boolean {
  return process.env.LUMINARY_DEMO_MODE === "true" || process.env.NEFELI_ASTRO_DEMO === "true";
}

/** True when EITHER capability is in demo (kept for compatibility). */
export function isDemoMode(): boolean {
  return forcedDemo() || !process.env.ANTHROPIC_API_KEY || !process.env.RAPIDAPI_KEY;
}

/** Claude readings run live once ANTHROPIC_API_KEY is set (independent of the
 *  ephemeris key), so you can turn on real readings without the Astrologer API. */
export function demoClaude(): boolean {
  return forcedDemo() || !process.env.ANTHROPIC_API_KEY;
}

/** Real ephemeris (charts/transits/moon) runs once RAPIDAPI_KEY is set. */
export function demoEphemeris(): boolean {
  return forcedDemo() || !process.env.RAPIDAPI_KEY;
}

/** Format a Date as an ISO date (YYYY-MM-DD), no time component. */
export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/(^|[\s_/-])([a-z])/g, (_, p, c) => p + c.toUpperCase());
}

/** Deterministic pick — makes demo/copy feel personalised without randomness. */
export function seededPick<T>(seed: string, items: T[]): T {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return items[Math.abs(h) % items.length];
}
