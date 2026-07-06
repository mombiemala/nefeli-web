import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { handleError, ok } from "@/lib/api";
import { assembleContext } from "@/lib/luminary-context";
import { completeLuminary } from "@/lib/claude";

/** Mark onboarding complete. */
export async function POST() {
  try {
    const userId = await requireUserId();
    await prisma.user.update({
      where: { id: userId },
      data: { hasCompletedOnboarding: true },
    });
    return ok({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}

/**
 * Generate the personalised 3-paragraph welcome reading that integrates the
 * user's brand-new chart with the life context they just shared.
 */
export async function GET() {
  try {
    const userId = await requireUserId();
    const ctx = await assembleContext(userId);
    if (!ctx) return ok({ welcome: null, needsOnboarding: true });

    const welcome = await completeLuminary(
      ctx.system,
      "This is our very first conversation. Write a warm, personal 3-paragraph welcome reading that weaves this person's big-three placements and standout aspects together with the specific life context and declarations they just shared. Make it feel like you already know them. No headers or lists — just the reading.",
      900,
    );

    return ok({ welcome, profileName: ctx.profileName });
  } catch (err) {
    return handleError(err);
  }
}
