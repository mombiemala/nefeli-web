// Supabase-agnostic context assembler — the drop-in replacement for
// Luminary's Prisma-coupled luminary-context.ts.
//
// YOU fetch the rows from Supabase (birth profile + life contexts +
// declarations + insights + optional style profile) and pass them in;
// this fetches chart/transit/moon from the Astrologer API and returns the
// fully-assembled Claude system prompt.

import { profileToSubject, type BirthProfileInput } from "./chart-utils";
import {
  getBirthChartContext, getTransitContext, getMoonPhase, getTransits,
  type BirthSubject,
} from "./astrologer-api";
import {
  summarizeDeclarations, summarizeInsights, summarizeLifeContext,
  type DeclarationRow, type InsightRow, type LifeContextRow,
} from "./summarize";
import { buildSystemPrompt } from "./prompt";
import { toISODate } from "./utils";
import type { MoonPhaseData, Transit } from "./types";

export interface AssembleInput {
  profile: BirthProfileInput;
  /** Pre-cached AI-context XML for the natal chart, if you stored it. */
  cachedChartXml?: string | null;
  lifeContexts: LifeContextRow[];
  declarations: DeclarationRow[];
  insights: InsightRow[];
  styleProfile?: string;
  userName?: string;
  userLocation?: string;
  when?: Date;
}

export interface AssembledContext {
  system: string;
  subject: BirthSubject;
  moon: MoonPhaseData;
  transits: Transit[];
}

export async function assembleContext(input: AssembleInput): Promise<AssembledContext> {
  const when = input.when ?? new Date();
  const subject = profileToSubject(input.profile);

  const [chartXml, transitXml, moon, transits] = await Promise.all([
    input.cachedChartXml
      ? Promise.resolve(input.cachedChartXml)
      : getBirthChartContext(subject),
    getTransitContext(subject, when),
    getMoonPhase(when),
    getTransits(subject, when),
  ]);

  const system = buildSystemPrompt({
    chartXml,
    transitXml,
    moonPhase: `${moon.phaseName} ${moon.emoji} in ${moon.moonSign} (${moon.illumination}% illuminated)`,
    lifeContextSummary: summarizeLifeContext(input.lifeContexts),
    declarations: summarizeDeclarations(input.declarations),
    recentInsights: summarizeInsights(input.insights),
    currentDate: toISODate(when),
    userLocation: input.userLocation ?? `${input.profile.birthCity}, ${input.profile.birthCountry}`,
    userName: input.userName,
    styleProfile: input.styleProfile,
  });

  return { system, subject, moon, transits };
}
