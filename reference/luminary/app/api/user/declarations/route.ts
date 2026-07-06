import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { handleError, ok, created } from "@/lib/api";

const createSchema = z.object({
  declaration: z.string().min(1),
  contextNote: z.string().optional(),
});

const updateSchema = z.object({
  id: z.string(),
  isActive: z.boolean().optional(),
  declaration: z.string().optional(),
  contextNote: z.string().optional(),
});

export async function GET() {
  try {
    const userId = await requireUserId();
    const declarations = await prisma.userDeclaration.findMany({
      where: { userId },
      orderBy: [{ isActive: "desc" }, { declaredAt: "desc" }],
    });
    return ok({ declarations });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const input = createSchema.parse(await req.json());
    const declaration = await prisma.userDeclaration.create({
      data: {
        userId,
        declaration: input.declaration,
        contextNote: input.contextNote,
      },
    });
    return created({ declaration });
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(req: Request) {
  try {
    const userId = await requireUserId();
    const input = updateSchema.parse(await req.json());
    const existing = await prisma.userDeclaration.findFirst({
      where: { id: input.id, userId },
    });
    if (!existing) return ok({ error: "Not found" }, { status: 404 });
    const declaration = await prisma.userDeclaration.update({
      where: { id: input.id },
      data: {
        isActive: input.isActive ?? existing.isActive,
        declaration: input.declaration ?? existing.declaration,
        contextNote: input.contextNote ?? existing.contextNote,
      },
    });
    return ok({ declaration });
  } catch (err) {
    return handleError(err);
  }
}
