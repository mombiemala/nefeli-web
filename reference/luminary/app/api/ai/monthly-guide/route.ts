import { requireUserId } from "@/lib/session";
import { handleError, ok } from "@/lib/api";
import { getOrCreateMonthlyGuide } from "@/lib/monthly-generator";

/** Fetch (or generate + cache) the monthly guide. */
export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const url = new URL(req.url);
    const now = new Date();
    const month = Number(url.searchParams.get("month") ?? now.getUTCMonth() + 1);
    const year = Number(url.searchParams.get("year") ?? now.getUTCFullYear());
    const guide = await getOrCreateMonthlyGuide(userId, month, year);
    if (!guide) return ok({ guide: null, needsOnboarding: true });
    return ok({ guide });
  } catch (err) {
    return handleError(err);
  }
}

/** Regenerate the guide (e.g. after a significant life-context change). */
export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const { month, year } = await req.json();
    const now = new Date();
    const guide = await getOrCreateMonthlyGuide(
      userId,
      month ?? now.getUTCMonth() + 1,
      year ?? now.getUTCFullYear(),
      true,
    );
    return ok({ guide });
  } catch (err) {
    return handleError(err);
  }
}
