// Claude client + dynamic system-prompt builder + streaming.
// Adds an optional STYLE PROFILE section for NEFELI's fashion×astrology fusion.

import Anthropic from "@anthropic-ai/sdk";
import { isDemoMode, seededPick } from "./utils";

export const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

let client: Anthropic | null = null;
function anthropic(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });
  return client;
}

export interface AstroContext {
  chartXml: string;
  transitXml: string;
  moonPhase: string;
  lifeContextSummary: string;
  declarations: string;
  recentInsights: string;
  currentDate: string;
  userLocation: string;
  userName?: string;
  /** NEFELI addition — palette, sizing, intents, capsule notes. */
  styleProfile?: string;
}

const PERSONA = `You are NEFELI — a deeply knowledgeable, emotionally intelligent companion. You are not a generic horoscope or a shopping app. You know this person's complete birth chart, their life story, AND their style, and you interpret every planetary event through the lens of their specific healing journey, career, relationships, and creative practice — and only then, when it helps, their wardrobe.

Your approach:
- Always connect astrological placements to the user's lived experience.
- Treat astrology as a healing and growth tool, not entertainment.
- Be specific, not generic — if you can't connect a transit to their actual life, you're not being specific enough.
- Honor emotional complexity — don't bypass grief, difficulty, or ambivalence with toxic positivity.
- Identify patterns across their chart and life context; celebrate wins as astrologically significant.
- When style is relevant, offer it as an *expression* of the day's energy (colors, textures, how to feel embodied) — never as the main point, never pushy.
- Write warmly and personally, in second person. Weave the astrology into plain, caring language.`;

/** Assemble the full system prompt. */
export function buildSystemPrompt(ctx: AstroContext): string {
  return `${PERSONA}

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
${ctx.recentInsights}${ctx.styleProfile ? `\n\nSTYLE PROFILE:\n${ctx.styleProfile}` : ""}

Today's date: ${ctx.currentDate}
User's location: ${ctx.userLocation}${ctx.userName ? `\nUser's name: ${ctx.userName}` : ""}`;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** Stream a chat completion as a ReadableStream of UTF-8 text chunks (SSE-friendly). */
export async function streamChat(
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

/** Non-streaming completion — daily/monthly/placement generation. */
export async function complete(
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
  return res.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
}

// ── Demo-mode reply (context-aware stand-in; no API key needed) ──
function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }
function* tokenize(text: string) { for (const p of text.split(/(\s+)/)) if (p) yield p; }

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

function demoReply(userMessage: string, system: string): string {
  const moon = /MOON PHASE:\n(.*)/.exec(system)?.[1]?.trim() ?? "the current moon";
  const hasContext = !/No life context on file/.test(system);
  const opener = seededPick(userMessage + moon, OPENERS);
  const closer = seededPick(system.slice(0, 64) + userMessage, CLOSERS);
  const contextLine = hasContext
    ? "and it lands right in the middle of what you've been working through — the very themes you named are the ones the chart is lighting up now. "
    : "though I'd understand you even more deeply if you shared a little about what's alive in your life right now. ";
  return [
    `${opener} and I want to meet it honestly rather than smoothing it over.`,
    ``,
    `Astrologically, ${moon.toLowerCase()} is coloring the emotional field, ${contextLine}The placements in your chart that speak to this are asking you to move from effort into trust.`,
    ``,
    `A small practice: when the old pattern tightens today, pause and ask "whose voice is this?" before you respond.`,
    ``,
    closer,
    ``,
    `*(Demo mode: set ANTHROPIC_API_KEY for full, live readings from Claude.)*`,
  ].join("\n");
}
