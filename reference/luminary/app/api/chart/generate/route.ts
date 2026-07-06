import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { handleError, ok } from "@/lib/api";
import { profileToSubject } from "@/lib/chart-utils";
import { generateBirthChart, getBirthChartContext } from "@/lib/astrologer-api";
import { buildDemoChart } from "@/lib/demo-data";
import type { NatalChart } from "@/lib/types";

/**
 * Return the default profile's natal chart. Natal charts never change, so the
 * full response is cached in BirthProfile.chartData on first generation.
 */
export async function GET() {
  try {
    const userId = await requireUserId();
    const profile =
      (await prisma.birthProfile.findFirst({
        where: { userId, isDefault: true },
      })) ?? (await prisma.birthProfile.findFirst({ where: { userId } }));

    if (!profile) return ok({ chart: null });

    let chart = profile.chartData as unknown as NatalChart | null;

    if (!chart || !chart.planets) {
      const subject = profileToSubject(profile);
      const [{ chart: generated }, chartXml] = await Promise.all([
        generateBirthChart(subject),
        getBirthChartContext(subject),
      ]);
      chart = generated;
      await prisma.birthProfile.update({
        where: { id: profile.id },
        data: { chartData: generated as unknown as object, chartXml },
      });
    }

    // Ensure derived aspects exist even for older cached rows.
    if (!chart.aspects || chart.aspects.length === 0) {
      const rebuilt = buildDemoChart(
        `${profile.name}|${profile.birthDate.toISOString()}|${profile.latitude},${profile.longitude}`,
        profile.timeUnknown,
      );
      if (!chart.planets?.length) chart = rebuilt;
    }

    return ok({
      chart,
      profile: {
        id: profile.id,
        name: profile.name,
        birthCity: profile.birthCity,
        birthCountry: profile.birthCountry,
        timeUnknown: profile.timeUnknown,
      },
    });
  } catch (err) {
    return handleError(err);
  }
}

/** Force-regenerate the default chart (rarely needed). */
export async function POST() {
  try {
    const userId = await requireUserId();
    const profile = await prisma.birthProfile.findFirst({
      where: { userId, isDefault: true },
    });
    if (!profile) return ok({ chart: null });
    const subject = profileToSubject(profile);
    const [{ chart }, chartXml] = await Promise.all([
      generateBirthChart(subject),
      getBirthChartContext(subject),
    ]);
    await prisma.birthProfile.update({
      where: { id: profile.id },
      data: { chartData: chart as unknown as object, chartXml },
    });
    return ok({ chart });
  } catch (err) {
    return handleError(err);
  }
}
