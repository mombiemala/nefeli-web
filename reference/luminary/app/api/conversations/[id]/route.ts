import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { handleError, ok } from "@/lib/api";

/** Fetch a single conversation with its full message history. */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const userId = await requireUserId();
    const conversation = await prisma.conversation.findFirst({
      where: { id: params.id, userId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    if (!conversation) return ok({ error: "Not found" }, { status: 404 });
    return ok({ conversation });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const userId = await requireUserId();
    await prisma.conversation.deleteMany({ where: { id: params.id, userId } });
    return ok({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
