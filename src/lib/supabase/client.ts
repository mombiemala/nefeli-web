import { createClient } from "@supabase/supabase-js";

// NEXT_PUBLIC_* vars are inlined into the browser bundle at BUILD time — if they
// are missing/empty at build, the client posts to an invalid URL and every auth
// call fails with a cryptic "Failed to fetch". Surface that clearly instead.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (typeof window !== "undefined" && (!url || !anonKey)) {
  console.error(
    "[NEFELI] Supabase is not configured for the browser: " +
      `NEXT_PUBLIC_SUPABASE_URL=${url ? "set" : "MISSING"}, ` +
      `NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey ? "set" : "MISSING"}. ` +
      "Set both in Vercel (Production) and redeploy — these are baked in at build time.",
  );
}

export const supabase = createClient(url ?? "", anonKey ?? "");
