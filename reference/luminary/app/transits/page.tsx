import { redirect } from "next/navigation";
import { currentUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/app-shell";
import { TransitsClient } from "./TransitsClient";

export const dynamic = "force-dynamic";

export default async function TransitsPage() {
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const count = await prisma.birthProfile.count({ where: { userId } });
  if (count === 0) redirect("/onboarding");

  return (
    <AppShell title="Transit tracker" subtitle="The sky in motion against your natal chart.">
      <TransitsClient />
    </AppShell>
  );
}
