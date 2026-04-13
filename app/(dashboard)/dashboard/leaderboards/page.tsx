import Link from "next/link";

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
        description="OpenSkill ratings replayed from round history with derived round and match wins."
        actions={<AppButton href="/dashboard/leaderboards/global">Open global leaderboard</AppButton>}
      />

      <SectionCard
        title="Group leaderboards"
        description="Scope ratings to sessions linked with each group for localized performance tracking."
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
                <span className="font-medium text-[var(--text-primary)]">{group.name}</span>
                <Link className="app-button app-button-secondary" href={`/dashboard/leaderboards/groups/${group.id}`}>
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
