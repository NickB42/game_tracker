import Link from "next/link";
import { notFound } from "next/navigation";
import type { ActivityType } from "@prisma/client";

import { LeaderboardTable } from "@/components/leaderboards/leaderboard-table";
import { PageHeader } from "@/components/ui/primitives";
import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { getGroupLeaderboard } from "@/lib/db/leaderboards";
import { getGroupById } from "@/lib/db/groups";

type GroupLeaderboardPageProps = {
  params: Promise<{
    groupId: string;
  }>;
  searchParams: Promise<{
    activity?: string;
  }>;
};

function parseActivity(value: string | undefined): ActivityType | undefined {
  if (value === "CARD" || value === "SQUASH" || value === "PADEL") {
    return value;
  }

  return undefined;
}

export default async function GroupLeaderboardPage({ params, searchParams }: GroupLeaderboardPageProps) {
  const user = await requireAuthenticatedUser();

  const [{ groupId }, { activity }] = await Promise.all([params, searchParams]);
  const selectedActivity = parseActivity(activity);

  const group = await getGroupById(groupId, user);

  if (!group) {
    notFound();
  }

  const leaderboard = await getGroupLeaderboard(group.id, user, {
    activityType: selectedActivity,
  });

  if (!leaderboard) {
    notFound();
  }

  const activityType = leaderboard.activityType;

  return (
    <section className="space-y-6">
      <PageHeader
        title={`Group leaderboard: ${group.name}`}
        description={`Scoped to ${activityType.toLowerCase()} sessions historically linked to this group.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link className="app-button app-button-secondary" href="/dashboard/leaderboards">
              Back to leaderboards
            </Link>
            <Link className="app-button app-button-ghost" href={`/dashboard/groups/${group.id}`}>
              Open group
            </Link>
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        {[
          { value: "CARD", label: "Card" },
          { value: "SQUASH", label: "Squash" },
          { value: "PADEL", label: "Padel" },
        ].map((entry) => (
          <Link
            key={entry.value}
            href={`/dashboard/leaderboards/groups/${group.id}?activity=${entry.value}`}
            className={`app-button ${activityType === entry.value ? "app-button-primary" : "app-button-ghost"}`}
          >
            {entry.label}
          </Link>
        ))}
      </div>

      <LeaderboardTable rows={leaderboard.rows} activityType={leaderboard.activityType} />
    </section>
  );
}
