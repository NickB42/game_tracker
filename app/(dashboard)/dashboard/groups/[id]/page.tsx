import Link from "next/link";
import { notFound } from "next/navigation";

import { AppButton, Divider, EmptyState, InfoRow, PageHeader, SectionCard, StatCard, StatusBadge } from "@/components/ui/primitives";
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
        title={groupRecord.name}
        description="Group details, trusted admins, and current player memberships."
        actions={
          <div className="flex flex-wrap gap-2">
            <AppButton variant="secondary" href="/dashboard/groups">
              Back to groups
            </AppButton>
            <AppButton variant="ghost" href={`/dashboard/leaderboards/groups/${groupRecord.id}`}>
              Group leaderboard
            </AppButton>
            {canManageGroup ? <AppButton href={`/dashboard/groups/${groupRecord.id}/edit`}>Edit group</AppButton> : null}
          </div>
        }
      />

      <div className="grid gap-3 md:grid-cols-4">
        <StatCard label="Owner" value={groupRecord.owner.name} tone="accent" />
        <StatCard label="Members" value={groupRecord.memberships.length} />
        <StatCard label="Trusted admins" value={groupRecord.trustedAdmins.length} tone="warning" />
        <StatCard label="Sessions" value={groupRecord._count.gameSessions} />
      </div>

      <SectionCard title="Group summary">
        <dl className="rounded-[var(--radius-md)] border border-[var(--border)]">
          <InfoRow label="Owner" value={groupRecord.owner.name} />
          <Divider />
          <InfoRow label="Description" value={groupRecord.description ?? "No description"} />
        </dl>
      </SectionCard>

      <SectionCard title="Trusted admins" description="Users who can manage this group and linked sessions.">
        {groupRecord.trustedAdmins.length === 0 ? (
          <EmptyState title="No trusted admins" description="Only the owner currently has elevated management rights." />
        ) : (
          <ul className="space-y-2">
            {groupRecord.trustedAdmins.map((trustedAdmin) => (
              <li key={trustedAdmin.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{trustedAdmin.user.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">{trustedAdmin.user.email}</p>
                </div>
                <StatusBadge tone="warning">Trusted admin</StatusBadge>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Members">
        {groupRecord.memberships.length === 0 ? (
          <EmptyState title="No members yet" description="Assign players to this group from the edit view." />
        ) : (
          <ul className="space-y-2">
            {groupRecord.memberships.map((membership) => (
              <li key={membership.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] px-3 py-2">
                <Link className="app-button app-button-ghost" href={`/dashboard/players/${membership.player.id}`}>
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
