import Anthropic from "@anthropic-ai/sdk";
import { isDemoMode, seededPick } from "./utils";

export const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

let client: Anthropic | null = null;
function anthropic(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });
  }
  return client;
}

export interface LuminaryContext {
  chartXml: string;
  transitXml: string;
  moonPhase: string;
  lifeContextSummary: string;
  declarations: string;
  recentInsights: string;
  currentDate: string;
  userLocation: string;
  userName?: string;
}

const BASE_PERSONA = `You are Luminary — a deeply knowledgeable, emotionally intelligent astrology companion. You are not a generic horoscope app. You know this person's complete birth chart AND their life story, and you interpret every planetary event through the lens of their specific healing journey, career situation, relationships, and creative practice.

Your approach:
- Always connect astrological placements to the user's lived experience.
- Treat astrology as a healing and growth tool, not entertainment.
- Be specific, not generic — if you can't connect a transit to their actual life, you're not being specific enough.
- Honor emotional complexity — don't bypass grief, difficulty, or ambivalence with toxic positivity.
- Identify patterns across their chart and life context.
- Celebrate their wins as astrologically significant.
- Never give advice that conflicts with their wellbeing.
- Write warmly and personally, in second person. Avoid jargon dumps; weave the astrology into plain, caring language.`;

/** Assemble the dynamic system prompt for any Luminary call. */
export function buildSystemPrompt(ctx: LuminaryContext): string {
  return `${BASE_PERSONA}

NATAL CHART DATA:
${ctx.chartXml}

CURRENT TRANSITS:
${ctx.transitXml}

MOON PHASE:
${ctx.moonPhase}

USER LIFE CONTEXT:
${ctx.lifeContextSummary}

ACTIVE DECLARATIONS:
${ctx.declarations}

PAST INSIGHTS (last 5):
${ctx.recentInsights}

Today's date: ${ctx.currentDate}
User's location: ${ctx.userLocation}${ctx.userName ? `\nUser's name: ${ctx.userName}` : ""}`;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Stream a Luminary chat completion. Returns a ReadableStream of text chunks
 * (SSE-friendly). In demo mode it streams a locally-generated, context-aware
 * response so the chat works without an API key.
 */
export async function streamLuminaryChat(
  system: string,
  messages: ChatMessage[],
): Promise<ReadableStream<Uint8Array>> {
  const encoder = new TextEncoder();

  if (isDemoMode()) {
    const text = demoReply(messages.at(-1)?.content ?? "", system);
    return new ReadableStream({
      async start(controller) {
        for (const token of tokenize(text)) {
          controller.enqueue(encoder.encode(token));
          await sleep(12);
        }
        controller.close();
      },
    });
  }

  const stream = await anthropic().messages.stream({
    model: CLAUDE_MODEL,
    max_tokens: 1500,
    system,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  return new ReadableStream({
    async start(controller) {
      stream.on("text", (t) => controller.enqueue(encoder.encode(t)));
      stream.on("end", () => controller.close());
      stream.on("error", (e) => controller.error(e));
    },
  });
}

/** Non-streaming completion — used for daily/monthly generation. */
export async function completeLuminary(
  system: string,
  userPrompt: string,
  maxTokens = 1500,
): Promise<string> {
  if (isDemoMode()) return demoReply(userPrompt, system);
  const res = await anthropic().messages.create({
    model: CLAUDE_MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: userPrompt }],
  });
  return res.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();
}

// ── Demo-mode reply generation ───────────────────────────────

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function* tokenize(text: string) {
  for (const part of text.split(/(\s+)/)) if (part) yield part;
}

const OPENERS = [
  "There's real weight to what you're carrying right now,",
  "I've been holding what you told me,",
  "Let's look at this together —",
  "The sky is speaking directly to your situation,",
];

const CLOSERS = [
  "Let that be enough for today.",
  "You don't have to solve it all at once — the transit gives you weeks, not hours.",
  "Notice what softens when you name it out loud.",
  "This is growth, even when it doesn't feel graceful.",
];

/**
 * Produce a plausible, context-aware Luminary reply for demo mode by
 * lightly reflecting the assembled system prompt (chart + life context)
 * back to the user. This is a stand-in for Claude, not a real reading.
 */
function demoReply(userMessage: string, system: string): string {
  const moon = /MOON PHASE:\n(.*)/.exec(system)?.[1]?.trim() ?? "the current moon";
  const hasContext = !/No life context on file/.test(system);
  const opener = seededPick(userMessage + moon, OPENERS);
  const closer = seededPick(system.slice(0, 64) + userMessage, CLOSERS);

  const contextLine = hasContext
    ? "and it lands right in the middle of what you've been working through — the very themes you named to me are the ones the chart is lighting up now. "
    : "though I'd understand you even more deeply if you shared a little about what's alive in your life right now. ";

  return [
    `${opener} and I want to meet it honestly rather than smoothing it over.`,
    ``,
    `Astrologically, ${moon.toLowerCase()} is coloring the emotional field, ${contextLine}` +
      `The placements in your chart that speak to this are asking you to move from effort into trust — to let something be felt fully before it's fixed.`,
    ``,
    `A small practice: when the old pattern tightens today, pause and ask "whose voice is this?" before you respond. That single beat of awareness is where the transit does its work.`,
    ``,
    closer,
    ``,
    `*(Demo mode: connect an ANTHROPIC_API_KEY to receive full, live readings from Claude.)*`,
  ].join("\n");
}
