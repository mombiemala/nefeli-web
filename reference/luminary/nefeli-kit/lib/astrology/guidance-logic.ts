// Pure daily-guidance logic (no DB). The energy badge + prompt selection +
// moon notes, extracted so your Supabase orchestration can call them directly.

import { seededPick } from "./utils";
import type { Transit } from "./types";

export type EnergyLevel = "HIGH" | "MEDIUM" | "LOW" | "REST";

/** Heuristic energy badge from the day's transit mix. */
export function deriveEnergyLevel(transits: Transit[]): EnergyLevel {
  if (transits.length === 0) return "MEDIUM";
  const avg = transits.reduce((s, t) => s + t.intensity, 0) / transits.length;
  const hard = transits.filter((t) => t.aspect === "square" || t.aspect === "opposition").length;
  const flow = transits.filter((t) => t.aspect === "trine" || t.aspect === "sextile").length;
  if (avg >= 4 && flow >= hard) return "HIGH";
  if (hard > flow && avg >= 3.5) return "LOW";
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

/** NEFELI addition: a style cue per energy — an *expression* of the day. */
const STYLE_NOTES: Record<EnergyLevel, string[]> = {
  HIGH: ["Wear something that lets you take up space — a bold color, a strong line.",
         "Dress like the version of you who already said yes."],
  MEDIUM: ["Reach for pieces that feel like ease and range — layers you can adjust.",
           "A grounded, put-together base you don't have to think about."],
  LOW: ["Soft armor: textures that comfort, colors that steady you.",
        "Wear what makes you feel held, not what performs."],
  REST: ["Nothing that asks anything of you — the softest thing you own.",
         "Let comfort lead; save the statement for another day."],
};

export function pickPrompt(seed: string, level: EnergyLevel): string {
  return seededPick(seed, PROMPTS[level]);
}
export function pickStyleNote(seed: string, level: EnergyLevel): string {
  return seededPick(seed + "style", STYLE_NOTES[level]);
}

export function moonNote(phase: string): string {
  const notes: Record<string, string> = {
    "New Moon": "a doorway for intention-setting.",
    "First Quarter": "a push to act on what you planted.",
    "Full Moon": "culmination and release; what's ready to be seen.",
    "Last Quarter": "an invitation to let go and integrate.",
  };
  return notes[phase] ?? "a shift in the emotional tide.";
}
