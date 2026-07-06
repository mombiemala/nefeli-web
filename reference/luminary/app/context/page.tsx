import { redirect } from "next/navigation";
import { currentUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/app-shell";
import { ContextClient } from "./ContextClient";

export const dynamic = "force-dynamic";

export default async function ContextPage() {
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const count = await prisma.birthProfile.count({ where: { userId } });
  if (count === 0) redirect("/onboarding");

  return (
    <AppShell title="Your life context" subtitle="What Luminary knows about your story.">
      <ContextClient />
    </AppShell>
  );
}
