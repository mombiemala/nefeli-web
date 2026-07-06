import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { handleError, ok, created } from "@/lib/api";
import { geocodeBirthPlace } from "@/lib/geocoding";
import {
  generateBirthChart, getBirthChartContext, type BirthSubject,
} from "@/lib/astrologer-api";
import { profileToSubject } from "@/lib/chart-utils";

const bodySchema = z.object({
  name: z.string().min(1),
  birthDate: z.string().min(1), // YYYY-MM-DD
  birthTime: z.string().optional(),
  timeUnknown: z.boolean().default(false),
  birthCity: z.string().min(1),
  birthCountry: z.string().optional().default(""),
  location: z.string().optional(),
});

export async function GET() {
  try {
    const userId = await requireUserId();
    const profiles = await prisma.birthProfile.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });
    return ok({ profiles });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const input = bodySchema.parse(await req.json());

    const geo = await geocodeBirthPlace(input.birthCity, input.birthCountry);

    // Persist the base profile first so we have an id / can convert to subject.
    const isFirst = (await prisma.birthProfile.count({ where: { userId } })) === 0;
    const profile = await prisma.birthProfile.create({
      data: {
        userId,
        name: input.name,
        birthDate: new Date(input.birthDate + "T00:00:00.000Z"),
        birthTime: input.timeUnknown ? null : input.birthTime ?? null,
        timeUnknown: input.timeUnknown,
        birthCity: geo.city || input.birthCity,
        birthCountry: geo.country || input.birthCountry,
        latitude: geo.latitude,
        longitude: geo.longitude,
        timezone: geo.timezone,
        isDefault: isFirst,
      },
    });

    // Generate + cache the natal chart and AI context XML.
    const subject: BirthSubject = profileToSubject(profile);
    const [{ chart, svg }, chartXml] = await Promise.all([
      generateBirthChart(subject),
      getBirthChartContext(subject),
    ]);

    const updated = await prisma.birthProfile.update({
      where: { id: profile.id },
      data: {
        chartData: chart as unknown as object,
        chartXml,
        chartSvgUrl: svg ? null : null, // SVG rendered client-side; blob upload optional
      },
    });

    if (input.location) {
      await prisma.user.update({
        where: { id: userId },
        data: { location: input.location, timezone: geo.timezone },
      });
    }

    return created({ profile: updated, chart });
  } catch (err) {
    return handleError(err);
  }
}
