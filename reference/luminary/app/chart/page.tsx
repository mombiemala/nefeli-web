import { redirect } from "next/navigation";
import { currentUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/app-shell";
import { ChartClient } from "./ChartClient";

export const dynamic = "force-dynamic";

export default async function ChartPage() {
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const count = await prisma.birthProfile.count({ where: { userId } });
  if (count === 0) redirect("/onboarding");

  return (
    <AppShell title="Your birth chart" subtitle="Tap any planet to see how it lives in you.">
      <ChartClient />
    </AppShell>
  );
}
