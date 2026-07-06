// Small dependency-free helpers used across the astrology kit.
// (Deliberately self-contained so the kit drops into any Next.js app.)

/** Return true when the app should run without external API keys. */
export function isDemoMode(): boolean {
  if (process.env.LUMINARY_DEMO_MODE === "true") return true;
  if (process.env.NEFELI_ASTRO_DEMO === "true") return true;
  // Auto-enable if the core keys are missing.
  return !process.env.ANTHROPIC_API_KEY || !process.env.RAPIDAPI_KEY;
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
