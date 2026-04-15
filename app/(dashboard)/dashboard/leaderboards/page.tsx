import Link from "next/link";

import { ActivityBadge } from "@/components/sessions/activity-badge";
import { AppButton, EmptyState, PageHeader, SectionCard, StatusBadge } from "@/components/ui/primitives";
import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { getGroups } from "@/lib/db/groups";

export default async function LeaderboardsIndexPage() {
  const user = await requireAuthenticatedUser();
  const groups = await getGroups(user);

  return (
    <section className="space-y-6">
      <PageHeader
        title="Leaderboards"
        description="Activity-scoped boards: OpenSkill for card rounds, Elo for squash and padel matches."
        actions={<AppButton href="/dashboard/leaderboards/global">Open global leaderboard</AppButton>}
      />

      <SectionCard
        title="Group leaderboards"
        description="Scope ratings to sessions linked with each group and activity for localized performance tracking."
        actions={<StatusBadge tone="accent">{groups.length} Groups</StatusBadge>}
      >
        {groups.length === 0 ? (
          <EmptyState
            title="No groups available"
            description="Create a group first to unlock per-group leaderboard views."
            action={<AppButton variant="secondary" href="/dashboard/groups/new">Create group</AppButton>}
          />
        ) : (
          <ul className="divide-y divide-[var(--border)] rounded-[var(--radius-md)] border border-[var(--border)]">
            {groups.map((group) => (
              <li key={group.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[var(--text-primary)]">{group.name}</span>
                  <ActivityBadge activityType={group.activityType} />
                </div>
                <Link className="app-button app-button-secondary" href={`/dashboard/leaderboards/groups/${group.id}?activity=${group.activityType}`}>
                  Open leaderboard
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </section>
  );
}
