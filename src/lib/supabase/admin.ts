import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Service-role client. Server-only — never import this into client components.
//
// Created lazily on first use so that merely importing this module (e.g. during
// Next.js build-time page-data collection) never throws when env vars are absent.
let _admin: SupabaseClient | null = null;

function getAdmin(): SupabaseClient {
  if (!_admin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error("Missing Supabase server environment variables.");
    }
    _admin = createClient(url, key);
  }
  return _admin;
}

export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getAdmin(), prop, receiver);
  },
});

/**
 * The trust boundary for our API routes.
 *
 * Reads the caller's Supabase access token from the `Authorization: Bearer <token>`
 * header, verifies it, and returns the authenticated user's id. Returns null when
 * no valid token is present.
 *
 * API routes must derive the acting user id from this — never from the request
 * body — otherwise any caller can act on behalf of any user id (IDOR).
 */
export async function getAuthedUserId(req: Request): Promise<string | null> {
  const authHeader =
    req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!authHeader) return null;

  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(token.trim());
  if (error || !data?.user) return null;

  return data.user.id;
}
