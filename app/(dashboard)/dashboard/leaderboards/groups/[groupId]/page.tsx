import Link from "next/link";
import { notFound } from "next/navigation";
import type { ActivityType } from "@prisma/client";

import { RatingHistoryChart } from "@/components/leaderboards/rating-history-chart";
import { LeaderboardTable } from "@/components/leaderboards/leaderboard-table";
import { ArrowLeftIcon } from "@/components/ui/icons";
import { AppButton, PageHeader, SectionCard } from "@/components/ui/primitives";
import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { getGroupLeaderboard } from "@/lib/db/leaderboards";
import { getGroupById } from "@/lib/db/groups";

type GroupLeaderboardPageProps = {
  params: Promise<{
    groupId: string;
  }>;
  searchParams: Promise<{
    activity?: string;
    view?: string;
  }>;
};

function parseActivity(value: string | undefined): ActivityType | undefined {
  if (value === "CARD" || value === "SQUASH" || value === "PADEL") {
    return value;
  }

  return undefined;
}

function parseView(value: string | undefined) {
  return value === "history" ? "history" : "standings";
}

export default async function GroupLeaderboardPage({ params, searchParams }: GroupLeaderboardPageProps) {
  const user = await requireAuthenticatedUser();

  const [{ groupId }, { activity, view: viewParam }] = await Promise.all([params, searchParams]);
  const selectedActivity = parseActivity(activity);
  const view = parseView(viewParam);

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
            href={`/dashboard/leaderboards/groups/${group.id}?activity=${entry.value}&view=${view}`}
            className={`app-button ${activityType === entry.value ? "app-button-primary" : "app-button-ghost"}`}
          >
            {entry.label}
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap gap-2" aria-label="Leaderboard view">
        <Link
          href={`/dashboard/leaderboards/groups/${group.id}?activity=${activityType}&view=standings`}
          className={`app-button ${view === "standings" ? "app-button-secondary" : "app-button-ghost"}`}
        >
          Standings
        </Link>
        <Link
          href={`/dashboard/leaderboards/groups/${group.id}?activity=${activityType}&view=history`}
          className={`app-button ${view === "history" ? "app-button-secondary" : "app-button-ghost"}`}
        >
          Rating history
        </Link>
      </div>

      {view === "history" ? (
        <SectionCard title={`${group.name} rating history`}>
          <RatingHistoryChart
            key={`group-${group.id}-${activityType}`}
            series={leaderboard.history}
            activityType={leaderboard.activityType}
          />
        </SectionCard>
      ) : (
        <LeaderboardTable rows={leaderboard.rows} activityType={leaderboard.activityType} scopeLabel={`Group ${group.name}`} />
      )}
    </section>
  );
}
