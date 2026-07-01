/**
 * Extract a JSON value from an LLM text response.
 *
 * Models sometimes wrap JSON in a ```json … ``` (or plain ``` … ```) code fence
 * despite being told not to. This strips a single leading/trailing fence and
 * parses what remains. Throws (like JSON.parse) when the content isn't valid JSON
 * so callers can validate or fall back.
 */
export function parseModelJson<T = unknown>(text: string): T {
  let s = text.trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }
  return JSON.parse(s) as T;
}
