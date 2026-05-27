import Link from "next/link";
import { notFound } from "next/navigation";

import { ArrowLeftIcon, PencilIcon, TrophyIcon } from "@/components/ui/icons";
import { AppButton, EmptyState, InfoRow, PageHeader, SectionCard, StatCard, StatusBadge } from "@/components/ui/primitives";
import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { canEditGroup } from "@/lib/domain/authorization";
import { getGroupById } from "@/lib/db/groups";

type GroupDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function GroupDetailPage({ params }: GroupDetailPageProps) {
  const user = await requireAuthenticatedUser();
  const { id } = await params;
  const group = await getGroupById(id, user);

  if (!group) {
    notFound();
  }

  const groupRecord = group as unknown as {
    id: string;
    name: string;
    description: string | null;
    ownerUserId: string;
    owner: { name: string };
    trustedAdmins: Array<{ id: string; userId: string; user: { name: string; email: string } }>;
    memberships: Array<{ id: string; playerId: string; player: { id: string; displayName: string; isActive: boolean } }>;
    _count: { gameSessions: number };
  };

  const canManageGroup = canEditGroup(user, {
    isOwner: groupRecord.ownerUserId === user.id,
    isTrustedAdmin: groupRecord.trustedAdmins.some((entry) => entry.userId === user.id),
    isMember: user.playerId ? groupRecord.memberships.some((membership) => membership.playerId === user.playerId) : false,
  });

  return (
    <section className="space-y-6">
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            <span>{groupRecord.name}</span>
          </span>
        }
        description={groupRecord.description ?? undefined}
        actions={
          <div className="flex flex-wrap gap-2">
            <AppButton variant="secondary" href="/dashboard/groups" className="app-icon-button" data-testid="group-back-link">
              <ArrowLeftIcon />
              <span className="sr-only">Back to groups</span>
            </AppButton>
            <AppButton variant="ghost" href={`/dashboard/leaderboards/groups/${groupRecord.id}`} className="app-icon-button">
              <TrophyIcon />
              <span className="sr-only">Group leaderboard</span>
            </AppButton>
            {canManageGroup ? (
              <AppButton href={`/dashboard/groups/${groupRecord.id}/edit`} className="app-icon-button">
                <PencilIcon />
                <span className="sr-only">Edit group</span>
              </AppButton>
            ) : null}
          </div>
        }
      />

      <div className="hidden md:grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Owner" value={groupRecord.owner.name} tone="accent" />
        <StatCard label="Members" value={groupRecord.memberships.length} />
        <StatCard label="Trusted admins" value={groupRecord.trustedAdmins.length} tone="warning" />
        <StatCard label="Sessions" value={groupRecord._count.gameSessions} />
      </div>

      <div className="grid gap-6 grid-cols-1 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title="Group summary">
          <dl className="divide-y divide-[var(--border)] rounded-[var(--radius-md)] border border-[var(--border)]">
            <InfoRow label="Owner" value={groupRecord.owner.name} />
            <InfoRow label="Members" value={groupRecord.memberships.length} />
            <InfoRow label="Sessions" value={groupRecord._count.gameSessions} />
          </dl>

          <div className="mt-5">
            <h3 className="app-section-title text-base">Description</h3>
            <p className="mt-3 app-card-muted px-4 py-3 text-sm text-[var(--text-secondary)]">
              {groupRecord.description ?? "No description"}
            </p>
          </div>
        </SectionCard>

        <div className="hidden md:block space-y-6">
          <SectionCard title="Trusted admins">
            {groupRecord.trustedAdmins.length === 0 ? (
              <EmptyState title="No trusted admins" description="Only the owner currently has elevated management rights." />
            ) : (
              <ul className="space-y-2">
                {groupRecord.trustedAdmins.map((trustedAdmin) => (
                  <li key={trustedAdmin.id} className="app-card-muted flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium text-[var(--text-primary)]">{trustedAdmin.user.name}</p>
                      <p className="text-xs text-[var(--text-muted)]">{trustedAdmin.user.email}</p>
                    </div>
                    <StatusBadge tone="warning">Trusted admin</StatusBadge>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>

      <SectionCard title="Members">
        {groupRecord.memberships.length === 0 ? (
          <EmptyState title="No members yet" description="Assign players to this group from the edit view." />
        ) : (
          <ul className="space-y-2">
            {groupRecord.memberships.map((membership) => (
              <li key={membership.id} className="app-card-muted flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <Link className="font-medium text-[var(--text-primary)] underline" href={`/dashboard/players/${membership.player.id}`}>
                  {membership.player.displayName}
                </Link>
                <StatusBadge tone={membership.player.isActive ? "success" : "warning"}>
                  {membership.player.isActive ? "Active" : "Inactive"}
                </StatusBadge>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </section>
  );
}
