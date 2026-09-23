// Strip model scaffolding and markdown so only the final prose is ever stored
// or shown. Guards a class of bugs where the model emits its reasoning, a
// self-check ("* Second person? Yes."), or leaked prompt labels ("Goal:**",
// "Natal Venus:*", "Examine Chart Context (") instead of — or before — the
// answer, and where a short answer gets cut off mid-phrase.
//
// ES2018-safe (no lookbehind, no dotAll) so it compiles on the project target.

// A line that is prompt/scaffolding, not prose — matched at the start of a line.
const ARTIFACT_LINE =
  /^\**\s*(constraints?|goals?|task|instructions?|notes?|draft|checklist|analysis|reasoning|thinking|answer|final answer|response|reading|output|examine|chart context|step\s*\d+)\b\s*[:*)\-–]/i;
// A self-check bullet: "* Two short paragraphs? Yes."
const CHECK_LINE = /^[-*•]\s+.*\?\s*\**\s*(yes|no)\b/i;
// A leaked chart label: "Natal Venus:* Gemini"
const NATAL_LABEL = /^\**\s*natal\s+\w+\s*:\**/i;
// The app's own system-prompt section headers / instruction vocabulary echoed
// back ("Examine Chart Context (", "Current transits", "Moon phase:"). These
// never occur in a real reading.
const CONTEXT_LEAK = /\b(chart context|life context|current transits|natal chart data|moon phase\s*:|examine chart)\b/i;

/** Remove scaffolding lines and markdown, keeping only the prose. */
export function cleanModelText(raw: string): string {
  const text = (raw ?? "").replace(/\r/g, "");
  const kept: string[] = [];
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line) {
      if (kept.length && kept[kept.length - 1] !== "") kept.push("");
      continue;
    }
    if (ARTIFACT_LINE.test(line) || CHECK_LINE.test(line) || NATAL_LABEL.test(line) || CONTEXT_LEAK.test(line)) continue;
    kept.push(line);
  }
  return kept
    .join("\n")
    .replace(/^#{1,6}\s+/gm, "")     // ### headings
    .replace(/^\s*>\s?/gm, "")       // > quotes
    .replace(/^\s*[-*•]\s+/gm, "")   // leading bullets
    .replace(/\*\*/g, "")            // **bold**
    .replace(/`+/g, "")              // `code`
    .replace(/\*/g, "")              // stray * / *italic*
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** True when the text is scaffolding / not a usable reading. */
export function looksInvalid(text: string): boolean {
  const t = (text ?? "").trim();
  if (t.length < 40) return true;
  if (/\?\s*(yes|no)\b/i.test(t)) return true; // leftover checklist
  if (/^\s*(constraints?|goal|task|note|draft|checklist)\b\s*[:*]/im.test(t)) return true;
  return false;
}

/** Trim a trailing incomplete sentence (never cut mid-phrase). Optional hard cap. */
export function truncateAtSentence(text: string, max?: number): string {
  let t = (text ?? "").trim();
  if (max && t.length > max) t = t.slice(0, max).trim();
  if (/[.!?]["'”’)\]]?$/.test(t)) return t; // already ends cleanly
  const idx = Math.max(t.lastIndexOf("."), t.lastIndexOf("!"), t.lastIndexOf("?"));
  if (idx >= 40) return t.slice(0, idx + 1).trim();
  return t;
}
