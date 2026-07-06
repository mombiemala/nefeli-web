import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { prisma } from "./prisma";

/** Return the current user's id, or null if not signed in. */
export async function currentUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  const id = (session?.user as { id?: string } | undefined)?.id;
  return id ?? null;
}

/** Return the full current user record, or null. */
export async function currentUser() {
  const id = await currentUserId();
  if (!id) return null;
  return prisma.user.findUnique({ where: { id } });
}

/** Require a user id in an API route; throws a 401-style error otherwise. */
export async function requireUserId(): Promise<string> {
  const id = await currentUserId();
  if (!id) throw new UnauthorizedError();
  return id;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}
