import { prisma } from "./prisma";
import { assembleContext } from "./luminary-context";
import { completeLuminary } from "./claude";
import { toISODate, seededPick } from "./utils";
import type { EnergyLevel } from "@prisma/client";
import type { DailyGuidancePayload, Transit } from "./types";

/** Heuristic energy badge from the day's transit mix. */
export function deriveEnergyLevel(transits: Transit[]): EnergyLevel {
  if (transits.length === 0) return "MEDIUM";
  const avg =
    transits.reduce((s, t) => s + t.intensity, 0) / transits.length;
  const hardCount = transits.filter(
    (t) => t.aspect === "square" || t.aspect === "opposition",
  ).length;
  const flowCount = transits.filter(
    (t) => t.aspect === "trine" || t.aspect === "sextile",
  ).length;
  if (avg >= 4 && flowCount >= hardCount) return "HIGH";
  if (hardCount > flowCount && avg >= 3.5) return "LOW";
  if (avg <= 2) return "REST";
  return "MEDIUM";
}

export const ENERGY_LABEL: Record<EnergyLevel, string> = {
  HIGH: "Power Day",
  MEDIUM: "Navigate",
  LOW: "Move Gently",
  REST: "Rest",
};

const PROMPTS: Record<EnergyLevel, string[]> = {
  HIGH: [
    "What have you been waiting for permission to begin? Begin it today.",
    "Where can you say a bold, clear yes right now?",
  ],
  MEDIUM: [
    "What needs one small, honest step forward today?",
    "Where is the middle path asking for your attention?",
  ],
  LOW: [
    "What are you being asked to feel before you fix?",
    "Where can you let something be hard without rushing to resolve it?",
  ],
  REST: [
    "What would it feel like to do less today, on purpose?",
    "What is your body asking for that your schedule keeps overriding?",
  ],
};

/**
 * Generate + cache today's guidance (24h cache via the DailyGuidance table).
 * Returns null if the user has no birth profile yet.
 */
export async function getOrCreateDailyGuidance(
  userId: string,
  when: Date = new Date(),
  regenerate = false,
): Promise<DailyGuidancePayload | null> {
  const dateOnly = new Date(toISODate(when) + "T00:00:00.000Z");

  if (!regenerate) {
    const existing = await prisma.dailyGuidance.findUnique({
      where: { userId_date: { userId, date: dateOnly } },
    });
    if (existing) {
      return {
        date: toISODate(existing.date),
        moonSign: existing.moonSign,
        moonPhase: existing.moonPhase,
        moonEmoji: extractEmoji(existing.moonPhase),
        energyLevel: existing.energyLevel,
        keyTransits: existing.keyTransits as unknown as Transit[],
        guidance: existing.guidance,
        prompt: existing.prompt,
        upcoming: [],
      };
    }
  }

  const ctx = await assembleContext(userId, when);
  if (!ctx) return null;

  const key = ctx.transits.slice(0, 3);
  const energy = deriveEnergyLevel(ctx.transits);
  const prompt = seededPick(userId + toISODate(when), PROMPTS[energy]);

  const guidance = await completeLuminary(
    ctx.system,
    `Write today's guidance for ${toISODate(when)}. Two to three short, warm, specific sentences that connect the current transits and moon phase to this person's actual life context. The moon is ${ctx.moon.phaseName} in ${ctx.moon.moonSign}. Do not use headers or lists — just the guidance itself.`,
    400,
  );

  const saved = await prisma.dailyGuidance.upsert({
    where: { userId_date: { userId, date: dateOnly } },
    update: {
      moonSign: ctx.moon.moonSign,
      moonPhase: `${ctx.moon.phaseName} ${ctx.moon.emoji}`,
      keyTransits: key as unknown as object,
      guidance,
      prompt,
      energyLevel: energy,
    },
    create: {
      userId,
      date: dateOnly,
      moonSign: ctx.moon.moonSign,
      moonPhase: `${ctx.moon.phaseName} ${ctx.moon.emoji}`,
      keyTransits: key as unknown as object,
      guidance,
      prompt,
      energyLevel: energy,
    },
  });

  // Upcoming = the exact dates of the strongest upcoming transits.
  const upcoming = ctx.transits
    .filter((t) => t.exactDate >= toISODate(when))
    .slice(0, 5)
    .map((t) => ({
      date: t.exactDate,
      label: `${t.transitingPlanet} ${t.aspect} ${t.natalPlanet}`,
    }));

  return {
    date: toISODate(saved.date),
    moonSign: saved.moonSign,
    moonPhase: saved.moonPhase,
    moonEmoji: ctx.moon.emoji,
    energyLevel: saved.energyLevel,
    keyTransits: key,
    guidance: saved.guidance,
    prompt: saved.prompt,
    upcoming,
  };
}

function extractEmoji(s: string): string {
  const m = s.match(/\p{Emoji}/u);
  return m?.[0] ?? "🌙";
}
