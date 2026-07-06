import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { handleError, ok } from "@/lib/api";
import { profileToSubject } from "@/lib/chart-utils";
import { getTransits } from "@/lib/astrologer-api";

/** Live transits to the user's natal chart for a given day (default: today). */
export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const url = new URL(req.url);
    const dateParam = url.searchParams.get("date");
    const when = dateParam ? new Date(dateParam) : new Date();

    const profile =
      (await prisma.birthProfile.findFirst({
        where: { userId, isDefault: true },
      })) ?? (await prisma.birthProfile.findFirst({ where: { userId } }));
    if (!profile) return ok({ transits: [] });

    const transits = await getTransits(profileToSubject(profile), when);
    return ok({ transits, date: when.toISOString().slice(0, 10) });
  } catch (err) {
    return handleError(err);
  }
}
