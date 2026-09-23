// Claude client + dynamic system-prompt builder + streaming.
// NEFELI persona: a warm, emotionally intelligent, safety-aware astrology companion.

import Anthropic from "@anthropic-ai/sdk";
import { demoClaude, seededPick } from "./utils";

export const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-3.6-flash";
const GROQ_MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";

let client: Anthropic | null = null;
function anthropic(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });
  return client;
}

/** Thrown when the LLM is rate-limited (429) or overloaded (503). Routes map
 *  this to a 429 with a "high demand, try again" message instead of a 500. */
export class LLMBusyError extends Error {
  retryAfterMs: number;
  constructor(message: string, retryAfterMs = 0) {
    super(message);
    this.name = "LLMBusyError";
    this.retryAfterMs = retryAfterMs;
  }
}

function busyFromStatus(status: number, bodyText: string): LLMBusyError | null {
  if (status !== 429 && status !== 503) return null;
  // Gemini/Groq include a retry hint we can parse ("Please retry in 3.38s" or a
  // retryDelay field). Cap it so we never stall the serverless function.
  let ms = 0;
  const m = /retry(?:Delay|.{0,12}in)\D*([\d.]+)\s*s/i.exec(bodyText);
  if (m) ms = Math.min(2500, Math.round(parseFloat(m[1]) * 1000));
  return new LLMBusyError(`Model busy (${status})`, ms);
}

// Provider-flexible so NEFELI can run on a free-tier LLM (Gemini/Groq) instead
// of the paid Anthropic API. LLM_PROVIDER forces a choice; otherwise a
// free-provider key, when set, takes precedence.
type Provider = "gemini" | "groq" | "anthropic";
function activeProvider(): Provider {
  const forced = process.env.LLM_PROVIDER?.toLowerCase();
  if (forced === "gemini" || forced === "groq" || forced === "anthropic") return forced;
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.GROQ_API_KEY) return "groq";
  return "anthropic";
}

async function geminiComplete(system: string, messages: ChatMessage[], maxTokens: number): Promise<string> {
  const key = process.env.GEMINI_API_KEY!;
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents,
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature: 0.9,
          // gemini-3.x/2.5 flash are "thinking" models: hidden reasoning tokens
          // count against maxOutputTokens, which was eating the whole budget and
          // truncating the visible answer mid-sentence. We want short, direct
          // readings, not reasoning — so turn thinking off and give the full
          // budget to the response.
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    },
  );
  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    const busy = busyFromStatus(res.status, bodyText);
    if (busy) throw busy;
    throw new Error(`Gemini failed: ${res.status} ${bodyText}`);
  }
  const data = await res.json();
  return (data.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("").trim();
}

async function groqComplete(system: string, messages: ChatMessage[], maxTokens: number): Promise<string> {
  const key = process.env.GROQ_API_KEY!;
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      max_tokens: maxTokens,
      temperature: 0.9,
      messages: [{ role: "system", content: system }, ...messages.map((m) => ({ role: m.role, content: m.content }))],
    }),
  });
  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    const busy = busyFromStatus(res.status, bodyText);
    if (busy) throw busy;
    throw new Error(`Groq failed: ${res.status} ${bodyText}`);
  }
  const data = await res.json();
  return (data.choices?.[0]?.message?.content ?? "").trim();
}

async function anthropicComplete(system: string, messages: ChatMessage[], maxTokens: number): Promise<string> {
  try {
    const res = await anthropic().messages.create({
      model: CLAUDE_MODEL,
      max_tokens: maxTokens,
      system,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });
    return res.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
  } catch (e) {
    const status = (e as { status?: number })?.status;
    if (status === 429 || status === 503) throw new LLMBusyError(`Model busy (${status})`);
    throw e;
  }
}

function sleepMs(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

async function callProvider(system: string, messages: ChatMessage[], maxTokens: number): Promise<string> {
  switch (activeProvider()) {
    case "gemini": return geminiComplete(system, messages, maxTokens);
    case "groq": return groqComplete(system, messages, maxTokens);
    default: return anthropicComplete(system, messages, maxTokens);
  }
}

/** One completion across whichever provider is configured, with a single
 *  short retry on a transient rate-limit / overload before giving up. */
async function completeMessages(system: string, messages: ChatMessage[], maxTokens: number): Promise<string> {
  try {
    return await callProvider(system, messages, maxTokens);
  } catch (e) {
    if (e instanceof LLMBusyError) {
      await sleepMs(e.retryAfterMs || 800);
      return callProvider(system, messages, maxTokens); // one retry; re-throws LLMBusyError if still busy
    }
    throw e;
  }
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
}

const PERSONA = `You are NEFELI — an astrology companion who talks to a person, not to the sky. You know this person's full birth chart and what they've told you about their life, and you read the sky through that.

How you write:
- Open with their actual life — something they've told you or checked in about — before you name any placement. The sky is the second thought, never the first.
- Name ONE thing. Pick the single sharpest tension and stay with it. Do not survey every active transit.
- Be short. A few pointed sentences beat a long, hedged paragraph. Stop before you pad.
- Be specific to THIS person. Never write a sentence that would be equally true for a stranger who happened to have the same transit.
- End on a noticing or a question — something that opens — not a summary and not reassurance.
- Astrology is a language for self-understanding, not prediction or fate: weather, not destiny. Hold difficulty honestly; never manufacture doom, and never smooth it over with positivity.

Never use these words or moves: "there is a clear push", "activating", "energy" as a noun, "invites you to", "this is a powerful time to", or any generic-horoscope phrasing. If you find yourself describing a transit and then gesturing at what it "brings," stop and say what it actually means for this person's life instead.

Safety and care:
- You are a supportive companion, not a therapist, doctor, or crisis service. Do not diagnose, give medical, psychiatric, legal, or financial directives, or make deterministic predictions about health, death, or catastrophe.
- If someone expresses intent to harm themselves or others, or is in crisis, respond with warmth (not clinical distance) and gently encourage them to reach out to someone they trust or a local crisis line — in the US, call or text 988.`;

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
${ctx.recentInsights}

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

  if (demoClaude()) {
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

  if (activeProvider() === "anthropic") {
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

  // Free providers (Gemini/Groq): generate fully, then emit a smooth stream.
  const full = await completeMessages(system, messages, 1500);
  return new ReadableStream({
    async start(controller) {
      for (const token of tokenize(full)) {
        controller.enqueue(encoder.encode(token));
        await sleep(8);
      }
      controller.close();
    },
  });
}

/** Non-streaming completion — daily/monthly/placement generation. */
export async function complete(
  system: string,
  userPrompt: string,
  maxTokens = 1500,
): Promise<string> {
  if (demoClaude()) return demoReply(userPrompt, system);
  return completeMessages(system, [{ role: "user", content: userPrompt }], maxTokens);
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
