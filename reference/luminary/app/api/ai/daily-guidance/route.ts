import { requireUserId } from "@/lib/session";
import { handleError, ok } from "@/lib/api";
import { getOrCreateDailyGuidance } from "@/lib/guidance-generator";

/** Fetch (or generate + cache) today's guidance for the signed-in user. */
export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const url = new URL(req.url);
    const dateParam = url.searchParams.get("date");
    const when = dateParam ? new Date(dateParam) : new Date();
    const guidance = await getOrCreateDailyGuidance(userId, when);
    if (!guidance) return ok({ guidance: null, needsOnboarding: true });
    return ok({ guidance });
  } catch (err) {
    return handleError(err);
  }
}

/** Force regeneration (e.g. after a big life-context update). */
export async function POST() {
  try {
    const userId = await requireUserId();
    const guidance = await getOrCreateDailyGuidance(userId, new Date(), true);
    return ok({ guidance });
  } catch (err) {
    return handleError(err);
  }
}
