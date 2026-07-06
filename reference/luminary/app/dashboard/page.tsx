import { redirect } from "next/navigation";
import { currentUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardClient } from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const userId = await currentUserId();
  if (!userId) redirect("/login");

  const [user, profileCount] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.birthProfile.count({ where: { userId } }),
  ]);

  if (!user?.hasCompletedOnboarding || profileCount === 0) {
    redirect("/onboarding");
  }

  const firstName = user.name?.split(" ")[0] ?? "traveler";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <AppShell title={`${greeting}, ${firstName}`} subtitle="Here's what the sky is asking of you today.">
      <DashboardClient />
    </AppShell>
  );
}
