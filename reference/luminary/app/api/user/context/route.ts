import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { handleError, ok, created } from "@/lib/api";
import type { LifeCategory } from "@prisma/client";

const CATEGORIES = [
  "CAREER", "RELATIONSHIPS", "FAMILY", "CREATIVE",
  "HEALTH", "SPIRITUAL", "FINANCES", "OTHER",
] as const;

const createSchema = z.object({
  category: z.enum(CATEGORIES),
  title: z.string().min(1),
  description: z.string().min(1),
});

const updateSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  category: z.enum(CATEGORIES).optional(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  try {
    const userId = await requireUserId();
    const entries = await prisma.userLifeContext.findMany({
      where: { userId },
      orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
    });
    return ok({ entries });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const input = createSchema.parse(await req.json());
    const entry = await prisma.userLifeContext.create({
      data: {
        userId,
        category: input.category as LifeCategory,
        title: input.title,
        description: input.description,
      },
    });
    return created({ entry });
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(req: Request) {
  try {
    const userId = await requireUserId();
    const input = updateSchema.parse(await req.json());
    const existing = await prisma.userLifeContext.findFirst({
      where: { id: input.id, userId },
    });
    if (!existing) return ok({ error: "Not found" }, { status: 404 });
    const entry = await prisma.userLifeContext.update({
      where: { id: input.id },
      data: {
        title: input.title ?? existing.title,
        description: input.description ?? existing.description,
        category: (input.category as LifeCategory) ?? existing.category,
        isActive: input.isActive ?? existing.isActive,
      },
    });
    return ok({ entry });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: Request) {
  try {
    const userId = await requireUserId();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return ok({ error: "Missing id" }, { status: 400 });
    await prisma.userLifeContext.deleteMany({ where: { id, userId } });
    return ok({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
