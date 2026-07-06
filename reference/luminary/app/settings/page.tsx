import { redirect } from "next/navigation";
import { currentUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/app-shell";
import { Card, SectionTitle } from "@/components/ui/primitives";
import { isDemoMode } from "@/lib/utils";
import { SignOutButton } from "./SignOutButton";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const userId = await currentUserId();
  if (!userId) redirect("/login");

  const [user, profiles] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.birthProfile.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
  ]);

  return (
    <AppShell title="Settings" subtitle="Your account and your charts.">
      <div className="space-y-6">
        <Card>
          <SectionTitle>Account</SectionTitle>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-cream-dim">Name</dt><dd className="text-cream">{user?.name ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-cream-dim">Email</dt><dd className="text-cream">{user?.email}</dd></div>
            <div className="flex justify-between"><dt className="text-cream-dim">Location</dt><dd className="text-cream">{user?.location ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-cream-dim">Plan</dt><dd className="text-gold">{user?.plan}</dd></div>
          </dl>
        </Card>

        <Card>
          <SectionTitle>Birth profiles</SectionTitle>
          <ul className="space-y-2">
            {profiles.map((p) => (
              <li key={p.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm">
                <div>
                  <p className="text-cream">{p.name} {p.isDefault && <span className="chip ml-2">Default</span>}</p>
                  <p className="text-xs text-cream-dim">
                    {new Date(p.birthDate).toLocaleDateString()} · {p.birthCity}, {p.birthCountry}
                    {p.timeUnknown && " · time unknown"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-cream-dim">
            Chart comparison &amp; synastry (adding partners and family) arrives in Phase 2.
          </p>
        </Card>

        {isDemoMode() && (
          <Card>
            <SectionTitle>Demo mode</SectionTitle>
            <p className="text-sm text-cream-muted">
              Luminary is running in demo mode with locally-generated chart, transit and
              reading data. Add <code className="text-gold">ANTHROPIC_API_KEY</code>,{" "}
              <code className="text-gold">RAPIDAPI_KEY</code> and{" "}
              <code className="text-gold">OPENCAGE_API_KEY</code> to switch to live data.
            </p>
          </Card>
        )}

        <SignOutButton />
      </div>
    </AppShell>
  );
}
