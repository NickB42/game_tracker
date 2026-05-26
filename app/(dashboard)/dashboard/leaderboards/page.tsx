import Link from "next/link";
import type { ActivityType } from "@prisma/client";

import { formatActivityType } from "@/components/sessions/activity-badge";
import { TrophyIcon } from "@/components/ui/icons";
import { EmptyState, PageHeader, SectionCard } from "@/components/ui/primitives";
import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { getGroups } from "@/lib/db/groups";

const ACTIVITY_TYPES: ActivityType[] = ["CARD", "SQUASH", "PADEL"];

export default async function LeaderboardsIndexPage() {
  const user = await requireAuthenticatedUser();
  const groups = await getGroups(user);
  const groupsByActivity = ACTIVITY_TYPES.map((activityType) => ({
    activityType,
    groups: groups.filter((group) => group.activityType === activityType),
  }));

  return (
    <section className="space-y-6">

      <Link
        href="/dashboard/leaderboards/global"
        className="app-card flex items-center justify-between gap-4 p-6 hover:border-[color:color-mix(in_srgb,var(--accent)_40%,var(--border))] hover:bg-[var(--surface-muted)]"
      >
        <span className="app-section-title">Global leaderboard</span>
        <span className="app-button app-button-secondary app-icon-button" aria-hidden="true">
          <TrophyIcon />
        </span>
      </Link>

      <SectionCard
        title="Group leaderboards"
      >
        {groups.length === 0 ? (
          <EmptyState
            title="No groups available"
            description="Create a group first to unlock per-group leaderboard views."
          />
        ) : (
          <div className="space-y-5">
            {groupsByActivity.map(({ activityType, groups: activityGroups }) =>
              activityGroups.length > 0 ? (
                <section key={activityType} className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">{formatActivityType(activityType)}</h3>
                    <span className="text-xs font-medium text-[var(--text-muted)]">{activityGroups.length} groups</span>
                  </div>
                  <ul className="divide-y divide-[var(--border)] rounded-[var(--radius-md)] border border-[var(--border)]">
                    {activityGroups.map((group) => (
                      <li key={group.id}>
                        <Link
                          className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-[var(--surface-muted)]"
                          href={`/dashboard/leaderboards/groups/${group.id}?activity=${group.activityType}`}
                        >
                          <span className="font-medium text-[var(--text-primary)]">{group.name}</span>
                          <span aria-hidden="true" className="text-[var(--text-muted)]">
                            &rarr;
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null,
            )}
          </div>
        )}
      </SectionCard>
    </section>
  );
}
