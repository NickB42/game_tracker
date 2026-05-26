import Link from "next/link";
import { notFound } from "next/navigation";
import type { ActivityType } from "@prisma/client";

import { LeaderboardTable } from "@/components/leaderboards/leaderboard-table";
import { ArrowLeftIcon } from "@/components/ui/icons";
import { AppButton, PageHeader } from "@/components/ui/primitives";
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

  const [group, leaderboard] = await Promise.all([
    getGroupById(groupId, user),
    getGroupLeaderboard(groupId, user, { activityType: selectedActivity }),
  ]);

  if (!group) {
    notFound();
  }

  if (!leaderboard) {
    notFound();
  }

  const activityType = leaderboard.activityType;

  return (
    <section className="space-y-6">
      <PageHeader
        title={group.name}
        actions={
          <div className="flex flex-wrap gap-2">
            <AppButton href="/dashboard/leaderboards" variant="secondary" className="app-icon-button">
              <ArrowLeftIcon />
              <span className="sr-only">Back to leaderboards</span>
            </AppButton>
            <AppButton href={`/dashboard/groups/${group.id}`} variant="ghost">
              Open group
            </AppButton>
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

      <LeaderboardTable rows={leaderboard.rows} activityType={leaderboard.activityType} scopeLabel={`Group ${group.name}`} />
    </section>
  );
}
