import Link from "next/link";
import { notFound } from "next/navigation";

import { AppButton, Divider, EmptyState, InfoRow, PageHeader, SectionCard, StatCard, StatusBadge } from "@/components/ui/primitives";
import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { getPlayerById } from "@/lib/db/players";

type PlayerDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PlayerDetailPage({ params }: PlayerDetailPageProps) {
  const user = await requireAuthenticatedUser();
  const { id } = await params;

  const player = await getPlayerById(id);

  if (!player) {
    notFound();
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title={player.displayName}
        description="Player details and current group memberships."
        data-testid="player-detail-heading"
        actions={
          <div className="flex flex-wrap gap-2">
            <AppButton variant="secondary" href="/dashboard/players">
              Back to players
            </AppButton>
            {user.role === "ADMIN" ? <AppButton href={`/dashboard/players/${player.id}/edit`}>Edit player</AppButton> : null}
          </div>
        }
      />

      <div className="grid gap-3 md:grid-cols-3">
        <StatCard label="Status" value={player.isActive ? "Active" : "Inactive"} tone={player.isActive ? "success" : "warning"} />
        <StatCard label="Groups" value={player.groupMemberships.length} tone="accent" />
        <StatCard label="Session participations" value={player._count.sessionParticipants} />
      </div>

      <SectionCard title="Player profile">
        <dl className="rounded-[var(--radius-md)] border border-[var(--border)]">
          <InfoRow
            label="Active"
            value={<StatusBadge tone={player.isActive ? "success" : "warning"}>{player.isActive ? "Yes" : "No"}</StatusBadge>}
          />
          <Divider />
          <InfoRow label="Display name" value={player.displayName} />
        </dl>
      </SectionCard>

      <SectionCard title="Notes">
        {player.notes ? <p className="text-sm text-[var(--text-secondary)]">{player.notes}</p> : <EmptyState title="No notes yet" description="Add context such as aliases or seating preferences from the edit view." />}
      </SectionCard>

      <SectionCard title="Groups" description="Current memberships for this player.">
        {player.groupMemberships.length === 0 ? (
          <EmptyState title="No memberships" description="This player is not assigned to any group yet." />
        ) : (
          <ul className="space-y-2">
            {player.groupMemberships.map((membership) => (
              <li key={membership.id} className="flex items-center justify-between rounded-[var(--radius-sm)] border border-[var(--border)] px-3 py-2">
                <span className="text-sm font-medium text-[var(--text-primary)]">{membership.group.name}</span>
                <Link className="app-button app-button-ghost" href={`/dashboard/groups/${membership.group.id}`}>
                  Open group
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </section>
  );
}
