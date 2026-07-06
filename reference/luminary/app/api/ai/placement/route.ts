import { z } from "zod";
import { requireUserId } from "@/lib/session";
import { handleError, ok } from "@/lib/api";
import { assembleContext } from "@/lib/luminary-context";
import { completeLuminary } from "@/lib/claude";

const schema = z.object({
  planet: z.string().min(1),
  sign: z.string().min(1),
  house: z.number(),
});

/** Claude-generated insight connecting a placement to the user's life context. */
export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const { planet, sign, house } = schema.parse(await req.json());
    const ctx = await assembleContext(userId);
    if (!ctx) return ok({ insight: null, needsOnboarding: true });

    const insight = await completeLuminary(
      ctx.system,
      `In 2 short paragraphs, interpret this person's ${planet} in ${sign} in the ${house}th house. First paragraph: what this placement means at its core. Second paragraph: how it specifically shows up in the life context and healing work they've shared with me. Be warm and concrete. No headers or lists.`,
      500,
    );
    return ok({ insight });
  } catch (err) {
    return handleError(err);
  }
}
