import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Temporary diagnostic endpoint: verifies the runtime database connection
 * and that the `luminary` schema tables resolve. Returns the raw error
 * message (no secrets) so a misconfigured DATABASE_URL is easy to pinpoint.
 */
export async function GET() {
  const started = Date.now();
  const info: Record<string, unknown> = {
    demoMode: process.env.LUMINARY_DEMO_MODE ?? null,
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    // Surface only the non-secret shape of the URL (host + params), never the password.
    dbUrlShape: sanitizeDbUrl(process.env.DATABASE_URL),
    nextauthUrl: process.env.NEXTAUTH_URL ?? null,
    hasNextauthSecret: Boolean(process.env.NEXTAUTH_SECRET),
  };
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    const users = await prisma.user.count();
    return NextResponse.json({ ok: true, users, ms: Date.now() - started, ...info });
  } catch (e: unknown) {
    const err = e as { message?: string; code?: string };
    return NextResponse.json(
      { ok: false, error: err?.message ?? String(e), code: err?.code ?? null, ms: Date.now() - started, ...info },
      { status: 500 },
    );
  }
}

function sanitizeDbUrl(url?: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.username}:***@${u.host}${u.pathname}${u.search}`;
  } catch {
    return "unparseable";
  }
}
