import { authedFetch } from "@/lib/api";

/**
 * Fire-and-forget product analytics.
 *
 * Sends a single event to our first-party /api/track endpoint (which writes to
 * the `events` table via the service role). Never blocks the UI and never
 * throws — analytics must never be able to break a user flow.
 *
 * Events are the raw material for activation, retention (D1/D7/D30) and
 * "which surface do people come back for" analysis. Keep names short and stable.
 */
export function track(name: string, props?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  try {
    const path = window.location.pathname;
    // Don't await — let it run in the background. keepalive lets it survive a
    // navigation (e.g. clicking a CTA that changes the page).
    void authedFetch("/api/track", {
      method: "POST",
      body: JSON.stringify({ name, props: props ?? {}, path }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* analytics is best-effort */
  }
}
