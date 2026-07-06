import { redirect } from "next/navigation";
import { currentUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/app-shell";
import { MonthlyClient } from "./MonthlyClient";

export const dynamic = "force-dynamic";

export default async function MonthlyPage() {
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const count = await prisma.birthProfile.count({ where: { userId } });
  if (count === 0) redirect("/onboarding");

  return (
    <AppShell title="Monthly guide" subtitle="The month ahead, read through your life.">
      <MonthlyClient />
    </AppShell>
  );
}
