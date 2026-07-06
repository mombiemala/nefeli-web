import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { handleError, ok, created } from "@/lib/api";
import type { InsightType } from "@prisma/client";

const TYPES = ["PATTERN", "WOUND", "STRENGTH", "THEME", "TRANSIT_THEME"] as const;

const createSchema = z.object({
  insightType: z.enum(TYPES).default("THEME"),
  title: z.string().min(1),
  content: z.string().min(1),
  sourceConversationId: z.string().optional(),
});

export async function GET() {
  try {
    const userId = await requireUserId();
    const insights = await prisma.userInsight.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return ok({ insights });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const input = createSchema.parse(await req.json());
    const insight = await prisma.userInsight.create({
      data: {
        userId,
        insightType: input.insightType as InsightType,
        title: input.title,
        content: input.content,
        sourceConversationId: input.sourceConversationId,
      },
    });
    return created({ insight });
  } catch (err) {
    return handleError(err);
  }
}
