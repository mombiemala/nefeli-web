import { prisma } from "./prisma";
import { profileToSubject } from "./chart-utils";
import {
  getBirthChartContext, getTransitContext, getMoonPhase, getTransits,
  type BirthSubject,
} from "./astrologer-api";
import {
  summarizeDeclarations, summarizeInsights, summarizeLifeContext,
} from "./context-builder";
import { buildSystemPrompt, type LuminaryContext } from "./claude";
import { toISODate } from "./utils";
import type { MoonPhaseData, Transit } from "./types";

export interface AssembledContext {
  system: string;
  subject: BirthSubject;
  moon: MoonPhaseData;
  transits: Transit[];
  profileName: string;
}

/**
 * Gather everything Luminary needs for a user — natal context, live transits,
 * moon phase, life context, declarations and recent insights — and build the
 * full system prompt. Transit + moon data is cached per-day via DailyGuidance
 * where possible, but here we always fetch fresh context XML for the prompt.
 */
export async function assembleContext(
  userId: string,
  when: Date = new Date(),
): Promise<AssembledContext | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const profile = await prisma.birthProfile.findFirst({
    where: { userId, isDefault: true },
  }) ?? await prisma.birthProfile.findFirst({ where: { userId } });

  if (!profile) return null;

  const subject = profileToSubject(profile);

  const [chartXml, transitXml, moon, transits, lifeContexts, declarations, insights] =
    await Promise.all([
      profile.chartXml
        ? Promise.resolve(profile.chartXml)
        : getBirthChartContext(subject),
      getTransitContext(subject, when),
      getMoonPhase(when),
      getTransits(subject, when),
      prisma.userLifeContext.findMany({
        where: { userId, isActive: true },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.userDeclaration.findMany({
        where: { userId, isActive: true },
        orderBy: { declaredAt: "desc" },
      }),
      prisma.userInsight.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

  const ctx: LuminaryContext = {
    chartXml,
    transitXml,
    moonPhase: `${moon.phaseName} ${moon.emoji} in ${moon.moonSign} (${moon.illumination}% illuminated)`,
    lifeContextSummary: summarizeLifeContext(lifeContexts),
    declarations: summarizeDeclarations(declarations),
    recentInsights: summarizeInsights(insights),
    currentDate: toISODate(when),
    userLocation: user?.location ?? `${profile.birthCity}, ${profile.birthCountry}`,
    userName: user?.name ?? undefined,
  };

  return {
    system: buildSystemPrompt(ctx),
    subject,
    moon,
    transits,
    profileName: profile.name,
  };
}
