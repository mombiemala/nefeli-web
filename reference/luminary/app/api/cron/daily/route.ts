import { prisma } from "@/lib/prisma";
import { getOrCreateDailyGuidance } from "@/lib/guidance-generator";
import { handleError, ok } from "@/lib/api";

/**
 * Vercel Cron entrypoint — pre-generates the day's guidance for every
 * onboarded user so the dashboard is instant. Protected by CRON_SECRET.
 * Schedule in vercel.json (e.g. "0 5 * * *").
 */
export async function GET(req: Request) {
  try {
    const auth = req.headers.get("authorization");
    if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    const users = await prisma.user.findMany({
      where: { hasCompletedOnboarding: true },
      select: { id: true },
    });

    let generated = 0;
    for (const u of users) {
      try {
        await getOrCreateDailyGuidance(u.id, new Date());
        generated++;
      } catch {
        /* skip individual failures */
      }
    }

    return ok({ generated, total: users.length });
  } catch (err) {
    return handleError(err);
  }
}
