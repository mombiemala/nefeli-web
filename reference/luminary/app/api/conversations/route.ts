import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { handleError, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

/** List the user's conversations (most recent first). */
export async function GET() {
  try {
    const userId = await requireUserId();
    const conversations = await prisma.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: {
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
        _count: { select: { messages: true } },
      },
    });
    return ok({ conversations });
  } catch (err) {
    return handleError(err);
  }
}
