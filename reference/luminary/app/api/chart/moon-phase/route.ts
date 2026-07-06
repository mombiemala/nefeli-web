import { handleError, ok } from "@/lib/api";
import { getMoonPhase } from "@/lib/astrologer-api";

/** Current moon phase (public — no personalisation needed). */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const dateParam = url.searchParams.get("date");
    const when = dateParam ? new Date(dateParam) : new Date();
    const moon = await getMoonPhase(when);
    return ok({ moon, date: when.toISOString().slice(0, 10) });
  } catch (err) {
    return handleError(err);
  }
}
