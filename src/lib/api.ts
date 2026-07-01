import { supabase } from "@/lib/supabase/client";

/**
 * fetch() wrapper that attaches the current Supabase access token as a
 * `Authorization: Bearer <token>` header so API routes can verify the caller.
 *
 * Use this for every call to our own /api routes that act on user data.
 */
export async function authedFetch(
  input: string,
  init: RequestInit = {}
): Promise<Response> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }

  return fetch(input, { ...init, headers });
}
