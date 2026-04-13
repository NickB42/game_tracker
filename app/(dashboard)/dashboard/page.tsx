import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { AppCard, AppButton, PageHeader, SectionCard, StatCard, StatusBadge } from "@/components/ui/primitives";
import { auth } from "@/lib/auth/auth";
import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";

export default async function DashboardPage() {
  await requireAuthenticatedUser();

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      role: true,
      playerId: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <section className="space-y-6" data-testid="dashboard-auth-shell">
      <PageHeader title="Dashboard" />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Role" value={user.role} tone="accent" />
        <StatCard label="Linked Player" value={user.playerId ? "Connected" : "Not linked"} tone={user.playerId ? "success" : "warning"} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard
          title="Quick Actions"
          description="Jump directly to the core modules."
          actions={<AppButton href="/dashboard/online-play">Open Online Play</AppButton>}
        >
          <div className="grid gap-2 sm:grid-cols-2">
            <AppButton href="/dashboard/players" variant="secondary" className="justify-start">
              Players
            </AppButton>
            <AppButton href="/dashboard/groups" variant="secondary" className="justify-start">
              Groups
            </AppButton>
            <AppButton href="/dashboard/sessions" variant="secondary" className="justify-start">
              Sessions
            </AppButton>
            <AppButton href="/dashboard/leaderboards" variant="secondary" className="justify-start">
              Leaderboards
            </AppButton>
            <AppButton href="/dashboard/settings" variant="ghost" className="justify-start">
              Settings
            </AppButton>
            {user.role === "ADMIN" ? (
              <AppButton href="/dashboard/admin/users" variant="ghost" className="justify-start">
                User Management
              </AppButton>
            ) : null}
          </div>
        </SectionCard>

        <AppCard>
          <h2 className="app-section-title">Profile Snapshot</h2>
          <dl className="mt-4 space-y-3 text-sm text-[var(--text-secondary)]">
            <div className="app-card-muted flex items-center justify-between px-3 py-2">
              <dt className="text-[var(--text-muted)]">Name</dt>
              <dd>{user.name}</dd>
            </div>
            <div className="app-card-muted flex items-center justify-between px-3 py-2">
              <dt className="text-[var(--text-muted)]">Role</dt>
              <dd>
                <StatusBadge tone={user.role === "ADMIN" ? "accent" : "neutral"}>{user.role}</StatusBadge>
              </dd>
            </div>
            <div className="app-card-muted flex items-center justify-between px-3 py-2">
              <dt className="text-[var(--text-muted)]">Linked player</dt>
              <dd>{user.playerId ? "Yes" : "No"}</dd>
            </div>
          </dl>

          <p className="mt-5 text-sm text-[var(--text-muted)]">
            Want to change credentials or review account security?
          </p>
          <Link href="/dashboard/settings" className="app-button app-button-ghost mt-2 px-0">
            Open settings
          </Link>
        </AppCard>
      </div>
    </section>
  );
}
